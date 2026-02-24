import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useEmployees, useEmployee } from "@/hooks/use-employees";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, FileDown, FileText, Trash2, Pencil, Archive, AlertCircle, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmployeeSchema, type InsertEmployee, type Employee } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Columns for export picker
const EXPORT_COLUMNS = [
  { id: "fullName", label: "الاسم والكنية" },
  { id: "fatherName", label: "اسم الأب" },
  { id: "motherName", label: "اسم الأم" },
  { id: "placeOfBirth", label: "مكان الولادة" },
  { id: "dateOfBirth", label: "تاريخ الولادة" },
  { id: "registryPlaceAndNumber", label: "محل ورقم القيد" },
  { id: "nationalId", label: "الرقم الوطني" },
  { id: "shamCashNumber", label: "رقم شام كاش" },
  { id: "gender", label: "الجنس" },
  { id: "certificateType", label: "نوع الشهادة" },
  { id: "specialization", label: "الاختصاص" },
  { id: "jobTitle", label: "الصفة الوظيفية" },
  { id: "category", label: "الفئة" },
  { id: "employmentStatus", label: "الوضع الوظيفي" },
  { id: "appointmentDecisionNumber", label: "رقم قرار التعيين" },
  { id: "appointmentDecisionDate", label: "تاريخ قرار التعيين" },
  { id: "firstStateStart", label: "أول مباشرة بالدولة" },
  { id: "firstDirectorateStart", label: "أول مباشرة بالمديرية" },
  { id: "firstDepartmentStart", label: "أول مباشرة بالقسم" },
  { id: "currentStatus", label: "وضع العامل الحالي" },
  { id: "assignedWork", label: "العمل المكلف به" },
  { id: "mobile", label: "رقم الجوال" },
  { id: "address", label: "العنوان" },
  { id: "notes", label: "ملاحظات" },
];

function EmployeeFormDialog({ 
  open, 
  onOpenChange, 
  employee 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
}) {
  const { user } = useAuth();
  const { createEmployee, updateEmployee, deleteAttachment, isCreating, isUpdating } = useEmployees();
  const { toast } = useToast();
  
    const form = useForm<InsertEmployee>({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: {
      fullName: "", fatherName: "", motherName: "", placeOfBirth: "",
      registryPlaceAndNumber: "", nationalId: "", shamCashNumber: "", gender: "ذكر",
      certificateType: "جامعة", specialization: "", jobTitle: "", category: "أولى",
      employmentStatus: "مثبت", appointmentDecisionNumber: "",
      currentStatus: "على رأس عمله", assignedWork: "ورشة القسم الهندسي", mobile: "", address: "", notes: "",
      dateOfBirth: null as any, appointmentDecisionDate: null as any, firstStateStart: null as any,
      firstDirectorateStart: null as any, firstDepartmentStart: null as any,
    }
  });

  // Update form values when employee changes
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
        certificateType: (employee.certificateType as any) || "جامعة",
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
        certificateType: "جامعة", specialization: "", jobTitle: "", category: "أولى",
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

    // Extract the filename from the path
    const fileName = path.split('/').pop();
    if (!fileName) return;

    try {
      await deleteAttachment({ id: employee.id, index: fileName });
    } catch (error) {
      // Error handled in hook
    }
  };

  function onSubmit(data: InsertEmployee) {
    console.log("Form data on submit:", data);
    
    const formData = new FormData();
    
    // Append all fields from the validated data object
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof Date) {
        formData.append(key, value.toISOString());
      } else if (value !== null && value !== undefined && value !== "") {
        formData.append(key, String(value));
      } else if (value === "" || value === null) {
        // Explicitly send empty string as null for backend to handle
        formData.append(key, "");
      }
    });

    if (documentFiles.length > 0) {
      documentFiles.forEach((file) => {
        formData.append("documents", file);
      });
    }

    if (employee) {
      updateEmployee({ id: employee.id, data: formData as any }, { 
        onSuccess: () => {
          onOpenChange(false);
          setDocumentFiles([]);
        },
        onError: (error: any) => {
          console.error("Update error:", error);
        }
      });
    } else {
      createEmployee(formData as any, { 
        onSuccess: () => {
          onOpenChange(false);
          setDocumentFiles([]);
        },
        onError: (error: any) => {
          console.error("Create error:", error);
          if (error.response?.data?.field) {
            form.setError(error.response.data.field as any, {
              type: "manual",
              message: error.response.data.message
            });
          }
        }
      });
    }
  }

  const onInvalid = (errors: any) => {
    console.error("Form validation errors:", errors);
    toast({
      title: "خطأ في الإدخال",
      description: "يرجى التحقق من كافة الحقول المطلوبة (المشار إليها بالنجمة)",
      variant: "destructive"
    });
  };

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>{employee ? "تعديل بيانات موظف" : "إضافة موظف جديد"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            <div className="grid grid-cols-1 gap-8">
              {/* Section 1: Personal Data */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">أولاً: البيانات الشخصية</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>الاسم والكنية</FormLabel><FormControl><Input {...field} className="text-right" autoComplete="off" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="fatherName" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>اسم الأب</FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="motherName" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>اسم الأم</FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>الجنس</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="text-right"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="ذكر">ذكر</SelectItem><SelectItem value="أنثى">أنثى</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="placeOfBirth" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>مكان الولادة</FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel>تاريخ الولادة</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          className="text-right" 
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} 
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="registryPlaceAndNumber" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>محل ورقم القيد</FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="nationalId" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>الرقم الوطني <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="shamCashNumber" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>رقم شام كاش</FormLabel><FormControl><Input {...field} className="text-right" value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mobile" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>رقم الجوال</FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="md:col-span-2 text-right"><FormLabel>العنوان</FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* Section 2: Professional Data */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">ثانياً: البيانات الوظيفية</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="jobTitle" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>الصفة الوظيفية</FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="specialization" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>الاختصاص</FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>الفئة</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="text-right"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="أولى">أولى</SelectItem><SelectItem value="ثانية">ثانية</SelectItem><SelectItem value="ثالثة">ثالثة</SelectItem><SelectItem value="رابعة">رابعة</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currentStatus" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>وضع العامل الحالي</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="text-right"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="على رأس عمله">على رأس عمله</SelectItem><SelectItem value="إجازة بلا أجر">إجازة بلا أجر</SelectItem><SelectItem value="نقل">نقل</SelectItem><SelectItem value="استقالة">استقالة</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="assignedWork" render={({ field }) => (
                    <FormItem className="md:col-span-2 text-right"><FormLabel>العمل المكلف به</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="text-right"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="رئيس القسم الهندسي">رئيس القسم الهندسي</SelectItem><SelectItem value="صيانة وإشراف ومتابعة لجان">صيانة وإشراف ومتابعة لجان</SelectItem><SelectItem value="مستخدم">مستخدم</SelectItem><SelectItem value="ورشة القسم الهندسي">ورشة القسم الهندسي</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="appointmentDecisionNumber" render={({ field }) => (
                    <FormItem className="text-right"><FormLabel>رقم قرار التعيين</FormLabel><FormControl><Input {...field} className="text-right" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="appointmentDecisionDate" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel>تاريخ قرار التعيين</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          className="text-right" 
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} 
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="firstStateStart" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel>أول مباشرة بالدولة</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          className="text-right" 
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} 
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="firstDirectorateStart" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel>أول مباشرة بالمديرية</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          className="text-right" 
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} 
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="firstDepartmentStart" render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel>أول مباشرة بالقسم</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          className="text-right" 
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} 
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem className="md:col-span-2 text-right"><FormLabel>ملاحظات</FormLabel><FormControl><Input {...field} className="text-right" value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Plus className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">المستندات والمرفقات</h3>
                </div>
                <div className="text-right">
                  <Label>رفع مستندات الموظف</Label>
                  <Input type="file" multiple onChange={(e) => setDocumentFiles(prev => [...prev, ...Array.from(e.target.files || [])])} className="mt-1" />
                  
                  {employee?.documentPaths && Array.isArray(employee.documentPaths) && (employee.documentPaths as string[]).length > 0 ? (
                    <div className="mt-4">
                      <Label className="text-sm font-bold">المستندات المرفوعة حالياً:</Label>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        {employee.documentPaths && (employee.documentPaths as string[]).map((path, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg text-sm">
                            <a href={path} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {path.split('/').pop() || `مستند ${idx + 1}`}
                            </a>
                            {user?.role === 'admin' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                type="button" 
                                onClick={() => handleDeleteAttachment(path)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "جاري الحفظ..." : "حفظ البيانات"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ExcelExportDialog({ 
  employees 
}: { 
  employees: Employee[] 
}) {
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(EXPORT_COLUMNS.map(c => c.id));
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>(employees.map(e => e.id));

  useEffect(() => {
    setSelectedEmployeeIds(employees.map(e => e.id));
  }, [employees]);

  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleEmployee = (id: number) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const selectedEmployees = employees.filter(emp => selectedEmployeeIds.includes(emp.id));
    const data = selectedEmployees.map(emp => {
      const row: any = {};
      selectedColumns.forEach(colId => {
        const colDef = EXPORT_COLUMNS.find(c => c.id === colId);
        if (colDef) {
          let val = (emp as any)[colId];
          if (val && (val instanceof Date || (typeof val === 'string' && val.includes('T')))) {
            try {
              const dateObj = new Date(val);
              // Check if it's 1970-01-01 (Unix epoch) which often represents null/empty in some systems
              if (dateObj.getTime() === 0 || dateObj.getFullYear() <= 1970) {
                val = "";
              } else {
                val = format(dateObj, 'yyyy-MM-dd');
              }
            } catch (e) {
              val = "";
            }
          } else if (!val) {
            val = "";
          }
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
        <Button variant="outline" className="gap-2 border-primary/20 hover:border-primary/50 text-primary">
          <FileDown className="h-4 w-4" />
          تصدير إكسل
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تصدير بيانات الموظفين إلى Excel</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="columns" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="columns">اختيار الخانات</TabsTrigger>
            <TabsTrigger value="employees">اختيار الموظفين</TabsTrigger>
          </TabsList>
          
          <TabsContent value="columns" className="py-4">
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedColumns(EXPORT_COLUMNS.map(c => c.id))}>تحديد الكل</Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedColumns([])}>إلغاء التحديد</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EXPORT_COLUMNS.map(col => (
                <div key={col.id} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id={`col-${col.id}`} 
                    checked={selectedColumns.includes(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                  />
                  <Label htmlFor={`col-${col.id}`} className="text-sm cursor-pointer">{col.label}</Label>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="employees" className="py-4">
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedEmployeeIds(employees.map(e => e.id))}>تحديد الكل</Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedEmployeeIds([])}>إلغاء التحديد</Button>
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
                  {employees.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedEmployeeIds.includes(emp.id)}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                        />
                      </TableCell>
                      <TableCell>{emp.fullName}</TableCell>
                      <TableCell>{emp.nationalId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={handleExport} disabled={selectedColumns.length === 0 || selectedEmployeeIds.length === 0}>تصدير الملف ({selectedEmployeeIds.length} موظف)</Button>
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
        new Paragraph({
          text: "بطاقة موظف التفصيلية",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "" }), // spacer
        new Paragraph({
          children: [
            new TextRun({ text: "البيانات الشخصية:", bold: true, size: 32, rightToLeft: true, color: "2b6cb0" }),
          ],
          alignment: AlignmentType.RIGHT,
        }),
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
        ].map(item => new Paragraph({
          children: [
            new TextRun({ text: `${item.label}: `, bold: true, rightToLeft: true }),
            new TextRun({ text: String(item.value || ""), rightToLeft: true }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100 }
        })),
        new Paragraph({ text: "" }), // spacer
        new Paragraph({
          children: [
            new TextRun({ text: "البيانات الوظيفية:", bold: true, size: 32, rightToLeft: true, color: "2b6cb0" }),
          ],
          alignment: AlignmentType.RIGHT,
        }),
        ...[
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
        ].map(item => new Paragraph({
          children: [
            new TextRun({ text: `${item.label}: `, bold: true, rightToLeft: true }),
            new TextRun({ text: String(item.value || ""), rightToLeft: true }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100 }
        })),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `بطاقة_${employee.fullName}.docx`);
};

export default function Employees() {
  const { user } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const { employees, isLoading, deleteEmployee, updateEmployee, deleteAttachment } = useEmployees(showArchived);
  
  const isAdmin = user?.role === 'admin';
  
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [selectedEmployeeForArchive, setSelectedEmployeeForArchive] = useState<Employee | null>(null);

  const handleArchive = (employee: Employee) => {
    setSelectedEmployeeForArchive(employee);
    setArchiveConfirmOpen(true);
  };

  const confirmArchive = (newStatus: string) => {
    if (selectedEmployeeForArchive) {
      updateEmployee({ 
        id: selectedEmployeeForArchive.id, 
        data: { currentStatus: newStatus } as any 
      });
      setArchiveConfirmOpen(false);
      setSelectedEmployeeForArchive(null);
    }
  };

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
                         (emp.nationalId && emp.nationalId.includes(search));
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize, showArchived]);

  if (isLoading) return <Layout><div className="p-8 text-center">جاري تحميل البيانات...</div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {showArchived ? "أرشيف الموظفين" : "إدارة الموظفين"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {showArchived 
                ? "قائمة الموظفين المنقولين والمستقيلين" 
                : "قائمة بجميع الموظفين الحاليين وإدارة بياناتهم"}
            </p>
          </div>
          <div className="flex gap-2">
             <Button 
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "عرض الموظفين الحاليين" : "عرض الأرشيف"}
            </Button>
            {!showArchived && (
              <>
                <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-right">تأكيد الأرشفة</AlertDialogTitle>
                      <AlertDialogDescription className="text-right">
                        يرجى اختيار الحالة الجديدة للموظف {selectedEmployeeForArchive?.fullName} لنقله إلى الأرشيف:
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Select onValueChange={confirmArchive}>
                        <SelectTrigger className="text-right">
                          <SelectValue placeholder="اختر الحالة..." />
                        </SelectTrigger>
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
              </>
            )}
            <EmployeeFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} employee={editingEmployee} />
            {!showArchived && (
              <Button onClick={() => { setEditingEmployee(undefined); setIsAddOpen(true); }} className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                إضافة موظف
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl shadow-sm border">
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="بحث عن موظف بالاسم أو الرقم الوطني..." 
              className="pr-9" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap text-sm">عدد السجلات:</Label>
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ExcelExportDialog employees={filteredEmployees} />
          </div>
        </div>

        <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">تأكيد الأرشفة</AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                يرجى اختيار الحالة الوظيفية الجديدة للموظف {selectedEmployeeForArchive?.fullName} لإتمام عملية الأرشفة.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              <Label className="text-right block">الحالة الوظيفية الجديدة</Label>
              <Select onValueChange={(val) => confirmArchive(val)}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر الحالة..." />
                </SelectTrigger>
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

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">المسمى الوظيفي</TableHead>
                <TableHead className="text-right">الفئة</TableHead>
                <TableHead className="text-right">رقم الجوال</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    لا يوجد موظفين مطابقين للبحث
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmployees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{emp.fullName}</TableCell>
                    <TableCell>{emp.jobTitle}</TableCell>
                    <TableCell>{emp.category}</TableCell>
                    <TableCell>{emp.mobile}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {(!showArchived || isAdmin) && (
                          <Button variant="ghost" size="icon" onClick={() => { setEditingEmployee(emp); setIsAddOpen(true); }} title="تعديل">
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => generateWordDoc(emp)} title="تصدير Word">
                          <FileText className="h-4 w-4 text-orange-600" />
                        </Button>
                        {!showArchived && (
                          <Button variant="ghost" size="icon" onClick={() => handleArchive(emp)} title="أرشفة" className="text-amber-600">
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="حذف">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription className="text-right">
                                  هل أنت متأكد من حذف الموظف {emp.fullName}؟ لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteEmployee(emp.id)} className="bg-destructive text-destructive-foreground">
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              السابق
            </Button>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0 shrink-0"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              التالي
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
