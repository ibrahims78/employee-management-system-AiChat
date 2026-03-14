import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { Users, UserCheck, Briefcase, GraduationCap, ShieldCheck, UserX, UserMinus, Send, Paperclip } from "lucide-react";
import { Layout } from "@/components/Layout";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import type { Employee } from "@shared/schema";

const ALL_STATUSES = ['على رأس عمله', 'إجازة بلا أجر', 'نقل', 'استقالة'];

// تطبيع نص الوضع الوظيفي لمعالجة الاختلافات الإملائية في قاعدة البيانات
// (مثل: "إجازة بلا اجر" و "إجازة بلا أجر" تُعامَلان كوضع واحد)
function normalizeStatus(status: string): string {
  const s = status.trim();
  if (s === 'إجازة بلا اجر' || s === 'اجازة بلا اجر' || s === 'اجازة بلا أجر') return 'إجازة بلا أجر';
  if (s === 'على رأس عمله' || s === 'على راس عمله') return 'على رأس عمله';
  if (s === 'استقاله') return 'استقالة';
  return s;
}

const STATUS_COLORS: Record<string, string> = {
  'على رأس عمله': '#22c55e',
  'إجازة بلا أجر': '#f97316',
  'نقل': '#0ea5e9',
  'استقالة': '#ef4444',
};

const STATUS_ICONS: Record<string, any> = {
  'على رأس عمله': UserCheck,
  'إجازة بلا أجر': UserMinus,
  'نقل': Send,
  'استقالة': UserX,
};

const CHART_COLORS = ['#22c55e', '#f97316', '#0ea5e9', '#ef4444', '#8b5cf6', '#ec4899'];

function DashboardSkeleton() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border bg-card p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <Skeleton className="h-5 w-28 mb-3" />
              <Skeleton className="h-[150px] w-full rounded-lg" />
            </div>
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function Dashboard() {
  const { data: allEmployees = [], isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees', { allStatuses: true }],
    queryFn: async () => {
      const res = await fetch('/api/employees?allStatuses=true', { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
  });

  const { users, isLoading: usersLoading } = useUsers();
  const { user: currentUser } = useAuth();
  const isLoading = empLoading || usersLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const activeUsers = users?.filter(u => u.isOnline) || [];

  const totalEmployees = allEmployees.length;
  const categoryFirst = allEmployees.filter(e => e.category === "أولى").length;
  const categorySecond = allEmployees.filter(e => e.category === "ثانية").length;
  const categoryThird = allEmployees.filter(e => e.category === "ثالثة").length;
  const categoryFourth = allEmployees.filter(e => e.category === "رابعة").length;
  const withFiles = allEmployees.filter(e => Array.isArray(e.documentPaths) && (e.documentPaths as string[]).length > 0).length;

  const statusCounts = allEmployees.reduce((acc, emp) => {
    const status = normalizeStatus(emp.currentStatus || 'غير محدد');
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const status of ALL_STATUSES) {
    if (!(status in statusCounts)) {
      statusCounts[status] = 0;
    }
  }

  const orderedStatuses = [
    ...ALL_STATUSES,
    ...Object.keys(statusCounts).filter(s => !ALL_STATUSES.includes(s)),
  ].filter(status => statusCounts[status] > 0);

  const chartData = orderedStatuses
    .filter(status => statusCounts[status] > 0)
    .map(status => ({ name: status, value: statusCounts[status] }));

  const maleCount = allEmployees.filter(e => e.gender === 'ذكر').length;
  const femaleCount = allEmployees.filter(e => e.gender === 'أنثى').length;
  const genderData = [
    { name: 'ذكر', value: maleCount },
    { name: 'أنثى', value: femaleCount },
  ].filter(d => d.value > 0);

  const recentEmployees = [...allEmployees].slice(0, 6);

  const specializationCounts = allEmployees.reduce((acc, emp) => {
    const spec = emp.specialization || 'غير محدد';
    acc[spec] = (acc[spec] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSpecializations = Object.entries(specializationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, value, fullName: name }));

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">لوحة التحكم</h1>
          <p className="mt-1 text-muted-foreground font-medium">نظرة شاملة على إحصائيات الموظفين والوضع الوظيفي</p>
        </div>

        {/* إحصائيات رئيسية */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatsCard
            title="إجمالي الموظفين"
            value={totalEmployees}
            icon={Users}
            color="blue"
            description="جميع الموظفين المسجلين"
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
          <StatsCard
            title="لديهم ملفات"
            value={withFiles}
            icon={Paperclip}
            color="green"
            description="موظفون بمستندات مرفوعة"
          />
        </div>

        {/* توزع الموظفين حسب الوضع الحالي */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">توزع الموظفين حسب الوضع الحالي</h2>
            <span className="text-sm text-muted-foreground">
              إجمالي: <span className="font-bold text-foreground">{totalEmployees}</span> موظف
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {orderedStatuses.map((status) => {
              const count = statusCounts[status] || 0;
              const Icon = STATUS_ICONS[status] || UserCheck;
              const color = STATUS_COLORS[status] || '#8b5cf6';
              const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
              return (
                <Card
                  key={status}
                  className={`border-border/50 shadow-sm hover:shadow-md transition-shadow ${count === 0 ? 'opacity-60' : ''}`}
                >
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-3xl font-black" style={{ color }}>{count}</span>
                    </div>
                    <p className="font-bold text-sm text-foreground">{status}</p>
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {count === 0 ? 'لا يوجد موظفون' : `${pct}% من الإجمالي`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* الرسوم البيانية */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold">الرسم البياني لتوزع الأوضاع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value + ' موظف', name]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'inherit' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-2">
                    <Users className="h-10 w-10 opacity-20" />
                    <p>لا يوجد موظفون مسجلون بعد</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-lg border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">توزع الجنس</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[150px]">
                  {genderData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={genderData} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          <Cell fill="#0ea5e9" />
                          <Cell fill="#ec4899" />
                        </Pie>
                        <Tooltip formatter={(v: number, n: string) => [v + ' موظف', n]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {currentUser?.role === 'admin' && (
              <Card className="shadow-lg border-border/50">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-blue-600">{activeUsers.length}</p>
                      <p className="text-sm font-bold text-foreground">مستخدم نشط حالياً</p>
                      <p className="text-xs text-muted-foreground">مسجّلون دخول الآن</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* توزع الاختصاصات */}
        {topSpecializations.length > 0 && (
          <Card className="shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold">توزع الموظفين حسب الاختصاص (أعلى 7)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSpecializations} layout="vertical" margin={{ right: 30, left: 8, top: 4, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, textAnchor: 'end' }} />
                    <Tooltip
                      formatter={(value: number, _name: string, props: any) => [value + ' موظف', props.payload?.fullName || '']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'inherit' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                      {topSpecializations.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* آخر الموظفين */}
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold">آخر الموظفين المضافين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {recentEmployees.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">لا يوجد موظفون مسجلون بعد</p>
              ) : (
                recentEmployees.map(emp => {
                  const empStatus = normalizeStatus(emp.currentStatus || '');
                  const statusColor = STATUS_COLORS[empStatus] || '#8b5cf6';
                  return (
                    <div key={emp.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {emp.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{emp.fullName}</p>
                          <p className="text-xs text-muted-foreground">{emp.jobTitle || emp.specialization || '—'}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-bold shrink-0"
                        style={{ borderColor: statusColor + '60', color: statusColor, backgroundColor: statusColor + '15' }}
                      >
                        {empStatus || '—'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
