import { users, students, weeklyMaterials, learningRecords, evaluations } from "@shared/schema";
import type { User, InsertUser, Student, InsertStudent, WeeklyMaterial, InsertWeeklyMaterial, LearningRecord, InsertLearningRecord, Evaluation, InsertEvaluation } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";
import session, { SessionStore } from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, password: string): Promise<User | undefined>;
  createBulkStudents(students: Array<{ name: string; studentNumber: string; username: string; password: string }>): Promise<User[]>;
  
  // Student methods
  getAllStudents(): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByUserId(userId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<void>;
  
  // Weekly material methods
  getAllWeeklyMaterials(): Promise<WeeklyMaterial[]>;
  getWeeklyMaterial(id: string): Promise<WeeklyMaterial | undefined>;
  createWeeklyMaterial(material: InsertWeeklyMaterial): Promise<WeeklyMaterial>;
  deleteWeeklyMaterial(id: string): Promise<void>;
  
  // Learning record methods
  getLearningRecordsByStudent(studentId: string): Promise<LearningRecord[]>;
  getLearningRecordsByWeek(week: number): Promise<LearningRecord[]>;
  getLearningRecord(id: string): Promise<LearningRecord | undefined>;
  createLearningRecord(record: InsertLearningRecord): Promise<LearningRecord>;
  updateLearningRecord(id: string, record: Partial<InsertLearningRecord>): Promise<LearningRecord | undefined>;
  getLearningRecordsByStudentAndSubject(studentId: string, subject: string): Promise<LearningRecord[]>;
  
  // Evaluation methods
  getEvaluationsByStudent(studentId: string): Promise<Evaluation[]>;
  getEvaluation(id: string): Promise<Evaluation | undefined>;
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  updateEvaluation(id: string, evaluation: Partial<InsertEvaluation>): Promise<Evaluation | undefined>;
  deleteEvaluation(id: string): Promise<void>;
  
  sessionStore: SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createBulkStudents(studentsData: Array<{ name: string; studentNumber: string; username: string; password: string }>): Promise<User[]> {
    const results = [];
    
    for (const studentData of studentsData) {
      try {
        // Create user account
        const user = await this.createUser({
          username: studentData.username,
          password: studentData.password,
          role: "student",
        });

        // Create student profile
        await this.createStudent({
          name: studentData.name,
          studentNumber: studentData.studentNumber,
          classRoom: "5학년 7반",
          userId: user.id,
        });

        results.push(user);
      } catch (error) {
        console.error(`Failed to create student ${studentData.name}:`, error);
        // Continue with other students
      }
    }

    return results;
  }

  // Student methods
  async getAllStudents(): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.isActive, true)).orderBy(asc(students.studentNumber));
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async getStudentByUserId(userId: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.userId, userId));
    return student || undefined;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db
      .insert(students)
      .values(student)
      .returning();
    return newStudent;
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student | undefined> {
    const [updatedStudent] = await db
      .update(students)
      .set(student)
      .where(eq(students.id, id))
      .returning();
    return updatedStudent || undefined;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.update(students).set({ isActive: false }).where(eq(students.id, id));
  }

  // Weekly material methods
  async getAllWeeklyMaterials(): Promise<WeeklyMaterial[]> {
    return await db.select().from(weeklyMaterials).orderBy(desc(weeklyMaterials.week));
  }

  async getWeeklyMaterial(id: string): Promise<WeeklyMaterial | undefined> {
    const [material] = await db.select().from(weeklyMaterials).where(eq(weeklyMaterials.id, id));
    return material || undefined;
  }

  async createWeeklyMaterial(material: InsertWeeklyMaterial): Promise<WeeklyMaterial> {
    const [newMaterial] = await db
      .insert(weeklyMaterials)
      .values(material)
      .returning();
    return newMaterial;
  }

  async deleteWeeklyMaterial(id: string): Promise<void> {
    await db.delete(weeklyMaterials).where(eq(weeklyMaterials.id, id));
  }

  // Learning record methods
  async getLearningRecordsByStudent(studentId: string): Promise<LearningRecord[]> {
    return await db.select().from(learningRecords).where(eq(learningRecords.studentId, studentId)).orderBy(desc(learningRecords.week));
  }

  async getLearningRecordsByWeek(week: number): Promise<LearningRecord[]> {
    return await db.select().from(learningRecords).where(eq(learningRecords.week, week));
  }

  async getLearningRecord(id: string): Promise<LearningRecord | undefined> {
    const [record] = await db.select().from(learningRecords).where(eq(learningRecords.id, id));
    return record || undefined;
  }

  async createLearningRecord(record: InsertLearningRecord): Promise<LearningRecord> {
    const [newRecord] = await db
      .insert(learningRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async updateLearningRecord(id: string, record: Partial<InsertLearningRecord>): Promise<LearningRecord | undefined> {
    const [updatedRecord] = await db
      .update(learningRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(learningRecords.id, id))
      .returning();
    return updatedRecord || undefined;
  }

  async getLearningRecordsByStudentAndSubject(studentId: string, subject: string): Promise<LearningRecord[]> {
    return await db.select().from(learningRecords)
      .where(and(
        eq(learningRecords.studentId, studentId),
        eq(learningRecords.subject, subject)
      ))
      .orderBy(asc(learningRecords.week));
  }

  // Evaluation methods
  async getEvaluationsByStudent(studentId: string): Promise<Evaluation[]> {
    return await db.select().from(evaluations).where(eq(evaluations.studentId, studentId)).orderBy(desc(evaluations.createdAt));
  }

  async getEvaluation(id: string): Promise<Evaluation | undefined> {
    const [evaluation] = await db.select().from(evaluations).where(eq(evaluations.id, id));
    return evaluation || undefined;
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const [newEvaluation] = await db
      .insert(evaluations)
      .values(evaluation)
      .returning();
    return newEvaluation;
  }

  async updateEvaluation(id: string, evaluation: Partial<InsertEvaluation>): Promise<Evaluation | undefined> {
    const [updatedEvaluation] = await db
      .update(evaluations)
      .set({ ...evaluation, updatedAt: new Date() })
      .where(eq(evaluations.id, id))
      .returning();
    return updatedEvaluation || undefined;
  }

  async deleteEvaluation(id: string): Promise<void> {
    await db.delete(evaluations).where(eq(evaluations.id, id));
  }

  // New methods for user password management and bulk operations
  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async createBulkStudents(studentsData: Array<{ name: string; studentNumber: string; username: string; password: string }>): Promise<User[]> {
    const createdUsers: User[] = [];
    
    for (const studentData of studentsData) {
      // Create user account
      const user = await this.createUser({
        username: studentData.username,
        password: studentData.password,
        name: studentData.name,
        role: "student",
        studentNumber: studentData.studentNumber,
      });

      // Create student profile
      await this.createStudent({
        userId: user.id,
        name: studentData.name,
        studentNumber: studentData.studentNumber,
        classRoom: "5학년 7반",
      });

      createdUsers.push(user);
    }

    return createdUsers;
  }
}

export const storage = new DatabaseStorage();
