import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock, User } from "lucide-react";
import { Redirect } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isLoggingIn, user } = useAuth();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  function onSubmit(data: LoginFormValues) {
    login(data);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 font-[Tajawal]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      
      <Card className="w-full max-w-md border-primary/10 shadow-2xl shadow-primary/5 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        
        <CardHeader className="space-y-4 pb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25 transform transition-transform hover:scale-105">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">برنامج ذاتية الموظفين في المكتب الهندسي</CardTitle>
            <CardDescription className="text-muted-foreground/80">أدخل بيانات الدخول للمتابعة</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 font-semibold">اسم المستخدم</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input className="pr-9 border-primary/20 focus:border-primary transition-all bg-background/50" placeholder="admin" autoComplete="username" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 font-semibold">كلمة المرور</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input className="pr-9 border-primary/20 focus:border-primary transition-all bg-background/50" type="password" placeholder="••••••" autoComplete="current-password" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full text-base font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]" 
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "جاري الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t border-primary/10 text-center">
            <p className="text-xs text-muted-foreground/60 font-medium tracking-wide uppercase flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-primary/20" />
              تصميم وتطوير المبرمج
              <span className="h-px w-8 bg-primary/20" />
            </p>
            <p className="mt-2 text-sm font-bold text-primary/80 hover:text-primary transition-colors cursor-default">
              إبراهيم الصيداوي
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
