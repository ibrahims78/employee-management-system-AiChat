import { useEmployees } from "@/hooks/use-employees";
import { StatsCard } from "@/components/StatsCard";
import { Users, UserCheck, Briefcase, GraduationCap, ShieldCheck } from "lucide-react";
import { Layout } from "@/components/Layout";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { employees, isLoading: empLoading } = useEmployees();
  const { users, isLoading: usersLoading } = useUsers();
  const { user: currentUser } = useAuth();

  const isLoading = empLoading || usersLoading;

  if (isLoading) {
    return <Layout><div className="flex h-96 items-center justify-center">جاري التحميل...</div></Layout>;
  }

  const activeUsers = users?.filter(u => u.isOnline) || [];

  // Calculate Stats
  const totalEmployees = employees.length;
  const categoryFirst = employees.filter(e => e.category === "أولى").length;
  const categorySecond = employees.filter(e => e.category === "ثانية").length;
  const categoryThird = employees.filter(e => e.category === "ثالثة").length;
  const categoryFourth = employees.filter(e => e.category === "رابعة").length;

  // Chart Data: Status Distribution
  const statusCounts = employees.reduce((acc, curr) => {
    acc[curr.currentStatus] = (acc[curr.currentStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#ef4444', '#8b5cf6'];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="mt-2 text-muted-foreground">نظرة عامة على إحصائيات الموظفين والوضع الوظيفي</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard 
          title="إجمالي الموظفين" 
          value={totalEmployees} 
          icon={Users} 
          color="blue"
          description="جميع الموظفين النشطين"
        />
        <StatsCard 
          title="الفئة الأولى" 
          value={categoryFirst} 
          icon={GraduationCap} 
          color="green"
          description="حملة الشهادات الجامعية"
        />
        <StatsCard 
          title="الفئة الثانية" 
          value={categorySecond} 
          icon={Briefcase} 
          color="orange"
          description="المعاهد التقنية"
        />
        <StatsCard 
          title="الفئة الثالثة" 
          value={categoryThird} 
          icon={UserCheck} 
          color="blue"
          description="الشهادة الثانوية"
        />
        <StatsCard 
          title="الفئة الرابعة" 
          value={categoryFourth} 
          icon={UserCheck} 
          color="red"
          description="الخدمات والمهن"
        />
      </div>

      {currentUser?.role === 'admin' && (
        <div className="mt-6">
          <StatsCard 
            title="المستخدمين النشطين" 
            value={activeUsers.length} 
            icon={ShieldCheck} 
            color="blue"
            description="مستخدمين مسجلين دخول حالياً"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>توزع الموظفين حسب الوضع الحالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Additions or other chart could go here */}
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>آخر الموظفين المضافين</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {employees.slice(0, 5).reverse().map((emp) => (
                <div key={emp.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-medium">{emp.fullName}</span>
                    <span className="text-xs text-muted-foreground">{emp.jobTitle}</span>
                  </div>
                  <div className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                    {emp.currentStatus}
                  </div>
                </div>
              ))}
              {employees.length === 0 && <p className="text-center text-muted-foreground">لا يوجد موظفين</p>}
             </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
