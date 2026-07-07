/**
 * server/routes-timetable.ts
 * routes.ts의 registerRoutes 안에서 registerTimetableRoutes(app) 호출로 등록.
 *
 * 추가 API:
 *  POST /api/weekly-materials/hwpx        hwpx 업로드 → 파싱 → 저장 (교사)
 *  GET  /api/timetable/today?date=        해당 날짜의 교시별 시간표 + 내 기록 (학생)
 *  POST /api/learning-records/period      교시별 기록 저장 (upsert)
 *  GET  /api/portfolio/:studentId         과목별·날짜별 기록 포트폴리오
 *  POST /api/evaluations/generate-all     학생 1명 전과목 평어 일괄 생성 (교사)
 */
import type { Express } from "express";
import multer from "multer";
import { db } from "./db";
import { weeklyMaterials, learningRecords, students, evaluations } from "@shared/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { parseHwpxTimetable } from "./hwpxParser";
import { generateSubjectEvaluation } from "./openai-evaluations";

import { requireAuth, requireTeacher } from "./middleware";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export function registerTimetableRoutes(app: Express) {
  // 1) hwpx 주간학습안내 업로드 → 시간표 자동 생성
  app.post("/api/weekly-materials/hwpx", requireAuth, requireTeacher, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "파일이 없습니다" });
      const year = Number(req.body.year) || new Date().getFullYear();
      const parsed = await parseHwpxTimetable(req.file.buffer, year);

      // 같은 주차가 있으면 교체 (재업로드 지원)
      const existing = await db.select().from(weeklyMaterials).where(eq(weeklyMaterials.week, parsed.week));
      if (existing.length > 0) {
        const [updated] = await db.update(weeklyMaterials)
          .set({
            title: parsed.title,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            subjects: parsed.subjects,
            timetable: parsed.timetable,
          })
          .where(eq(weeklyMaterials.week, parsed.week))
          .returning();
        return res.json({ ...updated, replaced: true });
      }

      const [material] = await db.insert(weeklyMaterials).values({
        title: parsed.title,
        week: parsed.week,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        subjects: parsed.subjects,
        timetable: parsed.timetable,
        uploadedBy: (req.user as any).id,
      }).returning();
      res.status(201).json(material);
    } catch (e: any) {
      res.status(422).json({ message: e.message ?? "hwpx 파싱 실패" });
    }
  });

  // 2) 오늘(또는 지정 날짜)의 교시별 시간표 + 내 기록
  app.get("/api/timetable/today", requireAuth, async (req, res) => {
    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const materials = await db.select().from(weeklyMaterials)
      .where(and(lte(weeklyMaterials.startDate, dateStr), gte(weeklyMaterials.endDate, dateStr)));
    if (materials.length === 0) return res.json({ date: dateStr, periods: [], week: null });

    const material = materials[0];
    const dayName = ["일", "월", "화", "수", "목", "금", "토"][new Date(dateStr + "T00:00:00").getDay()];
    const daySlots = (material.timetable as any)?.[dayName] ?? {};

    // 학생이면 내 기록 병합
    let records: any[] = [];
    const user = req.user as any;
    if (user.role === "student") {
      const [student] = await db.select().from(students).where(eq(students.userId, user.id));
      if (student) {
        records = await db.select().from(learningRecords).where(and(
          eq(learningRecords.studentId, student.id),
          eq(learningRecords.week, material.week),
          eq(learningRecords.dayOfWeek, dayName),
        ));
      }
    }

    const periods = Object.entries(daySlots)
      .map(([period, slot]: [string, any]) => ({
        period: Number(period),
        ...slot,
        myRecord: records.find((r) => r.period === Number(period)) ?? null,
      }))
      .sort((a, b) => a.period - b.period);

    res.json({ date: dateStr, dayOfWeek: dayName, week: material.week, weeklyMaterialId: material.id, periods });
  });

  // 3) 교시별 기록 upsert
  app.post("/api/learning-records/period", requireAuth, async (req, res) => {
    const user = req.user as any;
    const [student] = await db.select().from(students).where(eq(students.userId, user.id));
    if (!student) return res.status(403).json({ message: "학생 계정이 아닙니다" });

    const { weeklyMaterialId, week, dayOfWeek, period, subject, unit, content, reflection, date } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "배운 내용을 입력하세요" });
    // 과거 소급 기록 허용, 미래 날짜만 차단
    const today = new Date().toISOString().slice(0, 10);
    if (date && date > today) return res.status(400).json({ message: "미래 날짜는 기록할 수 없습니다" });

    const existing = await db.select().from(learningRecords).where(and(
      eq(learningRecords.studentId, student.id),
      eq(learningRecords.week, week),
      eq(learningRecords.dayOfWeek, dayOfWeek),
      eq(learningRecords.period, period),
    ));

    if (existing.length > 0) {
      const [updated] = await db.update(learningRecords)
        .set({ content, reflection, updatedAt: new Date(), isSubmitted: true, submittedAt: new Date() })
        .where(eq(learningRecords.id, existing[0].id)).returning();
      return res.json(updated);
    }

    const [created] = await db.insert(learningRecords).values({
      studentId: student.id, weeklyMaterialId, subject, unit,
      content, reflection, week, dayOfWeek, period,
      isSubmitted: true, submittedAt: new Date(),
    }).returning();
    res.status(201).json(created);
  });

  // 4) 과목별·날짜별 포트폴리오 (학생 본인 또는 교사)
  app.get("/api/portfolio/:studentId", requireAuth, async (req, res) => {
    const user = req.user as any;
    const { studentId } = req.params;
    if (user.role === "student") {
      const [me] = await db.select().from(students).where(eq(students.userId, user.id));
      if (me?.id !== studentId) return res.status(403).json({ message: "본인 기록만 볼 수 있습니다" });
    }

    const records = await db.select().from(learningRecords)
      .where(eq(learningRecords.studentId, studentId))
      .orderBy(asc(learningRecords.week), asc(learningRecords.period));

    // 주차별 날짜 계산을 위해 자료 로드
    const materials = await db.select().from(weeklyMaterials);
    const weekMap = new Map(materials.map((m) => [m.week, m]));
    const DAY_OFFSET: Record<string, number> = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 };

    const bySubject: Record<string, any[]> = {};
    for (const r of records) {
      const m = weekMap.get(r.week);
      let date = "";
      if (m?.startDate && r.dayOfWeek && r.dayOfWeek in DAY_OFFSET) {
        const start = new Date(m.startDate + "T00:00:00");
        // startDate 요일 보정 (시작일이 월요일이 아닐 수 있음)
        const startDay = ["일","월","화","수","목","금","토"][start.getDay()];
        const delta = DAY_OFFSET[r.dayOfWeek] - (DAY_OFFSET[startDay] ?? 0);
        const d = new Date(start); d.setDate(d.getDate() + delta);
        date = d.toISOString().slice(0, 10);
      }
      const isLate = !!(date && r.submittedAt && r.submittedAt.toISOString().slice(0, 10) > date);
      const entry: Record<string, unknown> = { ...r, date };
      if (user.role === "teacher") entry.isLate = isLate;
      (bySubject[r.subject] ??= []).push(entry);
    }
    // 과목 내부 날짜순 정렬
    for (const s of Object.keys(bySubject))
      bySubject[s].sort((a, b) => (a.date + a.period).localeCompare(b.date + b.period));

    res.json({ studentId, subjects: bySubject, totalRecords: records.length });
  });

  // 5) 전과목 평어 일괄 생성 (교사)
  app.post("/api/evaluations/generate-all", requireAuth, requireTeacher, async (req, res) => {
    const { studentId, periodStart = 1, periodEnd = 52 } = req.body;
    const [student] = await db.select().from(students).where(eq(students.id, studentId));
    if (!student) return res.status(404).json({ message: "학생을 찾을 수 없습니다" });

    const records = await db.select().from(learningRecords).where(and(
      eq(learningRecords.studentId, studentId),
      gte(learningRecords.week, periodStart),
      lte(learningRecords.week, periodEnd),
    ));

    const bySubject: Record<string, typeof records> = {};
    for (const r of records) (bySubject[r.subject] ??= []).push(r);

    const results: any[] = [];
    for (const [subject, recs] of Object.entries(bySubject)) {
      if (recs.length === 0) continue;
      try {
        const content = await generateSubjectEvaluation({
          studentName: student.name,
          subject,
          records: recs.map((r) => ({
            week: r.week, unit: r.unit ?? "", content: r.content, reflection: r.reflection ?? "",
          })),
        });
        const [saved] = await db.insert(evaluations).values({
          studentId, subject, content, generatedBy: "ai",
          periodStart, periodEnd, createdBy: (req.user as any).id,
        }).returning();
        results.push(saved);
      } catch (e: any) {
        results.push({ subject, error: e.message });
      }
    }
    res.json({ student: student.name, generated: results.length, evaluations: results });
  });
}
