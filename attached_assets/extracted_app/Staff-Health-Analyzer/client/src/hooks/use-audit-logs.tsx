import { useQuery } from "@tanstack/react-query";
import { type AuditLog, type User } from "@shared/schema";

interface AuditLogEntry {
  log: AuditLog;
  user: User | null;
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ['/api/audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/audit-logs');
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return await res.json() as AuditLogEntry[];
    },
  });
}
