import { useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Download, RefreshCw, Clock, ShieldAlert, Trash2, Database, AlertTriangle, CheckCircle2, Upload, FileSpreadsheet } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Arabic column headers for the Excel template in the same order as the form
const TEMPLATE_COLUMNS = [
  { header: "الاسم والكنية", example: "أحمد محمد علي", note: "مطلوب" },
  { header: "اسم الأب", example: "محمد", note: "" },
  { header: "اسم الأم", example: "فاطمة", note: "" },
  { header: "مكان الولادة", example: "دمشق", note: "" },
  { header: "تاريخ الولادة", example: "1985-06-15", note: "YYYY-MM-DD" },
  { header: "محل ورقم القيد", example: "دمشق 12345", note: "" },
  { header: "الرقم الوطني", example: "10000000001", note: "مطلوب - 11 رقم" },
  { header: "رقم شام كاش", example: "1234567890123456", note: "16 رقم" },
  { header: "الجنس", example: "ذكر", note: "ذكر أو أنثى" },
  { header: "الشهادة", example: "جامعة", note: "" },
  { header: "نوع الشهادة", example: "هندسة", note: "" },
  { header: "الاختصاص", example: "مهندس مدني", note: "" },
  { header: "الصفة الوظيفية", example: "مهندس", note: "" },
  { header: "الفئة", example: "أولى", note: "أولى/ثانية/ثالثة/رابعة" },
  { header: "الوضع الوظيفي", example: "مثبت", note: "مثبت أو عقد" },
  { header: "رقم قرار التعيين", example: "1234", note: "" },
  { header: "تاريخ قرار التعيين", example: "2010-01-01", note: "YYYY-MM-DD" },
  { header: "أول مباشرة بالدولة", example: "2010-01-01", note: "YYYY-MM-DD" },
  { header: "أول مباشرة بالمديرية", example: "2010-01-01", note: "YYYY-MM-DD" },
  { header: "أول مباشرة بالقسم", example: "2010-01-01", note: "YYYY-MM-DD" },
  { header: "وضع العامل الحالي", example: "على رأس عمله", note: "على رأس عمله/نقل/استقالة/إجازة بلا أجر" },
  { header: "العمل المكلف به", example: "ورشة القسم الهندسي", note: "" },
  { header: "رقم الجوال", example: "0912345678", note: "" },
  { header: "العنوان", example: "دمشق - المزة", note: "" },
  { header: "ملاحظات", example: "", note: "" },
];

function downloadTemplate() {
  const headers = TEMPLATE_COLUMNS.map(c => c.header);
  const exampleRow = TEMPLATE_COLUMNS.map(c => c.example);
  const noteRow = TEMPLATE_COLUMNS.map(c => c.note ? `(${c.note})` : "");

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  // Style header row width
  ws['!cols'] = headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "نموذج الموظفين");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "نموذج_استيراد_الموظفين.xlsx");
}

function ImportEmployeesCard() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; total: number; errors: Array<{ row: number; message: string }> } | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/employees/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "خطأ في الاستيراد" }));
        throw new Error(err.message || "خطأ في الاستيراد");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      if (data.failed === 0) {
        toast({ title: `تم استيراد ${data.imported} موظف بنجاح` });
      } else {
        toast({
          title: `تم استيراد ${data.imported} من أصل ${data.total} موظف`,
          description: `فشل استيراد ${data.failed} سجل`,
          variant: data.imported > 0 ? "default" : "destructive",
        });
      }
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => {
      toast({ title: "فشل الاستيراد", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Card className="overflow-hidden border-primary/10 shadow-lg hover-elevate transition-all duration-300">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-sm">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">استيراد بيانات الموظفين</CardTitle>
            <CardDescription>استيراد بيانات موظفين من ملف Excel</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-blue-700 dark:text-blue-400">
            <CheckCircle2 className="h-4 w-4" />
            خطوات الاستيراد
          </div>
          <ol className="text-xs text-muted-foreground leading-relaxed space-y-1 list-decimal list-inside">
            <li>قم بتحميل نموذج Excel أدناه</li>
            <li>أدخل بيانات الموظفين في الصفوف التالية للنموذج</li>
            <li>احفظ الملف ثم ارفعه هنا واضغط "استيراد"</li>
          </ol>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2 border-primary/20 hover:border-primary/50 text-primary font-bold"
          onClick={downloadTemplate}
          data-testid="btn-download-template"
        >
          <Download className="h-4 w-4" />
          تحميل نموذج Excel للتعبئة
        </Button>

        <div className="space-y-2">
          <Label className="text-sm font-bold">رفع ملف Excel المعبأ</Label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] || null);
              setImportResult(null);
            }}
            className="block w-full text-sm text-muted-foreground file:mr-0 file:ml-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer border rounded-lg p-1"
            data-testid="input-import-file"
          />
          {selectedFile && (
            <p className="text-xs text-muted-foreground">
              الملف المختار: <span className="font-bold">{selectedFile.name}</span>
            </p>
          )}
        </div>

        <Button
          className="w-full gap-2 font-bold"
          disabled={!selectedFile || importMutation.isPending}
          onClick={() => selectedFile && importMutation.mutate(selectedFile)}
          data-testid="btn-import-employees"
        >
          {importMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {importMutation.isPending ? "جاري الاستيراد..." : "استيراد البيانات"}
        </Button>

        {importResult && (
          <div className="space-y-3 pt-2 border-t">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-lg font-black text-foreground">{importResult.total}</div>
                <div className="text-xs text-muted-foreground">إجمالي الصفوف</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-2">
                <div className="text-lg font-black text-green-600">{importResult.imported}</div>
                <div className="text-xs text-muted-foreground">تم استيراده</div>
              </div>
              <div className={`rounded-lg p-2 ${importResult.failed > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                <div className={`text-lg font-black ${importResult.failed > 0 ? 'text-destructive' : 'text-foreground'}`}>{importResult.failed}</div>
                <div className="text-xs text-muted-foreground">فشل</div>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border bg-destructive/5 divide-y">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="px-3 py-2 text-xs flex gap-2">
                    <span className="font-bold text-destructive shrink-0">صف {err.row}:</span>
                    <span className="text-muted-foreground">{err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restoreFile, setRestoreFile] = useState<string | null>(null);
  const [deleteFile, setDeleteFile] = useState<string | null>(null);

  const { data: backupConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["/api/settings/backup_config"],
    enabled: !!user && user.role === "admin",
    retry: false,
  });

  const { data: backups, isLoading: isLoadingBackups } = useQuery<any[]>({
    queryKey: ["/api/settings/backups"],
    enabled: !!user && user.role === "admin",
    retry: false,
  });

  const backupsList = Array.isArray(backups) ? backups : [];

  const updateConfigMutation = useMutation({
    mutationFn: async (value: any) => {
      const res = await apiRequest("POST", "/api/settings", { key: "backup_config", value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/backup_config"] });
      toast({ title: "تم تحديث الإعدادات بنجاح" });
    },
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/backup");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/backups"] });
      toast({ title: data.message });
    },
    onError: () => {
      toast({ title: "فشل إنشاء النسخة الاحتياطية", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await apiRequest("POST", "/api/settings/backup/restore", { filename });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تمت الاستعادة بنجاح",
        description: "تم تحديث كافة بيانات النظام من النسخة المختارة.",
      });
      setRestoreFile(null);
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        title: "فشل استعادة النسخة الاحتياطية",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      await apiRequest("DELETE", `/api/settings/backups/${filename}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/backups"] });
      toast({ title: "تم حذف النسخة الاحتياطية بنجاح" });
      setDeleteFile(null);
    },
  });

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Card className="w-full max-w-md border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-bold text-destructive mb-2">غير مصرح لك بالدخول</h2>
              <p className="text-muted-foreground text-sm">هذه الصفحة مخصصة لمدير النظام فقط.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">إعدادات النظام</h1>
            <p className="text-muted-foreground mt-1 font-medium">إدارة النسخ الاحتياطي واستيراد البيانات وتكوين النظام.</p>
          </div>
          <Button
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
            className="h-11 px-6 text-base font-bold shadow-lg shadow-primary/20"
          >
            {backupMutation.isPending ? (
              <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="ml-2 h-5 w-5" />
            )}
            إنشاء نسخة احتياطية الآن
          </Button>
        </div>

        {/* Import Card - full width at top */}
        <ImportEmployeesCard />

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 overflow-hidden border-primary/10 shadow-lg hover-elevate transition-all duration-300">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">إدارة النسخ الاحتياطية</CardTitle>
                    <CardDescription>قائمة النسخ المحفوظة على الخادم.</CardDescription>
                  </div>
                </div>
                {backupsList.length > 0 && (
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {backupsList.length} نسخة محفوظة
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {isLoadingBackups ? (
                  <div className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">جاري تحميل القائمة...</p>
                  </div>
                ) : backupsList.length === 0 ? (
                  <div className="p-12 text-center">
                    <Database className="h-12 w-12 mx-auto text-muted mb-4 opacity-20" />
                    <p className="text-muted-foreground font-medium">لا توجد نسخ احتياطية حالياً.</p>
                  </div>
                ) : (
                  backupsList.map((backup: any) => (
                    <div key={backup.filename} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Download className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm truncate max-w-[200px] sm:max-w-xs">{backup.filename}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(backup.createdAt), "PPP p", { locale: ar })}
                            </span>
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              {(backup.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-bold hover:bg-primary hover:text-primary-foreground border-primary/20"
                          onClick={() => setRestoreFile(backup.filename)}
                        >
                          استعادة
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteFile(backup.filename)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-primary/10 shadow-lg hover-elevate transition-all duration-300">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">الجدولة الآلية</CardTitle>
                  <CardDescription>أتمتة عملية النسخ.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-muted-border">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">النسخ الدوري</Label>
                  <p className="text-xs text-muted-foreground">نسخة تلقائية كل 24 ساعة.</p>
                </div>
                <Switch
                  checked={(backupConfig as any)?.enabled || false}
                  onCheckedChange={(enabled) => updateConfigMutation.mutate({ ...(backupConfig as any), enabled })}
                  disabled={isLoadingConfig || updateConfigMutation.isPending}
                />
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-700 dark:text-amber-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  تحذير أمان البيانات
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  عند استعادة أي نسخة احتياطية، سيتم استبدال قاعدة البيانات الحالية بالكامل. تأكد من جودة الملف قبل البدء.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-700 dark:text-blue-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  نصيحة تقنية
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  يتم الاحتفاظ بآخر 30 نسخة تلقائية فقط. النسخ اليدوية لا تُحذف تلقائياً.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreFile} onOpenChange={(open) => !open && setRestoreFile(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-black">تأكيد استعادة البيانات</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed">
              أنت على وشك استعادة البيانات من الملف: <br/>
              <span className="font-bold text-foreground block mt-2 p-2 bg-muted rounded border">{restoreFile}</span>
              <br/>
              <span className="text-destructive font-bold">تحذير:</span> سيتم مسح كافة البيانات الحالية وتعويضها ببيانات النسخة المختارة. لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-bold border-muted-border">إلغاء الأمر</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground font-bold hover:bg-primary/90"
              onClick={() => restoreFile && restoreMutation.mutate(restoreFile)}
            >
              تأكيد الاستعادة الآن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFile} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">حذف النسخة الاحتياطية</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف ملف النسخة الاحتياطية هذا نهائياً من الخادم؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteFile && deleteBackupMutation.mutate(deleteFile)}
            >
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
