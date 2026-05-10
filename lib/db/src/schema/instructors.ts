import { pgTable, serial, text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { studentsTable } from "./students";
import { tenantsTable } from "./tenants";

export const instructorsTable = pgTable("instructors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenantsTable.id, { onDelete: "cascade" }), // ← أضيفي ده
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  email: text("email").notNull(), // ← شيلي .unique() لأن نفس الإيميل ممكن في أكاديميتين
  password: text("password").notNull().default(""),
  phone: text("phone"),
  bio: text("bio"),
  bioAr: text("bio_ar"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const courseInstructorsTable = pgTable("course_instructors", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  instructorId: integer("instructor_id").notNull().references(() => instructorsTable.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
});

export const senderTypeEnum = pgEnum("sender_type", ["instructor", "student"]);

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  senderType: senderTypeEnum("sender_type").notNull(),
  senderId: integer("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  recipientStudentId: integer("recipient_student_id").references(() => studentsTable.id, { onDelete: "set null" }),
  content: text("content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messageAttachmentsTable = pgTable("message_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  storedFilename: text("stored_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInstructorSchema = createInsertSchema(instructorsTable).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export const insertAttachmentSchema = createInsertSchema(messageAttachmentsTable).omit({ id: true, createdAt: true });

export type Instructor = typeof instructorsTable.$inferSelect;
export type InsertInstructor = z.infer<typeof insertInstructorSchema>;
export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageAttachment = typeof messageAttachmentsTable.$inferSelect;
