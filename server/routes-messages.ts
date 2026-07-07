/**
 * server/routes-messages.ts
 * 양방향 메시지 + 교사 대시보드 + 지각 통계.
 * routes.ts에서 registerMessageRoutes(app) 호출.
 */
import type { Express } from "express";
import { db } from "./db";
import { messages, students, users, learningRecords, weeklyMaterials } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

import { requireAuth, requireTeacher } from "./middleware";

const DAY_OFFSET: Record<string, number> = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 };

function recordDate(startDate: string, dayOfWeek: string): string {
  const d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + (DAY_OFFSET[dayOfWeek] ?? 0));
  return d.toISOString().slice(0, 10);
}

export function registerMessageRoutes(app: Express) {
  // ── 메시지 ──────────────────────────────────────────

  // 교사 → 학생
  app.post("/api/messages", requireAuth, requireTeacher, async (req, res) => {
    const { toStudentId, content, relatedSubject } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "내용을 입력하세요" });
    const [msg] = await db.insert(messages).values({
      fromUserId: (req.user as any).id, toStudentId, content, relatedSubject,
    }).returning();
    res.status(201).json(msg);
  });

  // 학생 → 교사
  app.post("/api/messages/to-teacher", requireAuth, async (req, res) => {
    const [me] = await db.select().from(students).where(eq(students.userId, (req.user as any).id));
    if (!me) return res.status(403).json({ message: "학생 계정이 아닙니다" });
    const { content, relatedSubject } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "내용을 입력하세요" });
    const [teacher] = await db.select().from(users).where(eq(users.role, "teacher"));
    const [msg] = await db.insert(messages).values({
      fromUserId: (req.user as any).id, toUserId: teacher.id, content, relatedSubject,
    }).returning();
    res.status(201).json(msg);
  });

  // 학생: 내가 받은 메시지
  app.get("/api/messages/mine", requireAuth, async (req, res) => {
    const [me] = await db.select().from(students).where(eq(students.userId, (req.user as any).id));
    if (!me) return res.status(403).json({ message: "학생 계정이 아닙니다" });
    const list = await db.select().from(messages)
      .where(eq(messages.toStudentId, me.id)).orderBy(desc(messages.createdAt));
    res.json(list);
  });

  // 교사: 수신함
  app.get("/api/messages/inbox", requireAuth, requireTeacher, async (req, res) => {
    const list = await db.select().from(messages)
      .where(eq(messages.toUserId, (req.user as any).id)).orderBy(desc(messages.createdAt));
    res.json(list);
  });

  // 특정 학생과의 스레드 (교사)
  app.get("/api/messages/thread/:studentId", requireAuth, requireTeacher, async (req, res) => {
    const [student] = await db.select().from(students).where(eq(students.id, req.params.studentId));
    if (!student) return res.status(404).json({ message: "학생 없음" });
    const sent = await db.select().from(messages).where(eq(messages.toStudentId, student.id));
    const received = student.userId
      ? await db.select().from(messages).where(eq(messages.fromUserId, student.userId))
      : [];
    const thread = [...sent, ...received]
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
    res.json(thread);
  });

  // 읽음 처리
  app.post("/api/messages/:id/read", requireAuth, async (req, res) => {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, req.params.id));
    res.json({ ok: true });
  });

  // 학생: 확인했어요
  app.post("/api/messages/:id/ack", requireAuth, async (req, res) => {
    const [me] = await db.select().from(students).where(eq(students.userId, (req.user as any).id));
    if (!me) return res.status(403).json({ message: "학생 계정이 아닙니다" });
    const [msg] = await db.update(messages)
      .set({ acknowledgedAt: new Date(), isRead: true })
      .where(and(eq(messages.id, req.params.id), eq(messages.toStudentId, me.id)))
      .returning();
    res.json(msg);
  });

  // ── 교사 대시보드 ────────────────────────────────────

  // 학생 목록 + 알림 요약
  app.get("/api/dashboard/students", requireAuth, requireTeacher, async (req, res) => {
    const list = await db.select().from(students).where(eq(students.isActive, true));
    const materials = await db.select().from(weeklyMaterials);
    const weekStart = new Map(materials.map((m) => [m.week, m.startDate]));

    const result = [];
    for (const s of list) {
      const unread = s.userId
        ? await db.select().from(messages).where(and(
            eq(messages.fromUserId, s.userId), eq(messages.isRead, false)))
        : [];
      const recs = await db.select().from(learningRecords)
        .where(eq(learningRecords.studentId, s.id));
      let late = 0;
      for (const r of recs) {
        const start = weekStart.get(r.week);
        if (!start || !r.submittedAt || !r.dayOfWeek) continue;
        if (r.submittedAt.toISOString().slice(0, 10) > recordDate(start, r.dayOfWeek)) late++;
      }
      result.push({
        id: s.id, name: s.name, studentNumber: s.studentNumber,
        unreadMessages: unread.length,
        totalRecords: recs.length,
        lateRecords: late,
        lateRate: recs.length ? Math.round((late / recs.length) * 100) : 0,
        lastRecordAt: recs.map((r) => r.submittedAt).filter(Boolean).sort().at(-1) ?? null,
      });
    }
    // 미확인 메시지 있는 학생 우선, 그다음 출석번호
    result.sort((a, b) => b.unreadMessages - a.unreadMessages
      || a.studentNumber.localeCompare(b.studentNumber, "ko", { numeric: true }));
    res.json(result);
  });
}
