import { pgTable, serial, text, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";

export const studentStatusEnum = pgEnum("student_status", ["active", "inactive", "pending"]);
export const paymentStatusEnum = pgEnum("payment_status", ["paid", "pending", "overdue"]);
export const paymentMethodEnum = pgEnum("payment_method", ["bank_transfer", "cash", "card", "online"]);
export const paymentRecordStatusEnum = pgEnum("payment_record_status", ["completed", "pending", "failed", "refunded", "approved", "rejected"]);

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull().default(""),
  phone: text("phone"),
  status: studentStatusEnum("status").notNull().default("pending"),
  courseId: integer("course_id").references(() => coursesTable.id, { onDelete: "set null" }),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  progress: numeric("progress", { precision: 5, scale: 2 }).notNull().default("0"),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").references(() => coursesTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentRecordStatusEnum("status").notNull().default("pending"),
  method: paymentMethodEnum("method").notNull().default("cash"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true, enrolledAt: true });
export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
