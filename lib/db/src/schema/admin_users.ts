import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const adminUsersTable = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenantsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull().default("Admin"),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
