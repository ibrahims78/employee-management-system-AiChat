import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { type LoginRequest, type User } from "@shared/schema";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes (session timeout is 10 min)

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json() as User;
    },
    retry: false,
  });

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/heartbeat', { method: 'POST', credentials: 'include' });
        if (res.status === 401) {
          stopHeartbeat();
          queryClient.setQueryData(['/api/auth/me'], null);
          setLocation("/login");
          toast({
            title: "انتهت الجلسة",
            description: "تم تسجيل خروجك تلقائياً. يرجى تسجيل الدخول من جديد.",
            variant: "destructive",
          });
        } else if (res.ok) {
          const data = await res.json();
          queryClient.setQueryData(['/api/auth/me'], data.user);
        }
      } catch {
        // Silent — network errors shouldn't log out the user
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  // Start heartbeat when user is authenticated, stop when logged out
  useEffect(() => {
    if (user) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }
    return () => stopHeartbeat();
  }, [!!user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Login failed');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data.user);
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
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      stopHeartbeat();
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
      setLocation("/login");
      toast({
        title: "تم تسجيل الخروج",
        description: "إلى اللقاء!",
      });
    },
    onError: () => {
      // Force logout on client even if server fails
      stopHeartbeat();
      queryClient.setQueryData(['/api/auth/me'], null);
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
