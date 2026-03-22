import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type BotUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useBotUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: botUsers = [], isLoading } = useQuery({
    queryKey: ["/api/bot-users"],
    queryFn: async () => {
      const res = await fetch("/api/bot-users");
      if (!res.ok) throw new Error("Failed to fetch bot users");
      return (await res.json()) as BotUser[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      fullName: string;
      phoneNumber: string;
      activationCode: string;
      deactivationCode: string;
    }) => {
      const res = await fetch("/api/bot-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "فشل إنشاء مستخدم البوت");
      }
      return (await res.json()) as BotUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-users"] });
      toast({ title: "تمت العملية بنجاح", description: "تم إضافة مستخدم البوت" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BotUser> }) => {
      const res = await fetch(`/api/bot-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "فشل تحديث مستخدم البوت");
      }
      return (await res.json()) as BotUser;
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/bot-users"] });

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData<BotUser[]>(["/api/bot-users"]);

      // Optimistically update the cache
      queryClient.setQueryData<BotUser[]>(["/api/bot-users"], (old = []) =>
        old.map((bu) => (bu.id === id ? { ...bu, ...data } : bu)),
      );

      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      // Rollback on error
      if (ctx?.previous) {
        queryClient.setQueryData(["/api/bot-users"], ctx.previous);
      }
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
    onSuccess: (_result, { data }) => {
      // Only show toast for non-toggle updates (i.e. form edits)
      if (!("isBotActive" in data) && !("resetLid" in data)) {
        toast({ title: "تمت العملية بنجاح", description: "تم تحديث بيانات مستخدم البوت" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/bot-users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bot-users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل حذف مستخدم البوت");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-users"] });
      toast({ title: "تمت العملية بنجاح", description: "تم حذف مستخدم البوت" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  return {
    botUsers,
    isLoading,
    createBotUser: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateBotUser: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteBotUser: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
