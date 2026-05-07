import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { coursesTable } from "./courses";
import { enrollmentsTable } from "./enrollments";

export const certificatesTable = pgTable(
  "certificates",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
    courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
    enrollmentId: integer("enrollment_id").notNull().references(() => enrollmentsTable.id, { onDelete: "cascade" }),
    certificateNumber: text("certificate_number").notNull().unique(),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.studentId, t.courseId)]
);

export type Certificate = typeof certificatesTable.$inferSelect;
