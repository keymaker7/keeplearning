import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("student"), // 'teacher' or 'student'
  name: text("name").notNull(),
  studentNumber: text("student_number"),
  classRoom: text("class_room").default("5학년 7반"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  studentNumber: text("student_number").notNull().unique(),
  classRoom: text("class_room").notNull().default("5학년 7반"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklyMaterials = pgTable("weekly_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  week: integer("week").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  filePath: text("file_path"),
  content: text("content"), // extracted PDF content
  subjects: jsonb("subjects"), // parsed subjects from PDF
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const learningRecords = pgTable("learning_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id),
  weeklyMaterialId: varchar("weekly_material_id").references(() => weeklyMaterials.id),
  subject: text("subject").notNull(), // 국어, 수학, 과학, 사회, etc.
  content: text("content").notNull(), // what student learned
  reflection: text("reflection"), // feelings/difficulties
  week: integer("week").notNull(),
  isSubmitted: boolean("is_submitted").default(false),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const evaluations = pgTable("evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id),
  subject: text("subject").notNull(),
  content: text("content").notNull(), // AI generated evaluation
  generatedBy: text("generated_by").default("ai"), // 'ai' or 'manual'
  periodStart: integer("period_start").notNull(), // week number
  periodEnd: integer("period_end").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  students: many(students),
  weeklyMaterials: many(weeklyMaterials),
  evaluations: many(evaluations),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  learningRecords: many(learningRecords),
  evaluations: many(evaluations),
}));

export const weeklyMaterialsRelations = relations(weeklyMaterials, ({ one, many }) => ({
  uploadedByUser: one(users, {
    fields: [weeklyMaterials.uploadedBy],
    references: [users.id],
  }),
  learningRecords: many(learningRecords),
}));

export const learningRecordsRelations = relations(learningRecords, ({ one }) => ({
  student: one(students, {
    fields: [learningRecords.studentId],
    references: [students.id],
  }),
  weeklyMaterial: one(weeklyMaterials, {
    fields: [learningRecords.weeklyMaterialId],
    references: [weeklyMaterials.id],
  }),
}));

export const evaluationsRelations = relations(evaluations, ({ one }) => ({
  student: one(students, {
    fields: [evaluations.studentId],
    references: [students.id],
  }),
  createdByUser: one(users, {
    fields: [evaluations.createdBy],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  studentNumber: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyMaterialSchema = createInsertSchema(weeklyMaterials).omit({
  id: true,
  createdAt: true,
});

export const insertLearningRecordSchema = createInsertSchema(learningRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvaluationSchema = createInsertSchema(evaluations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type WeeklyMaterial = typeof weeklyMaterials.$inferSelect;
export type InsertWeeklyMaterial = z.infer<typeof insertWeeklyMaterialSchema>;
export type LearningRecord = typeof learningRecords.$inferSelect;
export type InsertLearningRecord = z.infer<typeof insertLearningRecordSchema>;
export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
