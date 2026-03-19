import { useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Download, RefreshCw, Clock, ShieldAlert, Trash2, Database, AlertTriangle, CheckCircle2, Upload, FileSpreadsheet, Key, Plus, Eye, EyeOff, Copy, ToggleLeft, ToggleRight, Bot, UserRound, Workflow, Link2, Phone, ShieldCheck, Info, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ─── API Keys Management Card ────────────────────────────────────────────────
function ApiKeysCard() {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState<{ keyValue: string; description: string } | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<number | null>(null);
  const [form, setForm] = useState({ description: "", expiryDate: "", keyType: "human" as "human" | "machine" });
  const [copied, setCopied] = useState(false);
  const [copyingKeyId, setCopyingKeyId] = useState<number | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);

  const { data: keys = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/api-keys"],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { description: string; expiryDate?: string; keyType: string }) => {
      const res = await apiRequest("POST", "/api/api-keys", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setShowCreateModal(false);
      setNewKey({ keyValue: data.keyValue, description: data.description });
      setForm({ description: "", expiryDate: "", keyType: "human" });
    },
    onError: (e: any) => {
      toast({ title: "فشل إنشاء المفتاح", description: e.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/api-keys/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "تم تحديث حالة المفتاح" });
    },
    onError: () => {
      toast({ title: "فشل تحديث الحالة", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "تم حذف المفتاح بنجاح" });
      setDeleteKeyId(null);
    },
    onError: () => {
      toast({ title: "فشل حذف المفتاح", variant: "destructive" });
    },
  });

  function copyKey(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function revealAndCopy(id: number) {
    setCopyingKeyId(id);
    try {
      const res = await apiRequest("GET", `/api/api-keys/${id}/reveal`);
      const data = await res.json();
      await navigator.clipboard.writeText(data.keyValue);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch {
      toast({ title: "فشل نسخ المفتاح", variant: "destructive" });
    } finally {
      setCopyingKeyId(null);
    }
  }

  const isExpired = (expiryDate: string | null) =>
    expiryDate ? new Date() > new Date(expiryDate) : false;

  return (
    <>
      <Card className="overflow-hidden border-primary/10 shadow-lg hover-elevate transition-all duration-300">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">مفاتيح API</CardTitle>
                <CardDescription>إدارة مفاتيح الوصول البرمجي للنظام.</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-2 font-bold"
              onClick={() => setShowCreateModal(true)}
              data-testid="btn-create-api-key"
            >
              <Plus className="h-4 w-4" />
              توليد مفتاح جديد
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center">
              <Key className="h-12 w-12 mx-auto text-muted mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">لا توجد مفاتيح API حتى الآن.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">اضغط "توليد مفتاح جديد" لإنشاء أول مفتاح.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {keys.map((key: any) => {
                const expired = isExpired(key.expiryDate);
                return (
                  <div key={key.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm truncate">{key.description}</span>
                        {/* Key type badge */}
                        {key.keyType === "machine" ? (
                          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 text-xs font-bold gap-1">
                            <Bot className="h-3 w-3" />آلة
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs font-bold gap-1">
                            <UserRound className="h-3 w-3" />بشري
                          </Badge>
                        )}
                        {/* Status badge */}
                        {key.isActive && !expired ? (
                          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-xs font-bold">فعّال</Badge>
                        ) : expired ? (
                          <Badge variant="destructive" className="text-xs font-bold">منتهي الصلاحية</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-bold">معطّل</Badge>
                        )}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground mt-1 truncate max-w-xs" data-testid={`key-value-${key.id}`}>
                        {key.keyValue}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(key.createdAt), "PPP", { locale: ar })}
                        </span>
                        {key.expiryDate && (
                          <span className={`flex items-center gap-1 ${expired ? "text-destructive font-bold" : ""}`}>
                            ينتهي: {format(new Date(key.expiryDate), "PPP", { locale: ar })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1 text-xs font-bold ${key.isActive ? "text-green-600 hover:bg-green-500/10" : "text-muted-foreground hover:bg-muted"}`}
                        onClick={() => toggleMutation.mutate({ id: key.id, isActive: !key.isActive })}
                        disabled={toggleMutation.isPending}
                        data-testid={`btn-toggle-key-${key.id}`}
                        title={key.isActive ? "تعطيل المفتاح" : "تفعيل المفتاح"}
                      >
                        {key.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        {key.isActive ? "فعّال" : "معطّل"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary hover:bg-primary/10"
                        onClick={() => revealAndCopy(key.id)}
                        disabled={copyingKeyId === key.id}
                        data-testid={`btn-copy-key-${key.id}`}
                        title="نسخ المفتاح الكامل"
                      >
                        {copyingKeyId === key.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : copiedKeyId === key.id ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteKeyId(key.id)}
                        data-testid={`btn-delete-key-${key.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-4 border-t bg-muted/20">
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-bold text-foreground/70">كيفية الاستخدام:</p>
              <code className="block bg-muted px-3 py-2 rounded font-mono text-xs select-all">
                curl -H "x-api-key: YOUR_KEY" {window.location.origin}/api/v1/employees
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              توليد مفتاح API جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-bold">الوصف <span className="text-destructive">*</span></Label>
              <Input
                placeholder="مثال: نظام التقارير الخارجي"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid="input-api-key-description"
              />
            </div>
            {/* Key Type Selector */}
            <div className="space-y-2">
              <Label className="font-bold">نوع المفتاح <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, keyType: "human" })}
                  data-testid="btn-key-type-human"
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-sm ${
                    form.keyType === "human"
                      ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-blue-300 hover:bg-blue-500/5"
                  }`}
                >
                  <UserRound className="h-6 w-6" />
                  <span>بشري</span>
                  <span className="text-xs font-normal opacity-75">لتسجيل دخول المستخدمين</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, keyType: "machine" })}
                  data-testid="btn-key-type-machine"
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-sm ${
                    form.keyType === "machine"
                      ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-purple-300 hover:bg-purple-500/5"
                  }`}
                >
                  <Bot className="h-6 w-6" />
                  <span>آلة</span>
                  <span className="text-xs font-normal opacity-75">للوصول البرمجي فقط</span>
                </button>
              </div>
              {form.keyType === "machine" && (
                <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-500/5 border border-purple-500/15 px-3 py-2 rounded-lg">
                  مفاتيح الآلة لا تُستخدم لتسجيل الدخول عبر المتصفح — مخصصة للتكامل البرمجي عبر API فقط.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-bold">تاريخ الانتهاء <span className="text-muted-foreground text-xs font-normal">(اختياري)</span></Label>
              <Input
                type="datetime-local"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                data-testid="input-api-key-expiry"
              />
              <p className="text-xs text-muted-foreground">اتركه فارغاً للمفتاح الدائم.</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>سيُعرض المفتاح <strong>مرة واحدة فقط</strong> بعد الإنشاء. احفظه في مكان آمن.</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="font-bold">إلغاء</Button>
            <Button
              onClick={() => createMutation.mutate({ description: form.description, expiryDate: form.expiryDate || undefined, keyType: form.keyType })}
              disabled={createMutation.isPending || !form.description.trim()}
              className="gap-2 font-bold"
              data-testid="btn-confirm-create-api-key"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              توليد المفتاح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Reveal Modal */}
      <Dialog open={!!newKey} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              تم إنشاء المفتاح بنجاح
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>هذا المفتاح لن يظهر مجدداً. انسخه الآن واحفظه في مكان آمن.</span>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-sm">{newKey?.description}</Label>
              <div className="flex gap-2">
                <code className="flex-1 block bg-muted px-3 py-3 rounded-lg font-mono text-xs break-all select-all border border-primary/20" data-testid="new-api-key-value">
                  {newKey?.keyValue}
                </code>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 font-bold border-primary/30 hover:border-primary"
                onClick={() => newKey && copyKey(newKey.keyValue)}
                data-testid="btn-copy-api-key"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "تم النسخ!" : "نسخ المفتاح"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button className="font-bold w-full" onClick={() => setNewKey(null)}>
              حسناً، تم الحفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteKeyId !== null} onOpenChange={(open) => !open && setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-black">تأكيد حذف مفتاح API</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              سيتوقف هذا المفتاح عن العمل فوراً. لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-bold">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              onClick={() => deleteKeyId !== null && deleteMutation.mutate(deleteKeyId)}
            >
              حذف المفتاح
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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

// ─── n8n Integration Info Tab ────────────────────────────────────────────────
function N8nIntegrationTab() {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  const endpoints = [
    {
      method: "POST",
      path: "/api/v1/bot/check-auth",
      description: "التحقق من صلاحية رقم الهاتف وجلب بياناته",
      body: '{ "phoneNumber": "963912345678" }',
      response: '{ "authorized": true, "full_name": "...", "is_bot_active": false, "has_documents": true, ... }',
      color: "blue",
    },
    {
      method: "POST",
      path: "/api/v1/bot/update-status",
      description: "تحديث حالة البوت (تفعيل / إيقاف) وتحديث وقت التفاعل",
      body: '{ "phoneNumber": "963912345678", "isActive": true }',
      response: '{ "success": true, "is_bot_active": true, "last_interaction": "..." }',
      color: "green",
    },
    {
      method: "POST",
      path: "/api/v1/bot/get-docs",
      description: "جلب قائمة مستندات الموظف مع روابط تحميل مباشرة",
      body: '{ "phoneNumber": "963912345678" }',
      response: '{ "success": true, "employee_name": "...", "documents": [{ "name": "...", "url": "..." }] }',
      color: "purple",
    },
  ];

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      toast({ title: "تم النسخ!", description: text.length > 60 ? text.substring(0, 60) + "..." : text });
    });
  }

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400",
    green: "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400",
  };
  const badgeMap: Record<string, string> = {
    blue: "bg-blue-500 text-white",
    green: "bg-green-500 text-white",
    purple: "bg-purple-500 text-white",
  };

  return (
    <div className="space-y-6">
      {/* Base URL */}
      <Card className="overflow-hidden border-primary/10 shadow-lg">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">رابط المشروع</CardTitle>
              <CardDescription>الرابط الأساسي للمشروع على Replit — استخدمه في إعدادات n8n</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2">
            <code
              className="flex-1 block bg-muted border border-border rounded-lg px-4 py-3 font-mono text-sm select-all break-all"
              data-testid="project-base-url"
            >
              {baseUrl}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 border-primary/20 hover:border-primary"
              onClick={() => copyText(baseUrl, "baseurl")}
              data-testid="btn-copy-base-url"
            >
              {copiedKey === "baseurl" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Key Setup */}
      <Card className="overflow-hidden border-purple-500/20 shadow-lg">
        <CardHeader className="bg-purple-500/5 border-b border-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">مفتاح الآلة (x-api-key)</CardTitle>
              <CardDescription>يجب إرفاقه في كل طلب من n8n كـ Header باسم <code className="font-mono font-bold">x-api-key</code></CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-purple-700 dark:text-purple-400 font-bold">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              كيفية الحصول على مفتاح الآلة
            </div>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
              <li>اذهب إلى تبويب <strong className="text-foreground">الإعدادات العامة</strong> في هذه الصفحة</li>
              <li>في قسم <strong className="text-foreground">مفاتيح API</strong>، اضغط <strong className="text-foreground">"توليد مفتاح جديد"</strong></li>
              <li>اختر النوع <strong className="text-purple-700 dark:text-purple-400">آلة (Machine)</strong></li>
              <li>انسخ المفتاح الكامل فوراً (لن يظهر مجدداً)</li>
              <li>في n8n، أضف Header: <code className="font-mono bg-muted px-1 rounded">x-api-key</code> وقيمته المفتاح المنسوخ</li>
            </ol>
          </div>
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>تنبيه:</strong> مسارات البوت <code className="font-mono">/api/v1/bot/</code> تقبل <strong>مفاتيح الآلة فقط</strong> — لا تعمل بمفاتيح المستخدمين العاديين.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Phone Format */}
      <Card className="overflow-hidden border-green-500/20 shadow-lg">
        <CardHeader className="bg-green-500/5 border-b border-green-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-600 text-white shadow-sm">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">تنسيق أرقام الهواتف</CardTitle>
              <CardDescription>الصيغة الصحيحة للأرقام الواردة من بوت الواتساب</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            {[
              { label: "+963912345678", note: "مع + ✓", ok: true },
              { label: "00963912345678", note: "مع 00 ✓", ok: true },
              { label: "963912345678", note: "مباشرة ✓", ok: true },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 space-y-1">
                <code className="font-mono text-[10px] text-green-800 dark:text-green-300 break-all">{item.label}</code>
                <p className="text-green-700 dark:text-green-400 font-bold text-[10px]">{item.note}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-3 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              النظام يُطبّع الأرقام تلقائياً — يُجرّد الأصفار والرمز + ويخزن الرقم نقياً كـ <code className="font-mono font-bold">963xxxxxxxxx</code>. جميع الصيغ الثلاث مقبولة ومتكافئة.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card className="overflow-hidden border-primary/10 shadow-lg">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">مسارات API البوت</CardTitle>
              <CardDescription>المسارات الجاهزة للاستخدام في n8n — جميعها POST وتتطلب مفتاح الآلة</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          {endpoints.map((ep, idx) => {
            const fullUrl = `${baseUrl}${ep.path}`;
            return (
              <div key={idx} className={`rounded-xl border p-4 space-y-3 ${colorMap[ep.color]}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${badgeMap[ep.color]}`}>{ep.method}</span>
                    <code className="font-mono text-xs font-bold">{ep.path}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs font-bold shrink-0"
                    onClick={() => copyText(fullUrl, `url-${idx}`)}
                    data-testid={`btn-copy-endpoint-${idx}`}
                  >
                    {copiedKey === `url-${idx}` ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    نسخ الرابط الكامل
                  </Button>
                </div>
                <p className="text-xs font-medium opacity-90">{ep.description}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60 mb-1">Request Body</p>
                    <div className="flex items-start gap-2">
                      <code className="flex-1 bg-black/10 dark:bg-white/10 rounded-lg px-3 py-2 text-[11px] font-mono break-all leading-relaxed">
                        {ep.body}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => copyText(ep.body, `body-${idx}`)}
                        data-testid={`btn-copy-body-${idx}`}
                      >
                        {copiedKey === `body-${idx}` ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60 mb-1">Response</p>
                    <code className="block bg-black/10 dark:bg-white/10 rounded-lg px-3 py-2 text-[11px] font-mono break-all leading-relaxed opacity-80">
                      {ep.response}
                    </code>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
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
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">إعدادات النظام</h1>
          <p className="text-muted-foreground mt-1 font-medium">إدارة النسخ الاحتياطي واستيراد البيانات وتكوين النظام.</p>
        </div>

        <Tabs defaultValue="general">
          <TabsList className="mb-5 h-10 rounded-lg bg-muted p-1">
            <TabsTrigger value="general" className="flex items-center gap-2 rounded-md text-sm" data-testid="tab-settings-general">
              <Database className="h-4 w-4" />
              الإعدادات العامة
            </TabsTrigger>
            <TabsTrigger value="n8n" className="flex items-center gap-2 rounded-md text-sm" data-testid="tab-settings-n8n">
              <Workflow className="h-4 w-4" />
              تكامل n8n و البوت
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="flex justify-end">
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

            {/* API Keys Card - full width */}
            <ApiKeysCard />

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
          </TabsContent>

          <TabsContent value="n8n">
            <N8nIntegrationTab />
          </TabsContent>
        </Tabs>
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
