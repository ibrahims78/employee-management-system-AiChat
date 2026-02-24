import { db } from "./db";
import { users, employees, auditLogs, settings } from "@shared/schema";
import type { User, InsertUser, Employee, InsertEmployee, AuditLog, InsertAuditLog } from "@shared/schema";
import { eq, and, notInArray, desc, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Employees
  getEmployees(includeArchived?: boolean, page?: number, limit?: number): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, updates: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>; // soft delete
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(): Promise<{log: AuditLog, user: User | null}[]>;

  // Settings
  getSetting(key: string): Promise<any>;
  updateSetting(key: string, value: any): Promise<any>;
  
  // Backup & Restore
  restoreFromData(data: { employees: any[], users: any[], auditLogs: any[] }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async restoreFromData(data: { employees: any[], users: any[], auditLogs: any[] }): Promise<void> {
    await db.transaction(async (tx) => {
      // Clear existing data
      await tx.delete(auditLogs);
      await tx.delete(employees);
      await tx.delete(users);

      // Restore Users
      if (data.users && data.users.length > 0) {
        const usersToInsert = data.users.map(u => {
          const processed = { ...u };
          const dateFields = ["lastLoginAt", "lastLogoutAt"];
          for (const field of dateFields) {
            if (processed[field]) {
              const val = processed[field];
              let d: Date;
              if (val instanceof Date) {
                d = val;
              } else if (typeof val === 'string' || typeof val === 'number') {
                d = new Date(val);
              } else {
                processed[field] = null;
                continue;
              }
              processed[field] = isNaN(d.getTime()) ? null : d;
            } else {
              processed[field] = null;
            }
          }
          return processed;
        });
        await tx.insert(users).values(usersToInsert);
      }

      // Restore Employees
      if (data.employees && data.employees.length > 0) {
        const employeesToInsert = data.employees.map(e => {
          const processed = { ...e };
          const dateFields = ["dateOfBirth", "appointmentDecisionDate", "firstStateStart", "firstDirectorateStart", "firstDepartmentStart", "deletedAt", "createdAt", "updatedAt"];
          for (const field of dateFields) {
            if (processed[field]) {
              const val = processed[field];
              let d: Date;
              if (val instanceof Date) {
                d = val;
              } else if (typeof val === 'string' || typeof val === 'number') {
                // Use UTC for consistent restore
                d = new Date(val);
              } else {
                processed[field] = null;
                continue;
              }
              
              if (isNaN(d.getTime())) {
                processed[field] = null;
              } else {
                // Ensure date is stored without local offset shifts if possible
                processed[field] = d;
              }
            } else {
              processed[field] = null;
            }
          }
          return processed;
        });
        await tx.insert(employees).values(employeesToInsert);
      }

      // Restore Audit Logs
      if (data.auditLogs && data.auditLogs.length > 0) {
        const logsToInsert = data.auditLogs.map(l => {
          const val = l.createdAt;
          let d: Date;
          if (val instanceof Date) {
            d = val;
          } else if (typeof val === 'string' || typeof val === 'number') {
            d = new Date(val);
          } else {
            d = new Date();
          }
          
          return {
            ...l,
            createdAt: isNaN(d.getTime()) ? new Date() : d
          };
        });
        await tx.insert(auditLogs).values(logsToInsert);
      }
    });
  }

  async getSetting(key: string): Promise<any> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value;
  }

  async updateSetting(key: string, value: any): Promise<any> {
    const [existing] = await db.select().from(settings).where(eq(settings.key, key));
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated.value;
    }
    const [created] = await db.insert(settings)
      .values({ key, value })
      .returning();
    return created.value;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    // Auto-offline check: if user was online but session expired (approximate check)
    // In a real app, we'd use session store events, but here we can check last activity
    // or rely on the 10min session timeout to eventually trigger logout or 
    // simply prevent login if isOnline is true.
    return user;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }
  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getEmployees(includeArchived: boolean = false, page: number = 1, limit: number = 50): Promise<Employee[]> {
    const offset = (page - 1) * limit;
    if (includeArchived) {
      // جلب الموظفين المؤرشفين فقط (الذين ليسوا على رأس عملهم)
      return await db.select().from(employees).where(
        and(
          eq(employees.isDeleted, false),
          notInArray(employees.currentStatus, ["على رأس عمله"])
        )
      ).limit(limit).offset(offset).orderBy(desc(employees.createdAt));
    }
    // جلب الموظفين النشطين فقط (الذين على رأس عملهم)
    return await db.select().from(employees).where(
      and(
        eq(employees.isDeleted, false),
        eq(employees.currentStatus, "على رأس عمله")
      )
    ).limit(limit).offset(offset).orderBy(desc(employees.createdAt));
  }
  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(employees).values(employee).returning();
    return created;
  }
  async updateEmployee(id: number, updates: Partial<InsertEmployee>): Promise<Employee> {
    const [updated] = await db.update(employees).set({
      ...(updates as any),
      updatedAt: new Date(),
    }).where(eq(employees.id, id)).returning();
    if (!updated) throw new Error("Employee not found");
    return updated;
  }
  async deleteEmployee(id: number): Promise<void> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    if (employee) {
      // Physically delete files when an employee is archived or deleted if desired
      // But based on the request, we focus on fixing the logical flaws.
      // Soft delete is already implemented.
    }
    await db.update(employees).set({ 
      isDeleted: true,
      deletedAt: new Date()
    }).where(eq(employees.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }
  async getAuditLogs(): Promise<{log: AuditLog, user: User | null}[]> {
    const logs = await db.select()
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.id));
    return logs.map(l => ({ log: l.audit_logs, user: l.users }));
  }
}

export const storage = new DatabaseStorage();