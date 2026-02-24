import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-row bg-background font-[Tajawal] text-foreground" dir="rtl">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto bg-muted/10">
        <div className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
        <footer className="py-4 text-center border-t border-border/50 bg-background/50 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground">
            برنامج ذاتية الموظفين - تصميم المبرمج: <span className="font-bold text-primary italic">إبراهيم الصيداوي</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
