import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { type LoginRequest, type User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;

// Module-level singleton — shared across all useAuth() instances
// so only one interval ever fires regardless of how many components call useAuth()
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// Mutable callback refs updated on every render to stay fresh
let _onUnauthorized: (() => void) | null = null;
let _onRefresh: ((user: User) => void) | null = null;

function ensureHeartbeat() {
  if (_heartbeatTimer !== null) return;
  _heartbeatTimer = setInterval(async () => {
    try {
      const res = await fetch("/api/auth/heartbeat", {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        clearHeartbeat();
        _onUnauthorized?.();
      } else if (res.ok) {
        const data = await res.json();
        _onRefresh?.(data.user);
      }
    } catch {
      // Silent — network errors shouldn't log out the user
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function clearHeartbeat() {
  if (_heartbeatTimer !== null) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
  _onUnauthorized = null;
  _onRefresh = null;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Keep a ref so cleanup knows if THIS instance started the heartbeat
  const isOwnerRef = useRef(false);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return (await res.json()) as User;
    },
    retry: false,
  });

  useEffect(() => {
    if (user) {
      // Always update callbacks to keep them fresh (avoid stale closures)
      _onUnauthorized = () => {
        queryClient.setQueryData(["/api/auth/me"], null);
        setLocation("/login");
        toast({
          title: "انتهت الجلسة",
          description: "تم تسجيل خروجك تلقائياً. يرجى تسجيل الدخول من جديد.",
          variant: "destructive",
        });
      };
      _onRefresh = (freshUser: User) => {
        queryClient.setQueryData(["/api/auth/me"], freshUser);
      };
      ensureHeartbeat();
      isOwnerRef.current = true;
    } else {
      // If this instance owns the heartbeat and user is now null, stop it
      if (isOwnerRef.current) {
        clearHeartbeat();
        isOwnerRef.current = false;
      }
    }
  }, [!!user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest & { apiKey: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data.user);
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `أهلاً بك، ${data.user.username}`,
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      clearHeartbeat();
      isOwnerRef.current = false;
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      setLocation("/login");
      toast({
        title: "تم تسجيل الخروج",
        description: "إلى اللقاء!",
      });
    },
    onError: () => {
      clearHeartbeat();
      isOwnerRef.current = false;
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      setLocation("/login");
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    logoutMutation,
  };
}
