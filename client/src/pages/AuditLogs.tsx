import { useAuditLogs } from "@/hooks/use-audit-logs";
import { Layout } from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default function AuditLogs() {
  const { data: logs, isLoading } = useAuditLogs();

  if (isLoading) return <Layout><div className="p-8 text-center">جاري تحميل السجلات...</div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">سجل العمليات</h1>
        <p className="mt-2 text-muted-foreground">تتبع جميع التغييرات التي تمت على النظام</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right">المستخدم</TableHead>
              <TableHead className="text-right">العملية</TableHead>
              <TableHead className="text-right">نوع الكائن</TableHead>
              <TableHead className="text-right">التاريخ والوقت</TableHead>
              <TableHead className="text-center">التفاصيل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map(({ log, user }) => (
              <TableRow key={log.id} className="hover:bg-muted/20">
                <TableCell className="font-medium">
                  {user ? user.username : <span className="text-muted-foreground italic">مستخدم محذوف</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    log.action === 'CREATE' ? 'default' : 
                    log.action === 'UPDATE' ? 'secondary' : 
                    log.action === 'LOGIN' || log.action === 'LOGOUT' ? 'outline' : 'destructive'
                  }>
                    {log.action === 'CREATE' ? 'إنشاء' : 
                     log.action === 'UPDATE' ? 'تعديل' :
                     log.action === 'LOGIN' ? 'دخول' :
                     log.action === 'LOGOUT' ? 'خروج' : 'حذف'}
                  </Badge>
                </TableCell>
                <TableCell>{log.entityType}</TableCell>
                <TableCell className="text-sm text-muted-foreground" dir="ltr">
                  {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm')}
                </TableCell>
                <TableCell className="text-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        عرض
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-2xl rounded-xl">
                      <DialogHeader>
                        <DialogTitle>تفاصيل التغيير</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                          <h4 className="font-bold text-lg mb-2 text-primary border-b pb-2">ملخص التغيير</h4>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {(() => {
                              if (log.action === 'CREATE') return "تم إنشاء سجل جديد بالكامل.";
                              if (log.action === 'DELETE') return "تم حذف السجل من النظام.";
                              
                              const oldV = log.oldValues as any || {};
                              const newV = log.newValues as any || {};
                              const changes = [];
                              
                              const fieldNames: Record<string, string> = {
                                fullName: "الاسم الكامل",
                                fatherName: "اسم الأب",
                                motherName: "اسم الأم",
                                placeOfBirth: "مكان الولادة",
                                dateOfBirth: "تاريخ الولادة",
                                nationalId: "الرقم الوطني",
                                jobTitle: "الصفة الوظيفية",
                                currentStatus: "الوضع الحالي",
                                assignedWork: "العمل المكلف به",
                                mobile: "رقم الجوال",
                                address: "العنوان",
                                appointmentDecisionNumber: "رقم قرار التعيين",
                                appointmentDecisionDate: "تاريخ قرار التعيين",
                                firstStateStart: "أول مباشرة بالدولة",
                                firstDirectorateStart: "أول مباشرة بالمديرية",
                                firstDepartmentStart: "أول مباشرة بالقسم",
                                loginTime: "وقت تسجيل الدخول",
                                logoutTime: "وقت تسجيل الخروج"
                              };

                              for (const key in newV) {
                                if (JSON.stringify(oldV[key]) !== JSON.stringify(newV[key])) {
                                  const name = fieldNames[key] || key;
                                  if (key === 'loginTime') {
                                    changes.push(`وقت تسجيل الدخول: ${format(new Date(newV[key]), 'HH:mm:ss')}`);
                                    continue;
                                  }
                                  if (key === 'logoutTime') {
                                    changes.push(`وقت تسجيل الخروج: ${format(new Date(newV[key]), 'HH:mm:ss')}`);
                                    continue;
                                  }
                                  changes.push(`تغيير ${name} من (${oldV[key] || 'فارغ'}) إلى (${newV[key] || 'فارغ'})`);
                                }
                              }
                              
                              return changes.length > 0 ? changes.join("\n") : "لم يتم تغيير أي قيم جوهرية.";
                            })()}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4" dir="ltr">
                          <div className="rounded-lg border p-4 bg-muted/30">
                            <h4 className="font-bold mb-2 text-red-600">القيمة القديمة (JSON)</h4>
                            <ScrollArea className="h-[200px] w-full rounded-md border p-2 bg-white text-xs">
                              <pre>{JSON.stringify(log.oldValues, null, 2)}</pre>
                            </ScrollArea>
                          </div>
                          <div className="rounded-lg border p-4 bg-muted/30">
                            <h4 className="font-bold mb-2 text-green-600">القيمة الجديدة (JSON)</h4>
                            <ScrollArea className="h-[200px] w-full rounded-md border p-2 bg-white text-xs">
                              <pre>{JSON.stringify(log.newValues, null, 2)}</pre>
                            </ScrollArea>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
             {logs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    لا توجد سجلات
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}
