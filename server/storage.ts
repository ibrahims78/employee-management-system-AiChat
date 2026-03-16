import { db } from "./db";
import { users, employees, auditLogs, settings, apiKeys, botUsers } from "@shared/schema";
import type { User, InsertUser, Employee, InsertEmployee, AuditLog, InsertAuditLog, ApiKey, InsertApiKey, BotUser, InsertBotUser } from "@shared/schema";
import { eq, and, notInArray, desc, inArray, sql, or, ilike, lt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  resetAllOnlineStatus(): Promise<void>;

  // Employees
  getEmployees(includeArchived?: boolean, page?: number, limit?: number, all?: boolean, allStatuses?: boolean, search?: string): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, updates: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
  bulkCreateEmployees(data: InsertEmployee[]): Promise<{ created: Employee[]; duplicateNationalIds: string[] }>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  bulkCreateAuditLogs(data: InsertAuditLog[]): Promise<void>;
  getAuditLogs(page?: number, limit?: number, action?: string, search?: string): Promise<{ logs: { log: AuditLog; user: User | null }[]; total: number }>;
  getEmployeeHistory(employeeId: string): Promise<{ log: AuditLog; user: User | null }[]>;
  getAuditLogActionCounts(): Promise<Record<string, number>>;
  clearAuditLogs(): Promise<void>;

  // Settings
  getSetting(key: string): Promise<any>;
  updateSetting(key: string, value: any): Promise<any>;

  // Backup & Restore
  restoreFromData(data: { employees: any[]; users: any[]; auditLogs: any[] }): Promise<void>;

  // API Keys
  getApiKeys(): Promise<ApiKey[]>;
  getApiKeyByValue(keyValue: string): Promise<ApiKey | undefined>;
  createApiKey(data: InsertApiKey, keyValue: string): Promise<ApiKey>;
  updateApiKey(id: number, updates: Partial<Pick<ApiKey, "isActive" | "description" | "expiryDate" | "keyType">>): Promise<ApiKey>;
  deleteApiKey(id: number): Promise<void>;

  // Bot Users
  getBotUsers(): Promise<BotUser[]>;
  getBotUser(id: number): Promise<BotUser | undefined>;
  getBotUserByPhone(phoneNumber: string): Promise<BotUser | undefined>;
  getBotUserByLid(lid: string): Promise<BotUser | undefined>;
  createBotUser(data: InsertBotUser): Promise<BotUser>;
  updateBotUser(id: number, updates: Partial<BotUser>): Promise<BotUser>;
  deleteBotUser(id: number): Promise<void>;
  deactivateInactiveBotUsers(thresholdMs: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async restoreFromData(data: { employees: any[]; users: any[]; auditLogs: any[] }): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(auditLogs);
      await tx.delete(employees);
      await tx.delete(users);

      if (data.users && data.users.length > 0) {
        const usersToInsert = data.users.map(u => {
          const processed = { ...u };
          for (const field of ["lastLoginAt", "lastLogoutAt"]) {
            if (processed[field]) {
              const d = new Date(processed[field]);
              processed[field] = isNaN(d.getTime()) ? null : d;
            } else {
              processed[field] = null;
            }
          }
          return processed;
        });
        await tx.insert(users).values(usersToInsert);
      }

      if (data.employees && data.employees.length > 0) {
        const DATE_FIELDS = ["dateOfBirth", "appointmentDecisionDate", "firstStateStart", "firstDirectorateStart", "firstDepartmentStart", "deletedAt", "createdAt", "updatedAt"];
        const employeesToInsert = data.employees.map(e => {
          const processed = { ...e };
          for (const field of DATE_FIELDS) {
            if (processed[field]) {
              const d = new Date(processed[field]);
              processed[field] = isNaN(d.getTime()) ? null : d;
            } else {
              processed[field] = null;
            }
          }
          return processed;
        });
        await tx.insert(employees).values(employeesToInsert);
      }

      if (data.auditLogs && data.auditLogs.length > 0) {
        const logsToInsert = data.auditLogs.map(l => {
          const d = new Date(l.createdAt);
          return { ...l, createdAt: isNaN(d.getTime()) ? new Date() : d };
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
      const [updated] = await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key)).returning();
      return updated.value;
    }
    const [created] = await db.insert(settings).values({ key, value }).returning();
    return created.value;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  async resetAllOnlineStatus(): Promise<void> {
    await db.update(users).set({ isOnline: false, lastLogoutAt: new Date() });
  }

  async getEmployees(
    includeArchived = false,
    page = 1,
    limit = 50,
    all = false,
    allStatuses = false,
    search?: string,
  ): Promise<Employee[]> {
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(employees.isDeleted, false)];

    if (!allStatuses) {
      if (includeArchived) {
        conditions.push(notInArray(employees.currentStatus, ["على رأس عمله"]));
      } else {
        conditions.push(eq(employees.currentStatus, "على رأس عمله"));
      }
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(employees.fullName, s),
          ilike(employees.nationalId, s),
          ilike(employees.jobTitle, s),
          ilike(employees.mobile, s),
        ),
      );
    }

    const where = and(...conditions);

    if (all || allStatuses) {
      return await db.select().from(employees).where(where).orderBy(desc(employees.createdAt));
    }

    return await db.select().from(employees).where(where).limit(limit).offset(offset).orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(and(eq(employees.id, id), eq(employees.isDeleted, false)));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(employees).values(employee as any).returning();
    return created;
  }

  async updateEmployee(id: number, updates: Partial<InsertEmployee>): Promise<Employee> {
    const [updated] = await db.update(employees).set({ ...(updates as any), updatedAt: new Date() }).where(eq(employees.id, id)).returning();
    if (!updated) throw new Error("Employee not found");
    return updated;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.update(employees).set({ isDeleted: true, deletedAt: new Date() }).where(eq(employees.id, id));
  }

  async bulkCreateEmployees(data: InsertEmployee[]): Promise<{ created: Employee[]; duplicateNationalIds: string[] }> {
    if (data.length === 0) return { created: [], duplicateNationalIds: [] };

    const nationalIds = data.map(e => e.nationalId);

    const existing = await db
      .select({ nationalId: employees.nationalId })
      .from(employees)
      .where(inArray(employees.nationalId, nationalIds));

    const existingSet = new Set(existing.map(e => e.nationalId));
    const duplicateNationalIds = nationalIds.filter(id => existingSet.has(id));
    const toInsert = data.filter(e => !existingSet.has(e.nationalId));

    if (toInsert.length === 0) return { created: [], duplicateNationalIds };

    const created = await db.insert(employees).values(toInsert as any).returning();
    return { created, duplicateNationalIds };
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async bulkCreateAuditLogs(data: InsertAuditLog[]): Promise<void> {
    if (data.length === 0) return;
    await db.insert(auditLogs).values(data);
  }

  async getAuditLogs(
    page = 1,
    limit = 50,
    action?: string,
    search?: string,
  ): Promise<{ logs: { log: AuditLog; user: User | null }[]; total: number }> {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (action && action !== 'all') {
      conditions.push(eq(auditLogs.action, action));
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(auditLogs.entityType, s),
          ilike(auditLogs.entityId, s),
          ilike(auditLogs.action, s),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, logsResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(auditLogs).where(where),
      db
        .select()
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(where)
        .orderBy(desc(auditLogs.id))
        .limit(limit)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const logs = logsResult.map(l => ({ log: l.audit_logs, user: l.users }));
    return { logs, total };
  }

  async getAuditLogActionCounts(): Promise<Record<string, number>> {
    const result = await db
      .select({ action: auditLogs.action, count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .groupBy(auditLogs.action);
    return result.reduce((acc, r) => { acc[r.action] = Number(r.count); return acc; }, {} as Record<string, number>);
  }

  async clearAuditLogs(): Promise<void> {
    await db.delete(auditLogs);
  }

  async getEmployeeHistory(employeeId: string): Promise<{ log: AuditLog; user: User | null }[]> {
    const result = await db
      .select()
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(eq(auditLogs.entityType, 'EMPLOYEE'), eq(auditLogs.entityId, employeeId)))
      .orderBy(desc(auditLogs.id));
    return result.map(l => ({ log: l.audit_logs, user: l.users }));
  }

  async getApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByValue(keyValue: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyValue, keyValue));
    return key;
  }

  async createApiKey(data: InsertApiKey, keyValue: string): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values({ ...data, keyValue }).returning();
    return created;
  }

  async updateApiKey(id: number, updates: Partial<Pick<ApiKey, "isActive" | "description" | "expiryDate">>): Promise<ApiKey> {
    const [updated] = await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id)).returning();
    if (!updated) throw new Error("API key not found");
    return updated;
  }

  async deleteApiKey(id: number): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async getBotUsers(): Promise<BotUser[]> {
    return await db.select().from(botUsers).orderBy(desc(botUsers.id));
  }

  async getBotUser(id: number): Promise<BotUser | undefined> {
    const [user] = await db.select().from(botUsers).where(eq(botUsers.id, id));
    return user;
  }

  async getBotUserByPhone(phoneNumber: string): Promise<BotUser | undefined> {
    const [user] = await db.select().from(botUsers).where(eq(botUsers.phoneNumber, phoneNumber));
    return user;
  }

  async getBotUserByLid(lid: string): Promise<BotUser | undefined> {
    const [user] = await db.select().from(botUsers).where(eq(botUsers.whatsappLid, lid));
    return user;
  }

  async createBotUser(data: InsertBotUser): Promise<BotUser> {
    const [created] = await db.insert(botUsers).values(data).returning();
    return created;
  }

  async updateBotUser(id: number, updates: Partial<BotUser>): Promise<BotUser> {
    const [updated] = await db.update(botUsers).set(updates).where(eq(botUsers.id, id)).returning();
    if (!updated) throw new Error("Bot user not found");
    return updated;
  }

  async deleteBotUser(id: number): Promise<void> {
    await db.delete(botUsers).where(eq(botUsers.id, id));
  }

  async deactivateInactiveBotUsers(thresholdMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - thresholdMs);
    const result = await db
      .update(botUsers)
      .set({ isBotActive: false })
      .where(
        and(
          eq(botUsers.isBotActive, true),
          lt(botUsers.lastInteraction, cutoff)
        )
      )
      .returning({ id: botUsers.id });
    return result.length;
  }
}

export const storage = new DatabaseStorage();
