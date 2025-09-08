import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateEvaluation, extractSubjectsFromPDF } from "./openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Setup multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }
    next();
  };

  const requireTeacher = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user.role !== "teacher") {
      return res.status(403).json({ message: "교사 권한이 필요합니다." });
    }
    next();
  };

  // Student management routes
  app.get("/api/students", requireTeacher, async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "학생 목록 조회 실패" });
    }
  });

  app.post("/api/students", requireTeacher, async (req, res) => {
    try {
      const { name, studentNumber, classRoom = "5학년 7반" } = req.body;
      
      if (!name || !studentNumber) {
        return res.status(400).json({ message: "이름과 학번은 필수입니다." });
      }

      const student = await storage.createStudent({
        name,
        studentNumber,
        classRoom,
      });

      res.status(201).json(student);
    } catch (error) {
      res.status(500).json({ message: "학생 생성 실패" });
    }
  });

  app.put("/api/students/:id", requireTeacher, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const student = await storage.updateStudent(id, updateData);
      if (!student) {
        return res.status(404).json({ message: "학생을 찾을 수 없습니다." });
      }

      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "학생 정보 수정 실패" });
    }
  });

  app.delete("/api/students/:id", requireTeacher, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStudent(id);
      res.json({ message: "학생이 삭제되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "학생 삭제 실패" });
    }
  });

  // Bulk student creation endpoint
  app.post("/api/students/bulk", requireTeacher, async (req, res) => {
    try {
      const { students } = req.body;
      
      if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ message: "학생 목록이 필요합니다." });
      }

      // Hash passwords for all students
      const studentsWithHashedPasswords = await Promise.all(
        students.map(async (student: any) => ({
          ...student,
          password: await hashPassword(student.password),
        }))
      );

      const createdUsers = await storage.createBulkStudents(studentsWithHashedPasswords);
      res.status(201).json(createdUsers);
    } catch (error) {
      console.error("일괄 학생 생성 오류:", error);
      res.status(500).json({ message: "일괄 학생 생성 실패" });
    }
  });

  // Reset student password endpoint
  app.post("/api/students/:id/reset-password", requireTeacher, async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ message: "새 비밀번호가 필요합니다." });
      }

      // Find student and their user account
      const student = await storage.getStudent(id);
      if (!student || !student.userId) {
        return res.status(404).json({ message: "학생을 찾을 수 없습니다." });
      }

      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUserPassword(student.userId, hashedPassword);

      if (!updatedUser) {
        return res.status(404).json({ message: "사용자 계정을 찾을 수 없습니다." });
      }

      res.json({ message: "비밀번호가 성공적으로 초기화되었습니다." });
    } catch (error) {
      console.error("비밀번호 초기화 오류:", error);
      res.status(500).json({ message: "비밀번호 초기화 실패" });
    }
  });

  // Weekly materials routes
  app.get("/api/weekly-materials", requireAuth, async (req, res) => {
    try {
      const materials = await storage.getAllWeeklyMaterials();
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "주간학습 자료 조회 실패" });
    }
  });

  app.post("/api/weekly-materials", requireTeacher, upload.single('file'), async (req, res) => {
    try {
      const { title, week, startDate, endDate } = req.body;
      const file = req.file;

      if (!title || !week || !startDate || !endDate) {
        return res.status(400).json({ message: "모든 필드를 입력해주세요." });
      }

      let filePath = null;
      let content = "";
      let subjects: string[] = [];

      if (file) {
        filePath = file.path;
        
        // For PDF files, you would typically use a PDF parsing library here
        // For now, we'll use placeholder content extraction
        if (file.mimetype === "application/pdf") {
          // TODO: Implement PDF parsing with pdf-parse library
          content = "PDF 내용이 여기에 추출됩니다.";
          subjects = await extractSubjectsFromPDF(content);
        }
      }

      const material = await storage.createWeeklyMaterial({
        title,
        week: parseInt(week),
        startDate,
        endDate,
        filePath,
        content,
        subjects,
        uploadedBy: req.user!.id,
      });

      res.status(201).json(material);
    } catch (error) {
      console.error("주간학습 자료 업로드 오류:", error);
      res.status(500).json({ message: "주간학습 자료 업로드 실패" });
    }
  });

  app.delete("/api/weekly-materials/:id", requireTeacher, async (req, res) => {
    try {
      const { id } = req.params;
      const material = await storage.getWeeklyMaterial(id);
      
      if (!material) {
        return res.status(404).json({ message: "자료를 찾을 수 없습니다." });
      }

      // Delete file if exists
      if (material.filePath && fs.existsSync(material.filePath)) {
        fs.unlinkSync(material.filePath);
      }

      await storage.deleteWeeklyMaterial(id);
      res.json({ message: "자료가 삭제되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "자료 삭제 실패" });
    }
  });

  // Learning records routes
  app.get("/api/learning-records", requireAuth, async (req, res) => {
    try {
      let studentId = req.query.studentId as string;
      
      // If student user, get their own records
      if (req.user!.role === "student") {
        const student = await storage.getStudentByUserId(req.user!.id);
        if (!student) {
          return res.status(404).json({ message: "학생 정보를 찾을 수 없습니다." });
        }
        studentId = student.id;
      }

      const records = await storage.getLearningRecordsByStudent(studentId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "학습 기록 조회 실패" });
    }
  });

  app.post("/api/learning-records", requireAuth, async (req, res) => {
    try {
      let { studentId, subject, content, reflection, week, weeklyMaterialId } = req.body;

      // If student user, use their own student ID
      if (req.user!.role === "student") {
        const student = await storage.getStudentByUserId(req.user!.id);
        if (!student) {
          return res.status(404).json({ message: "학생 정보를 찾을 수 없습니다." });
        }
        studentId = student.id;
      }

      if (!studentId || !subject || !content || !week) {
        return res.status(400).json({ message: "필수 정보가 누락되었습니다." });
      }

      const record = await storage.createLearningRecord({
        studentId,
        subject,
        content,
        reflection,
        week: parseInt(week),
        weeklyMaterialId,
        isSubmitted: true,
        submittedAt: new Date(),
      });

      res.status(201).json(record);
    } catch (error) {
      res.status(500).json({ message: "학습 기록 저장 실패" });
    }
  });

  app.put("/api/learning-records/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const record = await storage.updateLearningRecord(id, updateData);
      if (!record) {
        return res.status(404).json({ message: "학습 기록을 찾을 수 없습니다." });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "학습 기록 수정 실패" });
    }
  });

  // 요일별/주차별 학습 기록 조회 API
  app.get("/api/learning-records/weekly", requireAuth, async (req, res) => {
    try {
      const { week, dayOfWeek, studentId } = req.query;
      let actualStudentId = studentId as string;
      
      // Student users can only see their own records
      if (req.user!.role === "student") {
        const student = await storage.getStudentByUserId(req.user!.id);
        if (!student) {
          return res.status(404).json({ message: "학생 정보를 찾을 수 없습니다." });
        }
        actualStudentId = student.id;
      }

      if (!week) {
        return res.status(400).json({ message: "주차 정보가 필요합니다." });
      }

      let records;
      if (actualStudentId) {
        records = await storage.getLearningRecordsByStudentWeekAndDay(
          actualStudentId, 
          parseInt(week as string),
          dayOfWeek as string
        );
      } else if (dayOfWeek) {
        records = await storage.getLearningRecordsByWeekAndDay(
          parseInt(week as string),
          dayOfWeek as string
        );
      } else {
        records = await storage.getLearningRecordsByWeek(parseInt(week as string));
      }

      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "주간 학습 기록 조회 실패" });
    }
  });

  // 교사용 일자별 학생 기록 종합 조회 API
  app.get("/api/learning-records/daily-summary", requireTeacher, async (req, res) => {
    try {
      const { week, dayOfWeek } = req.query;
      
      if (!week) {
        return res.status(400).json({ message: "주차 정보가 필요합니다." });
      }

      let records;
      if (dayOfWeek) {
        records = await storage.getLearningRecordsByWeekAndDay(
          parseInt(week as string),
          dayOfWeek as string
        );
      } else {
        records = await storage.getLearningRecordsByWeek(parseInt(week as string));
      }

      // 학생 정보와 함께 조회
      const recordsWithStudents = await Promise.all(
        records.map(async (record) => {
          const student = await storage.getStudent(record.studentId);
          return {
            ...record,
            student: student ? {
              id: student.id,
              name: student.name,
              studentNumber: student.studentNumber
            } : null
          };
        })
      );

      res.json(recordsWithStudents);
    } catch (error) {
      res.status(500).json({ message: "일별 학습 기록 종합 조회 실패" });
    }
  });

  // Evaluation routes
  app.get("/api/evaluations", requireAuth, async (req, res) => {
    try {
      const { studentId } = req.query;
      
      if (!studentId) {
        return res.status(400).json({ message: "학생 ID가 필요합니다." });
      }

      const evaluations = await storage.getEvaluationsByStudent(studentId as string);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ message: "평어 조회 실패" });
    }
  });

  app.post("/api/evaluations/generate", requireTeacher, async (req, res) => {
    try {
      const { studentId, subject, periodStart, periodEnd } = req.body;

      if (!studentId || !subject) {
        return res.status(400).json({ message: "학생 ID와 과목은 필수입니다." });
      }

      // Get student info
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "학생을 찾을 수 없습니다." });
      }

      // Get learning records for the subject
      const learningRecords = await storage.getLearningRecordsByStudentAndSubject(studentId, subject);
      
      if (learningRecords.length === 0) {
        return res.status(400).json({ message: "해당 과목의 학습 기록이 없습니다." });
      }

      // Generate AI evaluation
      const evaluationContent = await generateEvaluation({
        studentName: student.name,
        subject,
        learningRecords: learningRecords.map(record => ({
          week: record.week,
          content: record.content,
          reflection: record.reflection || "",
        })),
      });

      // Save evaluation
      const evaluation = await storage.createEvaluation({
        studentId,
        subject,
        content: evaluationContent,
        generatedBy: "ai",
        periodStart: periodStart || Math.min(...learningRecords.map(r => r.week)),
        periodEnd: periodEnd || Math.max(...learningRecords.map(r => r.week)),
        createdBy: req.user!.id,
      });

      res.status(201).json(evaluation);
    } catch (error) {
      console.error("평어 생성 오류:", error);
      res.status(500).json({ message: "평어 생성 실패" });
    }
  });

  app.put("/api/evaluations/:id", requireTeacher, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "평어 내용이 필요합니다." });
      }

      const evaluation = await storage.updateEvaluation(id, {
        content,
        generatedBy: "manual",
      });

      if (!evaluation) {
        return res.status(404).json({ message: "평어를 찾을 수 없습니다." });
      }

      res.json(evaluation);
    } catch (error) {
      res.status(500).json({ message: "평어 수정 실패" });
    }
  });

  app.delete("/api/evaluations/:id", requireTeacher, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEvaluation(id);
      res.json({ message: "평어가 삭제되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "평어 삭제 실패" });
    }
  });

  // Dashboard stats route
  app.get("/api/dashboard/stats", requireTeacher, async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      const currentWeek = Math.ceil((Date.now() - new Date('2024-08-22').getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      const recentRecords = await storage.getLearningRecordsByWeek(currentWeek);
      const submittedStudents = new Set(recentRecords.map(r => r.studentId)).size;
      
      const stats = {
        totalStudents: students.length,
        submittedThisWeek: submittedStudents,
        currentWeek,
        evaluationsGenerated: 0, // Could be calculated from evaluations table
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "통계 조회 실패" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
