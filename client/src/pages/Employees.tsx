import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FileDown, FileText, Trash2, Pencil, Archive, Settings2, X, LayoutGrid, LayoutList, Users, CheckSquare, Clock, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmployeeSchema, type InsertEmployee, type Employee } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";

const DEFAULT_OPTIONS: Record<string, string[]> = {
  gender: ["ذكر", "أنثى"],
  certificate: ["اعدادية","ثانوية","ثانوية صناعية","جامعة","مراقب فني","مستخدم","معهد تدفئة مركزية","معهد متوسط","معهد مهني فوق الإعدادية","مهني"],
  certificateType: ["بكلوريا صناعية ميكانيك","ثانوية ادبي","ثانوية علمي","مساعد فني تدفئة مركزية","مستخدم","معهد متوسط صحي","معهد متوسط صناعات تطبيقية","معهد متوسط للهندسة الكهربائية والميكانيكية","معهد متوسط مراقبين فنيين","معهد متوسط هندسي","مهني","هندسة"],
  specialization: ["بكلوريا صناعية ميكانيك","دهان","عامل مهني","كاتب","كهربائي","مساعد فني تدفئة مركزية","مساعد فني صيانة أجهزة طبية","مساعد مهندس كهرباء","مساعد مهندس مدني","مستخدم","معهد كهرباء صناعية","معهد متوسط للهندسة الكهربائية والميكانيكية","مهندس اتصالات","مهندس تحكم الي وحواسيب","مهندس تكنولوجيا المعلومات والاتصالات","مهندس طبية","مهندس عمارة","مهندس كهرباء/الكترون","مهندس كهرباء/طاقة","مهندس مدني","مهندس ميكانيك","نجار"],
  category: ["أولى", "ثانية", "ثالثة", "رابعة"],
  employmentStatus: ["مثبت", "عقد"],
  currentStatus: ["على رأس عمله", "إجازة بلا أجر", "نقل", "استقالة"],
  assignedWork: ["رئيس القسم الهندسي","صيانة وإشراف ومتابعة لجان","مستخدم","ورشة القسم الهندسي"],
};

const STATUS_COLORS: Record<string, string> = {
  'على رأس عمله': '#22c55e',
  'إجازة بلا أجر': '#f97316',
  'نقل': '#0ea5e9',
  'استقالة': '#ef4444',
};

function normalizeStatus(status: string): string {
  const s = status.trim();
  if (s === 'إجازة بلا اجر' || s === 'اجازة بلا اجر' || s === 'اجازة بلا أجر') return 'إجازة بلا أجر';
  if (s === 'على رأس عمله' || s === 'على راس عمله') return 'على رأس عمله';
  if (s === 'استقاله') return 'استقالة';
  return s;
}

function useDropdownOptions(key: string) {
  const { data, isLoading } = useQuery<string[] | null>({
    queryKey: ['/api/settings', key],
    queryFn: async () => {
      const res = await fetch(`/api/settings/dropdown_${key}`, { credentials: 'include' });
      if (!res.ok) return null;
      const val = await res.json();
      return Array.isArray(val) ? val : null;
    },
  });

  const mutation = useMutation({
    mutationFn: async (options: string[]) => {
      return apiRequest('POST', '/api/settings', { key: `dropdown_${key}`, value: options });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings', key] });
    },
  });

  const options = (data && data.length > 0) ? data : DEFAULT_OPTIONS[key] ?? [];
  return { options, isLoading, updateOptions: mutation.mutateAsync, isUpdating: mutation.isPending };
}

function EditDropdownDialog({ fieldKey, label }: { fieldKey: string; label: string }) {
  const [open, setOpen] = useState(false);
  const { options, updateOptions, isUpdating } = useDropdownOptions(fieldKey);
  const [localOptions, setLocalOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) setLocalOptions([...options]);
  }, [open, options]);

  const handleAdd = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (localOptions.includes(trimmed)) { toast({ title: "الخيار موجود مسبقاً", variant: "destructive" }); return; }
    setLocalOptions(prev => [...prev, trimmed]);
    setNewOption("");
  };

  const handleDelete = (idx: number) => setLocalOptions(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (localOptions.length === 0) { toast({ title: "يجب أن تحتوي القائمة على خيار واحد على الأقل", variant: "destructive" }); return; }
    await updateOptions(localOptions);
    toast({ title: "تم حفظ خيارات القائمة بنجاح" });
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setOpen(true)} title={`تعديل خيارات ${label}`} data-testid={`btn-edit-dropdown-${fieldKey}`}>
        <Settings2 className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-right">تعديل خيارات: {label}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
              {localOptions.length === 0 ? (
                <p className="text-center text-muted-foreground p-4 text-sm">لا توجد خيارات</p>
              ) : localOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-right flex-1">{opt}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDelete(idx)} data-testid={`btn-delete-option-${fieldKey}-${idx}`}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="أضف خياراً جديداً..." value={newOption} onChange={(e) => setNewOption(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} className="text-right flex-1" data-testid={`input-new-option-${fieldKey}`} />
              <Button type="button" onClick={handleAdd} variant="outline" data-testid={`btn-add-option-${fieldKey}`}>إضافة</Button>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="button" onClick={handleSave} disabled={isUpdating} data-testid={`btn-save-options-${fieldKey}`}>{isUpdating ? "جاري الحفظ..." : "حفظ"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditableSelectFormField({ control, name, label, dropdownKey }: { control: any; name: string; label: string; dropdownKey: string; defaultValue?: string; }) {
  const { options } = useDropdownOptions(dropdownKey);
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem className="text-right">
        <FormLabel>{label}</FormLabel>
        <div className="flex gap-2 items-center">
          <Select onValueChange={field.onChange} value={field.value || ""}>
            <FormControl>
              <SelectTrigger className="text-right flex-1" data-testid={`select-${name}`}>
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
          <EditDropdownDialog fieldKey={dropdownKey} label={label} />
        </div>
        <FormMessage />
      </FormItem>
    )} />
  );
}

const EXPORT_COLUMNS = [
  { id: "fullName", label: "الاسم والكنية" }, { id: "fatherName", label: "اسم الأب" },
  { id: "motherName", label: "اسم الأم" }, { id: "placeOfBirth", label: "مكان الولادة" },
  { id: "dateOfBirth", label: "تاريخ الولادة" }, { id: "registryPlaceAndNumber", label: "محل ورقم القيد" },
  { id: "nationalId", label: "الرقم الوطني" }, { id: "shamCashNumber", label: "رقم شام كاش" },
  { id: "gender", label: "الجنس" }, { id: "certificate", label: "الشهادة" },
  { id: "certificateType", label: "نوع الشهادة" }, { id: "specialization", label: "الاختصاص" },
  { id: "jobTitle", label: "الصفة الوظيفية" }, { id: "category", label: "الفئة" },
  { id: "employmentStatus", label: "الوضع الوظيفي" }, { id: "appointmentDecisionNumber", label: "رقم قرار التعيين" },
  { id: "appointmentDecisionDate", label: "تاريخ قرار التعيين" }, { id: "firstStateStart", label: "أول مباشرة بالدولة" },
  { id: "firstDirectorateStart", label: "أول مباشرة بالمديرية" }, { id: "firstDepartmentStart", label: "أول مباشرة بالقسم" },
  { id: "currentStatus", label: "وضع العامل الحالي" }, { id: "assignedWork", label: "العمل المكلف به" },
  { id: "mobile", label: "رقم الجوال" }, { id: "address", label: "العنوان" }, { id: "notes", label: "ملاحظات" },
];

function EmployeeHistoryTab({ employeeId }: { employeeId: number }) {
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/employees', employeeId, 'history'],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}/history`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  const actionLabels: Record<string, string> = {
    CREATE: 'إنشاء', UPDATE: 'تعديل', DELETE: 'حذف', LOGIN: 'دخول', LOGOUT: 'خروج',
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <History className="h-12 w-12 opacity-20" />
        <p className="font-medium">لا توجد سجلات تعديل لهذا الموظف</p>
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto divide-y">
      {history.map((log: any) => {
        const actionColor: Record<string, string> = {
          CREATE: 'bg-green-500/10 text-green-700',
          UPDATE: 'bg-blue-500/10 text-blue-700',
          DELETE: 'bg-red-500/10 text-red-700',
        };
        return (
          <div key={log.id} className="flex items-start gap-3 py-3 px-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${actionColor[log.action] || 'bg-muted text-muted-foreground'}`}>
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs font-bold px-2 py-0 ${actionColor[log.action] || ''}`}>
                  {actionLabels[log.action] || log.action}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {log.createdAt ? format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm') : '—'}
                </span>
              </div>
              {log.newValues && Object.keys(log.newValues).length > 0 && (
                <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
                  {Object.entries(log.newValues).slice(0, 5).map(([key, val]) => (
                    <div key={key} className="flex gap-1">
                      <span className="font-medium text-foreground/70 shrink-0">{key}:</span>
                      <span className="truncate">{String(val)}</span>
                    </div>
                  ))}
                  {Object.keys(log.newValues).length > 5 && (
                    <span className="text-muted-foreground">+ {Object.keys(log.newValues).length - 5} حقل آخر</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmployeeFormDialog({ open, onOpenChange, employee }: { open: boolean; onOpenChange: (open: boolean) => void; employee?: Employee; }) {
  const { user } = useAuth();
  const { createEmployee, updateEmployee, deleteAttachment, isCreating, isUpdating } = useEmployees();
  const { toast } = useToast();

  const form = useForm<InsertEmployee>({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: {
      fullName: "", fatherName: "", motherName: "", placeOfBirth: "",
      registryPlaceAndNumber: "", nationalId: "", shamCashNumber: "", gender: "ذكر",
      certificate: "", certificateType: "", specialization: "", jobTitle: "", category: "أولى",
      employmentStatus: "مثبت", appointmentDecisionNumber: "",
      currentStatus: "على رأس عمله", assignedWork: "ورشة القسم الهندسي", mobile: "", address: "", notes: "",
      dateOfBirth: null as any, appointmentDecisionDate: null as any, firstStateStart: null as any,
      firstDirectorateStart: null as any, firstDepartmentStart: null as any,
    }
  });

  useEffect(() => {
    if (employee && open) {
      form.reset({
        ...employee,
        fullName: employee.fullName || "",
        fatherName: employee.fatherName || "",
        motherName: employee.motherName || "",
        placeOfBirth: employee.placeOfBirth || "",
        registryPlaceAndNumber: employee.registryPlaceAndNumber || "",
        nationalId: employee.nationalId || "",
        gender: (employee.gender as "ذكر" | "أنثى") || "ذكر",
        certificate: (employee as any).certificate || "",
        certificateType: (employee.certificateType as any) || "",
        specialization: employee.specialization || "",
        jobTitle: employee.jobTitle || "",
        category: (employee.category as any) || "أولى",
        employmentStatus: (employee.employmentStatus as any) || "مثبت",
        appointmentDecisionNumber: employee.appointmentDecisionNumber || "",
        currentStatus: (employee.currentStatus as any) || "على رأس عمله",
        assignedWork: employee.assignedWork || "",
        mobile: employee.mobile || "",
        address: employee.address || "",
        dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
        appointmentDecisionDate: employee.appointmentDecisionDate ? new Date(employee.appointmentDecisionDate) : null,
        firstStateStart: employee.firstStateStart ? new Date(employee.firstStateStart) : null,
        firstDirectorateStart: employee.firstDirectorateStart ? new Date(employee.firstDirectorateStart) : null,
        firstDepartmentStart: employee.firstDepartmentStart ? new Date(employee.firstDepartmentStart) : null,
        notes: employee.notes || "",
        shamCashNumber: employee.shamCashNumber || "",
        documentPaths: (employee.documentPaths as string[]) || [],
      });
    } else if (!employee && open) {
      form.reset({
        fullName: "", fatherName: "", motherName: "", placeOfBirth: "",
        registryPlaceAndNumber: "", nationalId: "", shamCashNumber: "", gender: "ذكر",
        certificate: "", certificateType: "", specialization: "", jobTitle: "", category: "أولى",
        employmentStatus: "مثبت", appointmentDecisionNumber: "",
        currentStatus: "على رأس عمله", assignedWork: "ورشة القسم الهندسي", mobile: "", address: "", notes: "",
        dateOfBirth: null as any, appointmentDecisionDate: null as any, firstStateStart: null as any,
        firstDirectorateStart: null as any, firstDepartmentStart: null as any,
      });
    }
  }, [employee, open, form.reset]);

  const [documentFiles, setDocumentFiles] = useState<File[]>([]);

  const handleDeleteAttachment = async (path: string) => {
    if (!employee) return;
    if (!confirm("هل أنت متأكد من حذف هذا المرفق؟")) return;
    const fileName = path.split('/').pop();
    if (!fileName) return;
    try { await deleteAttachment({ id: employee.id, index: fileName }); } catch (error) {}
  };

  function onSubmit(data: InsertEmployee) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof Date) { formData.append(key, value.toISOString()); }
      else if (value !== null && value !== undefined && value !== "") { formData.append(key, String(value)); }
      else { formData.append(key, ""); }
    });
    if (documentFiles.length > 0) documentFiles.forEach((file) => formData.append("documents", file));

    if (employee) {
      updateEmployee({ id: employee.id, data: formData as any }, {
        onSuccess: () => { onOpenChange(false); setDocumentFiles([]); },
        onError: (error: any) => { console.error("Update error:", error); }
      });
    } else {
      createEmployee(formData as any, {
        onSuccess: () => { onOpenChange(false); setDocumentFiles([]); },
        onError: (error: any) => {
          console.error("Create error:", error);
          if (error.response?.data?.field) {
            form.setError(error.response.data.field as any, { type: "manual", message: error.response.data.message });
          }
        }
      });
    }
  }

  const onInvalid = (errors: any) => {
    console.error("Form validation errors:", errors);
    toast({ title: "خطأ في الإدخال", description: "يرجى التحقق من كافة الحقول المطلوبة", variant: "destructive" });
  };

  const isPending = isCreating || isUpdating;

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">أولاً: البيانات الشخصية</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem className="text-right"><FormLabel>الاسم والكنية</FormLabel><FormControl><Input {...field} className="text-right" autoComplete="off" data-testid="input-fullName" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="fatherName" render={({ field }) => (<FormItem className="text-right"><FormLabel>اسم الأب</FormLabel><FormControl><Input {...field} className="text-right" data-testid="input-fatherName" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="motherName" render={({ field }) => (<FormItem className="text-right"><FormLabel>اسم الأم</FormLabel><FormControl><Input {...field} className="text-right" data-testid="input-motherName" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem className="text-right"><FormLabel>الجنس</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger className="text-right" data-testid="select-gender"><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="ذكر">ذكر</SelectItem><SelectItem value="أنثى">أنثى</SelectItem></SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="placeOfBirth" render={({ field }) => (<FormItem className="text-right"><FormLabel>مكان الولادة</FormLabel><FormControl><Input {...field} className="text-right" data-testid="input-placeOfBirth" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem className="text-right"><FormLabel>تاريخ الولادة</FormLabel>
                  <FormControl><Input type="date" className="text-right" value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} data-testid="input-dateOfBirth" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="registryPlaceAndNumber" render={({ field }) => (<FormItem className="text-right"><FormLabel>محل ورقم القيد</FormLabel><FormControl><Input {...field} className="text-right" data-testid="input-registryPlaceAndNumber" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="nationalId" render={({ field }) => (<FormItem className="text-right"><FormLabel>الرقم الوطني <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} className="text-right" data-testid="input-nationalId" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="shamCashNumber" render={({ field }) => (
                <FormItem className="text-right">
                  <FormLabel>رقم شام كاش <span className="text-destructive">*</span> <span className="text-xs text-muted-foreground font-normal">(16 رقم)</span></FormLabel>
                  <FormControl><Input {...field} className="text-right" value={field.value || ''} maxLength={16} placeholder="أدخل 16 رقماً" data-testid="input-shamCashNumber" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem className="text-right"><FormLabel>رقم الجوال</FormLabel><FormControl><Input {...field} className="text-right" data-testid="input-mobile" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="md:col-span-2 text-right"><FormLabel>العنوان</FormLabel><FormControl><Input {...field} className="text-right" data-testid="input-address" /></FormControl><FormMessage /></FormItem>)} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">ثانياً: البيانات الوظيفية</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="jobTitle" render={({ field }) => (<FormItem className="text-right"><FormLabel>الصفة الوظيفية</FormLabel><FormControl><Input {...field} className="text-right" data-testid="input-jobTitle" /></FormControl><FormMessage /></FormItem>)} />
              <EditableSelectFormField control={form.control} name="certificate" label="الشهادة" dropdownKey="certificate" />
              <EditableSelectFormField control={form.control} name="certificateType" label="نوع الشهادة" dropdownKey="certificateType" />
              <EditableSelectFormField control={form.control} name="specialization" label="الاختصاص" dropdownKey="specialization" />
              <EditableSelectFormField control={form.control} name="category" label="الفئة" dropdownKey="category" />
              <EditableSelectFormField control={form.control} name="employmentStatus" label="الوضع الوظيفي" dropdownKey="employmentStatus" />
              <FormField control={form.control} name="currentStatus" render={({ field }) => (
                <FormItem className="text-right"><FormLabel>وضع العامل الحالي</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger className="text-right" data-testid="select-currentStatus"><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="على رأس عمله">على رأس عمله</SelectItem>
                      <SelectItem value="إجازة بلا أجر">إجازة بلا أجر</SelectItem>
                      <SelectItem value="نقل">نقل</SelectItem>
                      <SelectItem value="استقالة">استقالة</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="md:col-span-2">
                <EditableSelectFormField control={form.control} name="assignedWork" label="العمل المكلف به" dropdownKey="assignedWork" />
              </div>
              <FormField control={form.control} name="appointmentDecisionNumber" render={({ field }) => (<FormItem className="text-right"><FormLabel>رقم قرار التعيين</FormLabel><FormControl><Input {...field} className="text-right" data-testid="input-appointmentDecisionNumber" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="appointmentDecisionDate" render={({ field }) => (
                <FormItem className="text-right"><FormLabel>تاريخ قرار التعيين</FormLabel>
                  <FormControl><Input type="date" className="text-right" value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} data-testid="input-appointmentDecisionDate" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="firstStateStart" render={({ field }) => (
                <FormItem className="text-right"><FormLabel>أول مباشرة بالدولة</FormLabel>
                  <FormControl><Input type="date" className="text-right" value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} data-testid="input-firstStateStart" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="firstDirectorateStart" render={({ field }) => (
                <FormItem className="text-right"><FormLabel>أول مباشرة بالمديرية</FormLabel>
                  <FormControl><Input type="date" className="text-right" value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} data-testid="input-firstDirectorateStart" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="firstDepartmentStart" render={({ field }) => (
                <FormItem className="text-right"><FormLabel>أول مباشرة بالقسم</FormLabel>
                  <FormControl><Input type="date" className="text-right" value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} data-testid="input-firstDepartmentStart" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem className="md:col-span-2 text-right"><FormLabel>ملاحظات</FormLabel><FormControl><Input {...field} className="text-right" value={field.value || ''} data-testid="input-notes" /></FormControl><FormMessage /></FormItem>)} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Plus className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">المستندات والمرفقات</h3>
            </div>
            <div className="text-right">
              <Label>رفع مستندات الموظف</Label>
              <Input type="file" multiple onChange={(e) => setDocumentFiles(prev => [...prev, ...Array.from(e.target.files || [])])} className="mt-1" data-testid="input-documents" />
              {employee?.documentPaths && Array.isArray(employee.documentPaths) && (employee.documentPaths as string[]).length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-bold">المستندات المرفوعة حالياً:</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {(employee.documentPaths as string[]).map((path, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg text-sm">
                        <a href={path} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {path.split('/').pop() || `مستند ${idx + 1}`}
                        </a>
                        {user?.role === 'admin' && (
                          <Button variant="ghost" size="icon" type="button" onClick={() => handleDeleteAttachment(path)} className="text-destructive hover:bg-destructive/10" data-testid={`btn-delete-attachment-${idx}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="btn-cancel-form">إلغاء</Button>
          <Button type="submit" disabled={isPending} data-testid="btn-submit-form">{isPending ? "جاري الحفظ..." : "حفظ البيانات"}</Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>{employee ? "تعديل بيانات موظف" : "إضافة موظف جديد"}</DialogTitle>
        </DialogHeader>
        {employee ? (
          <Tabs defaultValue="data">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="data">البيانات</TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5"><History className="h-4 w-4" />السجل</TabsTrigger>
            </TabsList>
            <TabsContent value="data">{formContent}</TabsContent>
            <TabsContent value="history"><EmployeeHistoryTab employeeId={employee.id} /></TabsContent>
          </Tabs>
        ) : formContent}
      </DialogContent>
    </Dialog>
  );
}

function ExcelExportDialog({ showArchived, filteredEmployees }: { showArchived: boolean; filteredEmployees: Employee[] }) {
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(EXPORT_COLUMNS.map(c => c.id));
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [exportMode, setExportMode] = useState<'all' | 'filtered' | 'custom'>('all');

  const { data: allEmployees = [], isLoading: isLoadingAll } = useQuery<Employee[]>({
    queryKey: ['/api/employees/all-export', { showArchived }],
    queryFn: async () => {
      const params = new URLSearchParams({ all: 'true' });
      if (showArchived) params.append('includeArchived', 'true');
      const res = await fetch(`/api/employees?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('فشل في جلب بيانات الموظفين');
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (open && allEmployees.length > 0) {
      setSelectedEmployeeIds(allEmployees.map(e => e.id));
    }
  }, [open, allEmployees]);

  useEffect(() => {
    if (!open) return;
    if (exportMode === 'all') setSelectedEmployeeIds(allEmployees.map(e => e.id));
    else if (exportMode === 'filtered') setSelectedEmployeeIds(filteredEmployees.map(e => e.id));
  }, [exportMode, allEmployees, filteredEmployees, open]);

  const toggleColumn = (id: string) => setSelectedColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  const toggleEmployee = (id: number) => {
    setExportMode('custom');
    setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]);
  };

  const handleExport = () => {
    const pool = exportMode === 'filtered' ? filteredEmployees : allEmployees;
    const selectedEmployees = pool.filter(emp => selectedEmployeeIds.includes(emp.id));
    const data = selectedEmployees.map(emp => {
      const row: any = {};
      selectedColumns.forEach(colId => {
        const colDef = EXPORT_COLUMNS.find(c => c.id === colId);
        if (colDef) {
          let val = (emp as any)[colId];
          if (val && (val instanceof Date || (typeof val === 'string' && val.includes('T')))) {
            try {
              const dateObj = new Date(val);
              if (dateObj.getTime() === 0 || dateObj.getFullYear() <= 1970) val = "";
              else val = format(dateObj, 'yyyy-MM-dd');
            } catch { val = ""; }
          } else if (!val) val = "";
          row[colDef.label] = val;
        }
      });
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(blob, `تقرير_الموظفين_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/20 hover:border-primary/50 text-primary" data-testid="btn-open-export">
          <FileDown className="h-4 w-4" />
          تصدير إكسل
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تصدير بيانات {showArchived ? "الموظفين المؤرشفين" : "الموظفين"} إلى Excel</DialogTitle>
        </DialogHeader>

        {isLoadingAll ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>جاري تحميل بيانات جميع الموظفين...</span>
          </div>
        ) : (
          <Tabs defaultValue="columns" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="columns">اختيار الخانات</TabsTrigger>
              <TabsTrigger value="scope">نطاق التصدير</TabsTrigger>
              <TabsTrigger value="employees">اختيار الموظفين ({selectedEmployeeIds.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="columns" className="py-4">
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => setSelectedColumns(EXPORT_COLUMNS.map(c => c.id))}>تحديد الكل</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedColumns([])}>إلغاء التحديد</Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {EXPORT_COLUMNS.map(col => (
                  <div key={col.id} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox id={`col-${col.id}`} checked={selectedColumns.includes(col.id)} onCheckedChange={() => toggleColumn(col.id)} />
                    <Label htmlFor={`col-${col.id}`} className="text-sm cursor-pointer">{col.label}</Label>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="scope" className="py-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">اختر نطاق البيانات التي تريد تصديرها:</p>
                {[
                  { value: 'all', label: `جميع الموظفين`, desc: `تصدير كامل البيانات (${allEmployees.length} موظف)`, count: allEmployees.length },
                  { value: 'filtered', label: `نتائج البحث الحالية`, desc: `تصدير الموظفين المعروضين حسب الفلتر أو البحث الحالي (${filteredEmployees.length} موظف)`, count: filteredEmployees.length },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setExportMode(opt.value as any)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${exportMode === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${exportMode === opt.value ? 'border-primary' : 'border-muted-foreground'}`}>
                      {exportMode === opt.value && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="employees" className="py-4">
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => { setExportMode('all'); setSelectedEmployeeIds(allEmployees.map(e => e.id)); }}>تحديد الكل</Button>
                <Button variant="outline" size="sm" onClick={() => { setExportMode('custom'); setSelectedEmployeeIds([]); }}>إلغاء التحديد</Button>
                {filteredEmployees.length < allEmployees.length && (
                  <Button variant="outline" size="sm" onClick={() => { setExportMode('filtered'); setSelectedEmployeeIds(filteredEmployees.map(e => e.id)); }} className="text-primary border-primary/40">
                    تحديد المفلتر ({filteredEmployees.length})
                  </Button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>الاسم والكنية</TableHead>
                      <TableHead>الرقم الوطني</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEmployees.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell><Checkbox checked={selectedEmployeeIds.includes(emp.id)} onCheckedChange={() => toggleEmployee(emp.id)} /></TableCell>
                        <TableCell>{emp.fullName}</TableCell>
                        <TableCell>{emp.nationalId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={handleExport} disabled={isLoadingAll || selectedColumns.length === 0 || selectedEmployeeIds.length === 0} data-testid="btn-export">
            تصدير الملف ({selectedEmployeeIds.length} موظف)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const generateWordDoc = async (employee: Employee) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: "بطاقة موظف التفصيلية", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "البيانات الشخصية:", bold: true, size: 32, rightToLeft: true, color: "2b6cb0" })], alignment: AlignmentType.RIGHT }),
        ...[
          { label: "الاسم والكنية", value: employee.fullName },
          { label: "اسم الأب", value: employee.fatherName },
          { label: "اسم الأم", value: employee.motherName },
          { label: "مكان الولادة", value: employee.placeOfBirth },
          { label: "تاريخ الولادة", value: employee.dateOfBirth && new Date(employee.dateOfBirth).getFullYear() > 1970 ? format(new Date(employee.dateOfBirth), 'dd/MM/yyyy') : "" },
          { label: "محل ورقم القيد", value: employee.registryPlaceAndNumber },
          { label: "الرقم الوطني", value: employee.nationalId },
          { label: "رقم شام كاش", value: employee.shamCashNumber || "غير متوفر" },
          { label: "الجنس", value: employee.gender },
          { label: "رقم الجوال", value: employee.mobile },
          { label: "العنوان", value: employee.address },
        ].map(item => new Paragraph({ children: [new TextRun({ text: `${item.label}: `, bold: true, rightToLeft: true }), new TextRun({ text: String(item.value || ""), rightToLeft: true })], alignment: AlignmentType.RIGHT, spacing: { before: 100 } })),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "البيانات الوظيفية:", bold: true, size: 32, rightToLeft: true, color: "2b6cb0" })], alignment: AlignmentType.RIGHT }),
        ...[
          { label: "الشهادة", value: (employee as any).certificate },
          { label: "نوع الشهادة", value: employee.certificateType },
          { label: "الاختصاص", value: employee.specialization },
          { label: "الصفة الوظيفية", value: employee.jobTitle },
          { label: "الفئة", value: employee.category },
          { label: "الوضع الوظيفي", value: employee.employmentStatus },
          { label: "رقم قرار التعيين", value: employee.appointmentDecisionNumber },
          { label: "تاريخ قرار التعيين", value: employee.appointmentDecisionDate && new Date(employee.appointmentDecisionDate).getFullYear() > 1970 ? format(new Date(employee.appointmentDecisionDate), 'dd/MM/yyyy') : "" },
          { label: "أول مباشرة بالدولة", value: employee.firstStateStart && new Date(employee.firstStateStart).getFullYear() > 1970 ? format(new Date(employee.firstStateStart), 'dd/MM/yyyy') : "" },
          { label: "أول مباشرة بالمديرية", value: employee.firstDirectorateStart && new Date(employee.firstDirectorateStart).getFullYear() > 1970 ? format(new Date(employee.firstDirectorateStart), 'dd/MM/yyyy') : "" },
          { label: "أول مباشرة بالقسم", value: employee.firstDepartmentStart && new Date(employee.firstDepartmentStart).getFullYear() > 1970 ? format(new Date(employee.firstDepartmentStart), 'dd/MM/yyyy') : "" },
          { label: "وضع العامل الحالي", value: employee.currentStatus },
          { label: "العمل المكلف به", value: employee.assignedWork },
          { label: "ملاحظات", value: employee.notes || "لا يوجد" },
        ].map(item => new Paragraph({ children: [new TextRun({ text: `${item.label}: `, bold: true, rightToLeft: true }), new TextRun({ text: String(item.value || ""), rightToLeft: true })], alignment: AlignmentType.RIGHT, spacing: { before: 100 } })),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `بطاقة_${employee.fullName}.docx`);
};

function EmployeeTableSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10"></TableHead>
            <TableHead className="text-right w-14">الرقم</TableHead>
            <TableHead className="text-right">الاسم</TableHead>
            <TableHead className="text-right">المسمى الوظيفي</TableHead>
            <TableHead className="text-right">الفئة</TableHead>
            <TableHead className="text-right">رقم الجوال</TableHead>
            <TableHead className="text-left">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
              <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
              <TableCell><Skeleton className="h-4 w-36" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><div className="flex gap-1 justify-end"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyState({ onAddEmployee, showArchived, hasSearch }: { onAddEmployee: () => void; showArchived: boolean; hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-5 rounded-xl border bg-card shadow-sm">
      <div className="relative">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-12 w-12 text-primary/50" />
        </div>
        {!showArchived && !hasSearch && (
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <Plus className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xl font-bold text-foreground mb-1">
          {hasSearch ? "لا توجد نتائج مطابقة" : showArchived ? "الأرشيف فارغ" : "لا يوجد موظفون بعد"}
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          {hasSearch
            ? "جرّب تعديل كلمة البحث أو مسحها لعرض جميع الموظفين"
            : showArchived
            ? "لا يوجد موظفون منقولون أو مستقيلون حتى الآن"
            : "ابدأ بإضافة أول موظف لتظهر هنا بياناته ويمكنك إدارتها"}
        </p>
      </div>
      {!showArchived && !hasSearch && (
        <Button onClick={onAddEmployee} className="gap-2 shadow-lg shadow-primary/20 mt-2" size="lg" data-testid="btn-add-first-employee">
          <Plus className="h-5 w-5" />
          أضف أول موظف
        </Button>
      )}
    </div>
  );
}

function EmployeeCard({ emp, index, isAdmin, showArchived, onEdit, onArchive, onDelete, selected, onSelect }: {
  emp: Employee; index: number; isAdmin: boolean; showArchived: boolean;
  onEdit: () => void; onArchive: () => void; onDelete: () => void;
  selected: boolean; onSelect: () => void;
}) {
  const empStatus = normalizeStatus(emp.currentStatus || '');
  const statusColor = STATUS_COLORS[empStatus] || '#8b5cf6';
  return (
    <Card className={`relative overflow-hidden border-border/60 hover:shadow-md transition-all duration-200 ${selected ? 'ring-2 ring-primary border-primary' : ''}`} data-testid={`card-employee-${emp.id}`}>
      <CardContent className="p-4">
        <div className="absolute top-3 right-3">
          <Checkbox checked={selected} onCheckedChange={onSelect} data-testid={`checkbox-employee-${emp.id}`} />
        </div>
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
            {emp.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">{emp.fullName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{emp.jobTitle || emp.specialization || '—'}</p>
          </div>
          <Badge variant="outline" className="text-xs font-bold" style={{ borderColor: statusColor + '60', color: statusColor, backgroundColor: statusColor + '15' }}>
            {empStatus || '—'}
          </Badge>
        </div>
        <div className="mt-3 pt-3 border-t space-y-1.5 text-right">
          {emp.category && <div className="flex justify-between text-xs"><span className="text-muted-foreground">الفئة:</span><span className="font-medium">{emp.category}</span></div>}
          {emp.mobile && <div className="flex justify-between text-xs"><span className="text-muted-foreground">الجوال:</span><span className="font-medium" dir="ltr">{emp.mobile}</span></div>}
          {emp.specialization && <div className="flex justify-between text-xs"><span className="text-muted-foreground">الاختصاص:</span><span className="font-medium text-left max-w-[100px] truncate">{emp.specialization}</span></div>}
        </div>
        <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t">
          {(!showArchived || isAdmin) && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="تعديل" data-testid={`btn-edit-card-${emp.id}`}>
              <Pencil className="h-3.5 w-3.5 text-blue-600" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generateWordDoc(emp)} title="تصدير Word" data-testid={`btn-word-card-${emp.id}`}>
            <FileText className="h-3.5 w-3.5 text-orange-600" />
          </Button>
          {!showArchived && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={onArchive} title="أرشفة" data-testid={`btn-archive-card-${emp.id}`}>
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="حذف" data-testid={`btn-delete-card-${emp.id}`}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
                  <AlertDialogDescription className="text-right">هل أنت متأكد من حذف الموظف {emp.fullName}؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const { employees, isLoading, deleteEmployee, updateEmployee, deleteAttachment } = useEmployees(showArchived);
  const { toast } = useToast();

  const isAdmin = user?.role === 'admin';

  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [selectedEmployeeForArchive, setSelectedEmployeeForArchive] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionStatus, setBulkActionStatus] = useState<string>('');
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const handleArchive = (employee: Employee) => {
    setSelectedEmployeeForArchive(employee);
    setArchiveConfirmOpen(true);
  };

  const confirmArchive = (newStatus: string) => {
    if (selectedEmployeeForArchive) {
      updateEmployee({ id: selectedEmployeeForArchive.id, data: { currentStatus: newStatus } as any });
      setArchiveConfirmOpen(false);
      setSelectedEmployeeForArchive(null);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (emp.nationalId && emp.nationalId.includes(search));
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, pageSize, showArchived]);
  useEffect(() => { setSelectedIds(new Set()); }, [showArchived, search]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedEmployees.map(e => e.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBulkStatusChange = async (status: string) => {
    setIsBulkUpdating(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => fetch(`/api/employees/${id}`, {
        method: 'PUT',
        body: (() => { const fd = new FormData(); fd.append('currentStatus', status); return fd; })(),
      })));
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({ title: "تمت العملية بنجاح", description: `تم تغيير حالة ${ids.length} موظف إلى "${status}"` });
      setSelectedIds(new Set());
      setBulkActionOpen(false);
    } catch {
      toast({ title: "خطأ", description: "فشلت العملية الجماعية", variant: "destructive" });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkExport = () => {
    const selectedEmployees = employees.filter(e => selectedIds.has(e.id));
    const data = selectedEmployees.map(emp => {
      const row: any = {};
      EXPORT_COLUMNS.forEach(col => {
        let val = (emp as any)[col.id];
        if (val && (val instanceof Date || (typeof val === 'string' && val.includes('T')))) {
          try {
            const d = new Date(val);
            val = d.getFullYear() > 1970 ? format(d, 'yyyy-MM-dd') : '';
          } catch { val = ''; }
        } else if (!val) val = '';
        row[col.label] = val;
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `تصدير_محدد_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col gap-6">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-4 bg-card p-4 rounded-xl border">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <EmployeeTableSkeleton />
        </div>
      </Layout>
    );
  }

  const allPageSelected = paginatedEmployees.length > 0 && paginatedEmployees.every(e => selectedIds.has(e.id));

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{showArchived ? "أرشيف الموظفين" : "إدارة الموظفين"}</h1>
            <p className="text-muted-foreground mt-1">{showArchived ? "قائمة الموظفين المنقولين والمستقيلين" : "قائمة بجميع الموظفين الحاليين وإدارة بياناتهم"}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived(!showArchived)} className="gap-2" data-testid="btn-toggle-archive">
              <Archive className="h-4 w-4" />
              {showArchived ? "عرض الموظفين الحاليين" : "عرض الأرشيف"}
            </Button>
            <EmployeeFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} employee={editingEmployee} />
            {!showArchived && (
              <Button onClick={() => { setEditingEmployee(undefined); setIsAddOpen(true); }} className="gap-2 shadow-lg shadow-primary/20" data-testid="btn-add-employee">
                <Plus className="h-4 w-4" />
                إضافة موظف
              </Button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 flex-wrap bg-primary/5 border border-primary/30 rounded-xl p-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm text-primary">{selectedIds.size} موظف محدد</span>
            </div>
            <div className="flex gap-2 flex-wrap flex-1">
              <AlertDialog open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary" data-testid="btn-bulk-status">
                    تغيير الحالة
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-right">تغيير حالة {selectedIds.size} موظف</AlertDialogTitle>
                    <AlertDialogDescription className="text-right">اختر الحالة الجديدة التي سيتم تطبيقها على جميع الموظفين المحددين.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Select onValueChange={setBulkActionStatus}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر الحالة الجديدة..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="على رأس عمله">على رأس عمله</SelectItem>
                        <SelectItem value="إجازة بلا أجر">إجازة بلا أجر</SelectItem>
                        <SelectItem value="نقل">نقل</SelectItem>
                        <SelectItem value="استقالة">استقالة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <AlertDialogFooter className="flex-row-reverse gap-2">
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { if (bulkActionStatus) handleBulkStatusChange(bulkActionStatus); }}
                      disabled={!bulkActionStatus || isBulkUpdating}
                      className="bg-primary"
                    >
                      {isBulkUpdating ? "جاري التطبيق..." : "تطبيق"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" variant="outline" className="gap-1.5 border-green-500/40 text-green-700" onClick={handleBulkExport} data-testid="btn-bulk-export">
                <FileDown className="h-4 w-4" />
                تصدير المحددين
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="text-muted-foreground ml-auto" onClick={() => setSelectedIds(new Set())} data-testid="btn-clear-selection">
              <X className="h-4 w-4" />
              إلغاء التحديد
            </Button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl shadow-sm border">
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث عن موظف بالاسم أو الرقم الوطني..." className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap text-sm">عدد السجلات:</Label>
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-[80px]" data-testid="select-pageSize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex rounded-lg border overflow-hidden">
              <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('table')} title="عرض جدول" data-testid="btn-view-table">
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none border-r" onClick={() => setViewMode('cards')} title="عرض بطاقات" data-testid="btn-view-cards">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <ExcelExportDialog showArchived={showArchived} filteredEmployees={filteredEmployees} />
          </div>
        </div>

        <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">تأكيد الأرشفة</AlertDialogTitle>
              <AlertDialogDescription className="text-right">يرجى اختيار الحالة الوظيفية الجديدة للموظف {selectedEmployeeForArchive?.fullName} لإتمام عملية الأرشفة.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              <Label className="text-right block">الحالة الوظيفية الجديدة</Label>
              <Select onValueChange={(val) => confirmArchive(val)}>
                <SelectTrigger className="text-right"><SelectValue placeholder="اختر الحالة..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="نقل">نقل</SelectItem>
                  <SelectItem value="استقالة">استقالة</SelectItem>
                  <SelectItem value="إجازة بلا أجر">إجازة بلا أجر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel onClick={() => { setArchiveConfirmOpen(false); setSelectedEmployeeForArchive(null); }}>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {filteredEmployees.length === 0 ? (
          <EmptyState onAddEmployee={() => { setEditingEmployee(undefined); setIsAddOpen(true); }} showArchived={showArchived} hasSearch={search.length > 0} />
        ) : viewMode === 'table' ? (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} data-testid="checkbox-select-all" />
                  </TableHead>
                  <TableHead className="text-right w-14">الرقم</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">المسمى الوظيفي</TableHead>
                  <TableHead className="text-right">الفئة</TableHead>
                  <TableHead className="text-right">رقم الجوال</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.map((emp, index) => (
                  <TableRow key={emp.id} className={`hover:bg-muted/50 transition-colors ${selectedIds.has(emp.id) ? 'bg-primary/5' : ''}`} data-testid={`row-employee-${emp.id}`}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(emp.id)} onCheckedChange={() => toggleSelect(emp.id)} data-testid={`checkbox-employee-${emp.id}`} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono text-center" data-testid={`text-seq-${emp.id}`}>{startIndex + index + 1}</TableCell>
                    <TableCell className="font-medium">{emp.fullName}</TableCell>
                    <TableCell>{emp.jobTitle}</TableCell>
                    <TableCell>{emp.category}</TableCell>
                    <TableCell>{emp.mobile}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {(!showArchived || isAdmin) && (
                          <Button variant="ghost" size="icon" onClick={() => { setEditingEmployee(emp); setIsAddOpen(true); }} title="تعديل" data-testid={`btn-edit-employee-${emp.id}`}>
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => generateWordDoc(emp)} title="تصدير Word" data-testid={`btn-word-${emp.id}`}>
                          <FileText className="h-4 w-4 text-orange-600" />
                        </Button>
                        {!showArchived && (
                          <Button variant="ghost" size="icon" onClick={() => handleArchive(emp)} title="أرشفة" className="text-amber-600" data-testid={`btn-archive-${emp.id}`}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="حذف" data-testid={`btn-delete-${emp.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription className="text-right">هل أنت متأكد من حذف الموظف {emp.fullName}؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteEmployee(emp.id)} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedEmployees.map((emp, index) => (
              <EmployeeCard
                key={emp.id}
                emp={emp}
                index={startIndex + index}
                isAdmin={isAdmin}
                showArchived={showArchived}
                onEdit={() => { setEditingEmployee(emp); setIsAddOpen(true); }}
                onArchive={() => handleArchive(emp)}
                onDelete={() => deleteEmployee(emp.id)}
                selected={selectedIds.has(emp.id)}
                onSelect={() => toggleSelect(emp.id)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} data-testid="btn-prev-page">السابق</Button>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="w-8 h-8 p-0 shrink-0" onClick={() => setCurrentPage(page)} data-testid={`btn-page-${page}`}>{page}</Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} data-testid="btn-next-page">التالي</Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
