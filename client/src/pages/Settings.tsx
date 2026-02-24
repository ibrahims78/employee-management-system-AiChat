import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Download, RefreshCw, Clock, ShieldAlert, Trash2, Database, AlertTriangle, CheckCircle2 } from "lucide-react";
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
    onSuccess: (data) => {
      toast({ 
        title: "تمت الاستعادة بنجاح", 
        description: "تم تحديث كافة بيانات النظام من النسخة المختارة.",
      });
      setRestoreFile(null);
      // Re-fetch all data to reflect changes
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل استعادة النسخة الاحتياطية", 
        description: error.message,
        variant: "destructive" 
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
            <p className="text-muted-foreground mt-1 font-medium">إدارة النسخ الاحتياطي وتكوين النظام بشكل احترافي.</p>
          </div>
          <Button 
            onClick={() => backupMutation.mutate()} 
            disabled={backupMutation.isPending}
            className="h-11 px-6 text-base font-bold shadow-lg shadow-primary/20 active-elevate-2"
          >
            {backupMutation.isPending ? (
              <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="ml-2 h-5 w-5" />
            )}
            إنشاء نسخة احتياطية الآن
          </Button>
        </div>

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
