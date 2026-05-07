import { pgTable, serial, text, numeric, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const courseStatusEnum = pgEnum("course_status", ["active", "draft", "archived"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["video", "pdf", "text"]);
export const courseTypeEnum = pgEnum("course_type", ["recorded", "live"]);

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  status: courseStatusEnum("status").notNull().default("draft"),
  courseType: courseTypeEnum("course_type").notNull().default("recorded"),
  thumbnailUrl: text("thumbnail_url"),
  categoryId: integer("category_id"),
  level: text("level"),
  language: text("language"),
  totalHours: numeric("total_hours", { precision: 6, scale: 1 }),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const modulesTable = pgTable("modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => modulesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  type: lessonTypeEnum("type").notNull().default("video"),
  videoUrl: text("video_url"),
  pdfUrl: text("pdf_url"),
  content: text("content"),
  duration: integer("duration"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const courseSessionsTable = pgTable("course_sessions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(90),
  zoomLink: text("zoom_link"),
  zoomPassword: text("zoom_password"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export const insertModuleSchema = createInsertSchema(modulesTable).omit({ id: true, createdAt: true });
export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true });
export const insertCourseSessionSchema = createInsertSchema(courseSessionsTable).omit({ id: true, createdAt: true });

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modulesTable.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;
export type CourseSession = typeof courseSessionsTable.$inferSelect;
export type InsertCourseSession = z.infer<typeof insertCourseSessionSchema>;
