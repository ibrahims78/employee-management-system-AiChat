import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Employee, type InsertEmployee, type UpdateEmployeeRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Helper to build URL with query params
function buildUrl(path: string, params?: Record<string, any>) {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

export function useEmployees(includeArchived?: boolean) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['/api/employees', { includeArchived, all: true }],
    queryFn: async () => {
      // جلب جميع الموظفين بدون حد للصفحة (all=true) مع احترام فلتر الأرشفة
      const url = buildUrl('/api/employees', {
        includeArchived: includeArchived ? 'true' : undefined,
        all: 'true',
      });
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return await res.json() as Employee[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: (InsertEmployee & { documents?: File[] }) | FormData) => {
      let body: FormData;
      if (data instanceof FormData) {
        body = data;
      } else {
        body = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (key === 'documents' && Array.isArray(value)) {
            value.forEach(file => body.append('documents', file));
          } else if (value !== undefined && value !== null) {
            if (value instanceof Date) {
              body.append(key, value.toISOString());
            } else {
              body.append(key, String(value));
            }
          }
        });
      }

      const res = await fetch('/api/employees', {
        method: 'POST',
        body,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create employee");
      }
      return await res.json() as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({ title: "تمت العملية بنجاح", description: "تمت إضافة الموظف الجديد" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateEmployeeRequest & { documents?: File[] } | FormData }) => {
      let body: FormData;
      if (data instanceof FormData) {
        body = data;
      } else {
        body = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (key === 'documents' && Array.isArray(value)) {
            value.forEach(file => body.append('documents', file));
          } else if (value !== undefined && value !== null) {
            if (value instanceof Date) {
              body.append(key, value.toISOString());
            } else {
              body.append(key, String(value));
            }
          }
        });
      }

      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        body,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update employee");
      }
      return await res.json() as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({ title: "تمت العملية بنجاح", description: "تم تحديث بيانات الموظف" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete employee");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({ title: "تمت العملية بنجاح", description: "تم حذف الموظف نهائياً" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  return {
    employees,
    isLoading,
    createEmployee: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateEmployee: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteEmployee: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deleteAttachment: useMutation({
      mutationFn: async ({ id, index }: { id: number; index: string | number }) => {
        const res = await fetch(`/api/employees/${id}/attachments/${index}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to delete attachment");
        }
        return await res.json() as Employee;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
        toast({ title: "تمت العملية بنجاح", description: "تم حذف المرفق" });
      },
      onError: (err: Error) => {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      },
    }).mutate,
  };
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: ['/api/employees', id],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) throw new Error("Failed to fetch employee");
      return await res.json() as Employee;
    },
    enabled: !!id,
  });
}
