import { useState, useCallback } from "react";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { Layout } from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Eye, Trash2, AlertTriangle, ClipboardList, Loader2, Search,
  LogIn, LogOut, UserPlus, UserPen, UserMinus, FilePlus, FilePen,
  FileX, Paperclip, DatabaseBackup, ArchiveRestore, Archive, Filter,
  ChevronRight, ChevronLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACTION_META: Record<string, { label: string; color: string; icon: any; description: string }> = {
  CREATE:            { label: 'إضافة',        color: 'bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400',     icon: FilePlus,       description: 'إضافة سجل جديد' },
  UPDATE:            { label: 'تعديل',        color: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',         icon: FilePen,        description: 'تعديل بيانات سجل' },
  DELETE:            { label: 'حذف',          color: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400',             icon: FileX,          description: 'حذف سجل' },
  DELETE_ATTACHMENT: { label: 'حذف مرفق',     color: 'bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400',         icon: Paperclip,      description: 'حذف مرفق من ملف الموظف' },
  LOGIN:             { label: 'تسجيل دخول',   color: 'bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-400', icon: LogIn,          description: 'دخول المستخدم إلى النظام' },
  LOGOUT:            { label: 'تسجيل خروج',   color: 'bg-gray-500/15 text-gray-600 border-gray-400/30',                           icon: LogOut,         description: 'خروج المستخدم من النظام' },
  IMPORT:            { label: 'استيراد',      color: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-400',         icon: Archive,        description: 'استيراد بيانات من Excel' },
  BACKUP_CREATED:    { label: 'نسخ احتياطي',  color: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-400', icon: DatabaseBackup, description: 'إنشاء نسخة احتياطية' },
  BACKUP_RESTORED:   { label: 'استعادة نسخة', color: 'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400', icon: ArchiveRestore, description: 'استعادة نسخة احتياطية' },
  BACKUP_DELETED:    { label: 'حذف نسخة',     color: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',    icon: Trash2,         description: 'حذف نسخة احتياطية' },
  RESTORE:           { label: 'استعادة',      color: 'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400', icon: ArchiveRestore, description: 'استعادة بيانات' },
};

const ENTITY_LABELS: Record<string, string> = {
  EMPLOYEE: 'موظف', USER: 'مستخدم', SETTING: 'إعداد', BACKUP: 'نسخة احتياطية', SYSTEM: 'النظام',
};

const FIELD_NAMES: Record<string, string> = {
  fullName: "الاسم الكامل", fatherName: "اسم الأب", motherName: "اسم الأم",
  placeOfBirth: "مكان الولادة", dateOfBirth: "تاريخ الولادة", nationalId: "الرقم الوطني",
  shamCashNumber: "رقم شام كاش", jobTitle: "الصفة الوظيفية", currentStatus: "الوضع الحالي",
  category: "الفئة", employmentStatus: "الوضع الوظيفي", specialization: "الاختصاص",
  assignedWork: "العمل المكلف به", mobile: "رقم الجوال", address: "العنوان",
  notes: "ملاحظات", certificate: "الشهادة", certificateType: "نوع الشهادة",
  appointmentDecisionNumber: "رقم قرار التعيين", appointmentDecisionDate: "تاريخ قرار التعيين",
  firstStateStart: "أول مباشرة بالدولة", firstDirectorateStart: "أول مباشرة بالمديرية",
  firstDepartmentStart: "أول مباشرة بالقسم", gender: "الجنس",
  registryPlaceAndNumber: "محل ورقم القيد", loginTime: "وقت الدخول",
  logoutTime: "وقت الخروج", username: "اسم المستخدم", role: "الصلاحية",
  isDeleted: "محذوف", documentPaths: "المرفقات", password: "كلمة المرور",
};

function buildChangeSummary(action: string, oldV: any, newV: any): string {
  if (action === 'LOGIN')          return `تسجيل دخول إلى النظام${newV?.loginTime ? ' في ' + format(new Date(newV.loginTime), 'HH:mm:ss') : ''}`;
  if (action === 'LOGOUT')         return `تسجيل خروج من النظام${newV?.logoutTime ? ' في ' + format(new Date(newV.logoutTime), 'HH:mm:ss') : ''}`;
  if (action === 'BACKUP_CREATED') return `تم إنشاء نسخة احتياطية${newV?.filename ? ': ' + newV.filename : ''}`;
  if (action === 'BACKUP_RESTORED')return `تمت استعادة نسخة احتياطية${newV?.filename ? ': ' + newV.filename : ''}`;
  if (action === 'BACKUP_DELETED') return `تم حذف نسخة احتياطية${newV?.filename ? ': ' + newV.filename : ''}`;
  if (action === 'RESTORE')        return 'تمت استعادة النسخة الاحتياطية';
  if (action === 'DELETE_ATTACHMENT') return `تم حذف مرفق${oldV?.path ? ': ' + oldV.path.split('/').pop() : ''}`;
  if (action === 'CREATE') {
    if (newV?.source === 'excel_import') return `استيراد موظف من Excel: ${newV?.fullName || ''}`;
    const name = newV?.fullName || newV?.username || '';
    return `تمت إضافة سجل جديد${name ? ': ' + name : ''}`;
  }
  if (action === 'DELETE') {
    const name = oldV?.fullName || oldV?.username || newV?.fullName || '';
    return `تم حذف${name ? ': ' + name : ' السجل'}`;
  }
  const old = oldV || {};
  const nw = newV || {};
  const skip = new Set(['updatedAt', 'createdAt', 'id', 'isDeleted', 'deletedAt']);
  const changes: string[] = [];
  for (const key of Object.keys(nw)) {
    if (skip.has(key)) continue;
    if (JSON.stringify(old[key]) !== JSON.stringify(nw[key])) {
      if (key === 'documentPaths') { changes.push('تحديث المرفقات'); continue; }
      if (key === 'password')      { changes.push('تغيير كلمة المرور'); continue; }
      const label = FIELD_NAMES[key] || key;
      const from  = old[key] !== undefined && old[key] !== null && old[key] !== '' ? String(old[key]) : 'فارغ';
      const to    = nw[key]  !== undefined && nw[key]  !== null && nw[key]  !== '' ? String(nw[key])  : 'فارغ';
      changes.push(`${label}: "${from}" ← "${to}"`);
    }
  }
  return changes.length > 0 ? changes.join('\n') : 'لم يتم تغيير أي بيانات جوهرية';
}

function getEntityLabel(entityType: string) { return ENTITY_LABELS[entityType] || entityType; }
function getActionMeta(action: string) {
  return ACTION_META[action] || { label: action, color: 'bg-gray-100 text-gray-700 border-gray-300', icon: ClipboardList, description: 'عملية غير معروفة' };
}

const ITEMS_PER_PAGE = 50;

export default function AuditLogs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // حالة الفلترة والتصفح — تُرسل للخادم
  const [page, setPage]           = useState(1);
  const [filterAction, setFilterAction] = useState('all');
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState(''); // للـ debounce
  const [confirmClear, setConfirmClear] = useState(false);

  const { data, isLoading, isFetching } = useAuditLogs(page, ITEMS_PER_PAGE, filterAction, search);

  const logs        = data?.logs || [];
  const total       = data?.total || 0;
  const totalPages  = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const actionCounts = data?.actionCounts || {};

  // عند تغيير الفلتر أو البحث، أعد من الصفحة الأولى
  const handleActionFilter = useCallback((val: string) => {
    setFilterAction(val);
    setPage(1);
  }, []);

  const handleSearch = useCallback((val: string) => {
    setSearchInput(val);
    // debounce بسيط: إرسال البحث بعد توقف المستخدم عن الكتابة
    clearTimeout((handleSearch as any)._timer);
    (handleSearch as any)._timer = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }, []);

  const clearFilters = () => {
    setSearch(''); setSearchInput(''); setFilterAction('all'); setPage(1);
  };

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/audit-logs', { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { const err = await res.json().catch(() => ({ message: 'خطأ في المسح' })); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs'] });
      toast({ title: 'تم مسح سجل العمليات بنجاح' });
      setConfirmClear(false);
      setPage(1);
    },
    onError: (e: any) => { toast({ title: 'فشل المسح', description: e.message, variant: 'destructive' }); },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>جاري تحميل السجلات...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">سجل العمليات</h1>
            <p className="mt-1 text-muted-foreground font-medium">
              تتبع جميع التغييرات والإجراءات التي تمت على النظام
              {total > 0 && (
                <span className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {total} عملية مسجّلة
                </span>
              )}
            </p>
          </div>
          {user?.role === 'admin' && (
            <Button
              variant="destructive"
              className="gap-2 font-bold shrink-0"
              onClick={() => setConfirmClear(true)}
              disabled={total === 0}
              data-testid="btn-clear-audit-logs"
            >
              <Trash2 className="h-4 w-4" />
              مسح السجل
            </Button>
          )}
        </div>

        {/* بطاقات الإحصائيات (إجمالي كل الوقت) */}
        {total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'] as const).map(action => {
              const meta  = getActionMeta(action);
              const Icon  = meta.icon;
              const count = actionCounts[action] || 0;
              return (
                <button
                  key={action}
                  onClick={() => handleActionFilter(filterAction === action ? 'all' : action)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-right hover:shadow-md ${
                    filterAction === action ? 'ring-2 ring-primary/50 ' + meta.color : 'bg-card border-border/50 hover:border-border'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${meta.color}`}><Icon className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xl font-black">{count}</p>
                    <p className="text-xs text-muted-foreground">{meta.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* أدوات البحث والفلترة */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في السجل..."
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
              className="pr-9 text-right"
              data-testid="input-audit-search"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterAction} onValueChange={handleActionFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-audit-filter">
                <SelectValue placeholder="فلترة بالعملية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع العمليات</SelectItem>
                {Object.entries(ACTION_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || filterAction !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                مسح الفلاتر
              </Button>
            )}
          </div>
          {isFetching && !isLoading && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>جاري التحديث...</span>
            </div>
          )}
        </div>

        {/* الجدول */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-right font-bold w-12">#</TableHead>
                <TableHead className="text-right font-bold">المستخدم</TableHead>
                <TableHead className="text-right font-bold">نوع العملية</TableHead>
                <TableHead className="text-right font-bold">السجل المتأثر</TableHead>
                <TableHead className="text-right font-bold">ملخص التغيير</TableHead>
                <TableHead className="text-right font-bold">التاريخ والوقت</TableHead>
                <TableHead className="text-center font-bold w-20">التفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                      <ClipboardList className="h-12 w-12 opacity-20" />
                      <p className="font-medium">
                        {search || filterAction !== 'all' ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد سجلات عمليات بعد'}
                      </p>
                      {(search || filterAction !== 'all') && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>مسح الفلاتر</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(({ log, user: u }, i) => {
                  const meta        = getActionMeta(log.action);
                  const ActionIcon  = meta.icon;
                  const entityLabel = getEntityLabel(log.entityType);
                  const summary     = buildChangeSummary(log.action, log.oldValues, log.newValues);
                  const firstLine   = summary.split('\n')[0];
                  const hasMore     = summary.split('\n').length > 1;
                  const rowNum      = (page - 1) * ITEMS_PER_PAGE + i + 1;

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-muted-foreground text-xs font-mono">{rowNum}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {u?.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-bold text-sm">
                            {u ? u.username : <span className="text-muted-foreground italic text-xs">مستخدم محذوف</span>}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.color}`}>
                          <ActionIcon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-md">
                          {entityLabel}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm text-foreground truncate" title={firstLine}>{firstLine}</p>
                          {hasMore && (
                            <p className="text-xs text-muted-foreground mt-0.5">+{summary.split('\n').length - 1} تغيير آخر...</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap" dir="ltr">
                        {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm', { locale: ar })}
                      </TableCell>

                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10" data-testid={`btn-view-log-${log.id}`}>
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.color}`}>
                                  <ActionIcon className="h-3 w-3" />{meta.label}
                                </span>
                                تفاصيل العملية
                              </DialogTitle>
                            </DialogHeader>
                            <div className="mt-2 space-y-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-muted-foreground font-medium">المستخدم المنفّذ</p>
                                  <p className="font-bold">{u?.username || 'مستخدم محذوف'}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-muted-foreground font-medium">نوع السجل المتأثر</p>
                                  <p className="font-bold">{entityLabel}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-muted-foreground font-medium">نوع العملية</p>
                                  <p className="font-bold">{meta.label}</p>
                                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-muted-foreground font-medium">التاريخ والوقت</p>
                                  <p className="font-bold font-mono text-sm" dir="ltr">{format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm:ss')}</p>
                                </div>
                              </div>
                              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
                                <h4 className="font-bold text-sm mb-3 text-primary flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  ملخص التغييرات
                                </h4>
                                <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">{summary}</pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* أدوات التنقل بين الصفحات */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              عرض <span className="font-bold text-foreground">{(page - 1) * ITEMS_PER_PAGE + 1}</span> – <span className="font-bold text-foreground">{Math.min(page * ITEMS_PER_PAGE, total)}</span> من <span className="font-bold text-foreground">{total}</span> سجل
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="gap-1"
                data-testid="btn-prev-page"
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let p: number;
                  if (totalPages <= 5) {
                    p = idx + 1;
                  } else if (page <= 3) {
                    p = idx + 1;
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + idx;
                  } else {
                    p = page - 2 + idx;
                  }
                  return (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(p)}
                      data-testid={`btn-page-${p}`}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="gap-1"
                data-testid="btn-next-page"
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* تأكيد مسح السجل */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد مسح سجل العمليات</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف جميع السجلات ({total} سجل) بشكل نهائي ولا يمكن التراجع. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
              نعم، امسح السجل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
