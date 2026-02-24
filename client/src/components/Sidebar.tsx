import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Users, UserCog, FileText, LayoutDashboard, LogOut, 
  Building2, ChevronRight, ChevronLeft, Sun, Moon,
  ShieldCheck, LayoutGrid, Settings
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/employees", label: "إدارة الموظفين", icon: Users },
  ];

  if (user?.role === 'admin') {
    navItems.push({ href: "/users", label: "إدارة المستخدمين", icon: UserCog });
    navItems.push({ href: "/audit-logs", label: "سجل العمليات", icon: FileText });
    navItems.push({ href: "/settings", label: "الإعدادات", icon: Settings });
  }

  return (
    <div className={cn(
      "relative flex h-screen flex-col border-l bg-card text-card-foreground shadow-xl z-50 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-72"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-3 top-8 h-6 w-6 rounded-full border bg-background shadow-md z-50 hover:scale-110 transition-all"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </Button>

      {/* Brand Header */}
      <div className="flex h-20 items-center px-4 mb-4">
        <div className={cn("flex items-center gap-3 w-full transition-all", isCollapsed && "justify-center")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="h-6 w-6" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-black tracking-tight text-foreground truncate">ذاتية الموظفين</h1>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">المكتب الهندسي</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
        <nav className="flex flex-col gap-1">
          {!isCollapsed && (
            <span className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
              القائمة الرئيسية
            </span>
          )}
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center px-0"
                )}>
                  {isActive && <div className="absolute inset-y-1.5 right-0 w-1 bg-primary rounded-l-full" />}
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-all", isActive ? "text-primary" : "group-hover:scale-110")} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions */}
      <div className="mt-auto p-3 space-y-2 border-t bg-muted/5">
        <div className={cn("flex flex-col gap-1", isCollapsed && "items-center")}>
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "w-full justify-start gap-3 rounded-lg hover:bg-primary/10 hover:text-primary transition-all px-3",
              isCollapsed && "justify-center px-0"
            )}
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-orange-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            {!isCollapsed && <span>{theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}</span>}
          </Button>

          {/* Logout */}
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "w-full justify-start gap-3 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive transition-all px-3",
              isCollapsed && "justify-center px-0"
            )}
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </Button>
        </div>

        <Separator className="my-2 opacity-50" />

        {/* User Profile Info */}
        <div className={cn(
          "flex items-center gap-3 p-1.5 transition-all",
          isCollapsed ? "justify-center" : "bg-muted/20 rounded-xl"
        )}>
          <Avatar className={cn("border-2 border-background shadow-sm", isCollapsed ? "h-8 w-8" : "h-10 w-10")}>
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {user?.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-bold text-foreground">{user?.username}</span>
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary opacity-70" />
                <span className="truncate text-[10px] font-semibold text-muted-foreground">
                  {user?.role === 'admin' ? 'مدير النظام' : 'موظف'}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <div className="pt-2 text-center">
            <p className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-tighter italic">
              بواسطة: إبراهيم الصيداوي
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
