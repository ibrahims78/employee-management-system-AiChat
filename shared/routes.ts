import { z } from 'zod';
import { insertEmployeeSchema, employees, users, auditLogs, insertUserSchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ user: z.custom<typeof users.$inferSelect>() }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: { 200: z.object({ message: z.string() }) },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: { 
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  employees: {
    list: {
      method: 'GET' as const,
      path: '/api/employees' as const,
      input: z.object({ 
        includeArchived: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/employees/:id' as const,
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/employees' as const,
      input: insertEmployeeSchema,
      responses: {
        201: z.custom<typeof employees.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/employees/:id' as const,
      input: insertEmployeeSchema.partial(),
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/employees/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    deleteAttachment: {
      method: 'DELETE' as const,
      path: '/api/employees/:id/attachments/:index' as const,
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        400: errorSchemas.validation,
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id' as const,
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  auditLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/audit-logs' as const,
      responses: {
        200: z.array(z.object({
          log: z.custom<typeof auditLogs.$inferSelect>(),
          user: z.custom<typeof users.$inferSelect>().nullable(),
        })),
      },
    }
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings/:key' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'POST' as const,
      path: '/api/settings' as const,
      input: z.object({ key: z.string(), value: z.any() }),
      responses: {
        200: z.any(),
        403: errorSchemas.unauthorized,
      },
    },
    backup: {
      method: 'POST' as const,
      path: '/api/settings/backup' as const,
      responses: {
        200: z.object({ message: z.string(), filename: z.string() }),
        403: errorSchemas.unauthorized,
      },
    },
    listBackups: {
      method: 'GET' as const,
      path: '/api/settings/backups' as const,
      responses: {
        200: z.array(z.object({
          filename: z.string(),
          size: z.number(),
          createdAt: z.string(),
        })),
        403: errorSchemas.unauthorized,
      },
    },
    restoreBackup: {
      method: 'POST' as const,
      path: '/api/settings/backup/restore' as const,
      input: z.object({ filename: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        403: errorSchemas.unauthorized,
      },
    },
    deleteBackup: {
      method: 'DELETE' as const,
      path: '/api/settings/backups/:filename' as const,
      responses: {
        200: z.object({ message: z.string() }),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
