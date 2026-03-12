import { pgTable, text, serial, boolean, timestamp, jsonb, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default('employee'), // admin or employee
  lastLoginAt: timestamp("last_login_at"),
  lastLogoutAt: timestamp("last_logout_at"),
  isOnline: boolean("is_online").notNull().default(false),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  
  // Personal
  fullName: text("full_name").notNull(),
  fatherName: text("father_name").notNull(),
  motherName: text("mother_name").notNull(),
  placeOfBirth: text("place_of_birth").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  registryPlaceAndNumber: text("registry_place_and_number").notNull(),
  nationalId: text("national_id").notNull().unique(),
  shamCashNumber: text("sham_cash_number"),
  gender: text("gender").notNull(), // ذكر - أنثى
  
  // Professional
  certificate: text("certificate").notNull().default(""),
  certificateType: text("certificate_type").notNull(), // إعدادية – ثانوية – ثانوية صناعية – مهني – جامعة
  specialization: text("specialization").notNull(),
  jobTitle: text("job_title").notNull(),
  category: text("category").notNull(), // أولى – ثانية – ثالثة – رابعة
  employmentStatus: text("employment_status").notNull(), // مثبت – عقد
  appointmentDecisionNumber: text("appointment_decision_number").notNull(),
  appointmentDecisionDate: timestamp("appointment_decision_date"),
  firstStateStart: timestamp("first_state_start"),
  firstDirectorateStart: timestamp("first_directorate_start"),
  firstDepartmentStart: timestamp("first_department_start"),
  currentStatus: text("current_status").notNull(), // على رأس عمله – إجازة بلا اجر – نقل – استقالة
  assignedWork: text("assigned_work").notNull(), // رئيس القسم الهندسي – صيانة و اشراف و متابعة لجان - مستخدم – ورشة القسم الهندسي
  mobile: text("mobile").notNull(),
  address: text("address").notNull(),
  documentPaths: jsonb("document_paths").default([]),
  notes: text("notes"),

  // System
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE
  entityType: text("entity_type").notNull(), // EMPLOYEE, USER
  entityId: text("entity_id").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees, {
  fullName: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  placeOfBirth: z.string().optional(),
  registryPlaceAndNumber: z.string().optional(),
  nationalId: z.string().min(1, "الرقم الوطني مطلوب").refine(val => val.length === 11 && /^[0-9]+$/.test(val), {
    message: "الرقم الوطني يجب أن يكون 11 خانة رقمية"
  }),
  certificate: z.string().optional(),
  jobTitle: z.string().optional(),
  specialization: z.string().optional(),
  appointmentDecisionNumber: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.preprocess((arg) => (typeof arg === "string" && arg === "") ? null : arg, z.date().nullable().optional()),
  appointmentDecisionDate: z.preprocess((arg) => (typeof arg === "string" && arg === "") ? null : arg, z.date().nullable().optional()),
  firstStateStart: z.preprocess((arg) => (typeof arg === "string" && arg === "") ? null : arg, z.date().nullable().optional()),
  firstDirectorateStart: z.preprocess((arg) => (typeof arg === "string" && arg === "") ? null : arg, z.date().nullable().optional()),
  firstDepartmentStart: z.preprocess((arg) => (typeof arg === "string" && arg === "") ? null : arg, z.date().nullable().optional()),
}).omit({ 
  id: true, 
  isDeleted: true, 
  deletedAt: true,
  createdAt: true,
  updatedAt: true 
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// API Request Types
export type LoginRequest = Pick<InsertUser, "username" | "password">;
export type UpdateEmployeeRequest = Partial<InsertEmployee>;
export type UpdateUserRequest = Partial<InsertUser>;
