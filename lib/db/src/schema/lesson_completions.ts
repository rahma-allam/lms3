import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { lessonsTable } from "./courses";

// Feature 1: Track which lessons a student has completed
export const lessonCompletionsTable = pgTable("lesson_completions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.studentId, t.lessonId),
}));

export type LessonCompletion = typeof lessonCompletionsTable.$inferSelect;
