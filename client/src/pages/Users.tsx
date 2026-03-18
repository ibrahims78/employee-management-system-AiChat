import { useState, useEffect, useRef } from "react";
import { useUsers } from "@/hooks/use-users";
import { useBotUsers } from "@/hooks/use-bot-users";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Pencil, Bot, Users as UsersIcon, Phone, Key, FileText, Eye, X, RefreshCw, Wand2, ChevronsUpDown, Check, UserSearch, PenLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, insertBotUserSchema, type InsertUser, type User, type BotUser, type InsertBotUser } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import type { Employee } from "@shared/schema";

// ─── System User Form ────────────────────────────────────────────────────────

function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}) {
  const { createUser, updateUser, isCreating, isUpdating } = useUsers();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: user
      ? { username: user.username, password: user.password, role: user.role }
      : { username: "", password: "", role: "employee" },
  });

  function onSubmit(data: InsertUser) {
    if (user) {
      updateUser({ id: user.id, data }, { onSuccess: () => onOpenChange(false) });
    } else {
      createUser(data, { onSuccess: () => onOpenChange(false) });
    }
  }

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem><FormLabel>اسم المستخدم</FormLabel><FormControl><Input data-testid="input-username" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>كلمة المرور</FormLabel><FormControl><Input data-testid="input-password" type="password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem><FormLabel>الصلاحية</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="employee">موظف</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button data-testid="button-submit-user" type="submit" disabled={isPending}>
                {isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bot User Form ────────────────────────────────────────────────────────────

const botUserFormSchema = insertBotUserSchema.extend({
  fullName: z.string().min(2, "الاسم مطلوب"),
  phoneNumber: z.string().min(7, "رقم الهاتف غير صالح"),
  activationCode: z.string().min(1, "كود التفعيل مطلوب"),
  deactivationCode: z.string().min(1, "كود إلغاء التفعيل مطلوب"),
});

type BotUserFormValues = z.infer<typeof botUserFormSchema>;

function generateCode(prefix: string, length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function BotUserFormDialog({
  open,
  onOpenChange,
  botUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botUser?: BotUser;
}) {
  const { createBotUser, updateBotUser, isCreating, isUpdating } = useBotUsers();
  const [inputMode, setInputMode] = useState<"search" | "manual">("search");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", "allStatuses"],
    queryFn: async () => {
      const res = await fetch("/api/employees?allStatuses=true");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: open && inputMode === "search",
  });

  const filteredEmployees = employees.filter((e) =>
    e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.mobile && e.mobile.includes(employeeSearch))
  );

  const form = useForm<BotUserFormValues>({
    resolver: zodResolver(botUserFormSchema),
    defaultValues: botUser
      ? {
          fullName: botUser.fullName,
          phoneNumber: botUser.phoneNumber,
          activationCode: botUser.activationCode,
          deactivationCode: botUser.deactivationCode,
          isBotActive: botUser.isBotActive,
          lastInteraction: botUser.lastInteraction,
        }
      : {
          fullName: "",
          phoneNumber: "",
          activationCode: "",
          deactivationCode: "",
          isBotActive: false,
          lastInteraction: null,
        },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        fullName: "",
        phoneNumber: "",
        activationCode: "",
        deactivationCode: "",
        isBotActive: false,
        lastInteraction: null,
      });
      setSelectedEmployeeId(null);
      setEmployeeSearch("");
      setInputMode("search");
    }
  }, [open]);

  function handleSelectEmployee(employee: Employee) {
    setSelectedEmployeeId(employee.id);
    setEmployeePopoverOpen(false);
    form.setValue("fullName", employee.fullName, { shouldValidate: true });
    const phone = (employee.mobile || "").replace(/\D/g, "").replace(/^0+/, "");
    form.setValue("phoneNumber", phone, { shouldValidate: true });
    autoGenerateCodes(employee.fullName, phone);
  }

  function autoGenerateCodes(name: string, phone: string) {
    if (name && phone) {
      form.setValue("activationCode", generateCode("ON", 4), { shouldValidate: true });
      form.setValue("deactivationCode", generateCode("OFF", 4), { shouldValidate: true });
    }
  }

  function handleRegenerateCodes() {
    const name = form.getValues("fullName");
    const phone = form.getValues("phoneNumber");
    autoGenerateCodes(name, phone);
  }

  function onSubmit(data: BotUserFormValues) {
    if (botUser) {
      updateBotUser(
        {
          id: botUser.id,
          data: {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            activationCode: data.activationCode,
            deactivationCode: data.deactivationCode,
          },
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createBotUser(
        {
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          activationCode: data.activationCode,
          deactivationCode: data.deactivationCode,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  }

  const isPending = isCreating || isUpdating;
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const isEditMode = !!botUser;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {isEditMode ? "تعديل بيانات مستخدم البوت" : "إضافة مستخدم بوت جديد"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Mode switcher (new mode only) ── */}
        {!isEditMode && (
          <div className="flex gap-2 rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              data-testid="mode-search"
              onClick={() => {
                setInputMode("search");
                setSelectedEmployeeId(null);
                form.setValue("fullName", "");
                form.setValue("phoneNumber", "");
                form.setValue("activationCode", "");
                form.setValue("deactivationCode", "");
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all",
                inputMode === "search"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserSearch className="h-4 w-4" />
              اختر من قاعدة البيانات
            </button>
            <button
              type="button"
              data-testid="mode-manual"
              onClick={() => {
                setInputMode("manual");
                setSelectedEmployeeId(null);
                form.setValue("fullName", "");
                form.setValue("phoneNumber", "");
                form.setValue("activationCode", "");
                form.setValue("deactivationCode", "");
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all",
                inputMode === "manual"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PenLine className="h-4 w-4" />
              إدخال يدوي
            </button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* ── Employee Search (search mode) ── */}
            {!isEditMode && inputMode === "search" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ابحث عن موظف</label>
                <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      data-testid="combobox-employee"
                      className="w-full justify-between font-normal"
                    >
                      {selectedEmployee ? (
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{selectedEmployee.fullName}</span>
                          {selectedEmployee.mobile && (
                            <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                              {selectedEmployee.mobile}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">اختر موظفاً من القائمة...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                    <Command>
                      <CommandInput
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        value={employeeSearch}
                        onValueChange={setEmployeeSearch}
                        data-testid="input-employee-search"
                      />
                      <CommandList className="max-h-56">
                        <CommandEmpty>
                          <div className="py-4 text-center text-sm text-muted-foreground">
                            لا يوجد موظف بهذا الاسم
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredEmployees.slice(0, 50).map((emp) => (
                            <CommandItem
                              key={emp.id}
                              value={`${emp.fullName} ${emp.mobile ?? ""}`}
                              onSelect={() => handleSelectEmployee(emp)}
                              data-testid={`employee-option-${emp.id}`}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{emp.fullName}</span>
                                {emp.mobile && (
                                  <span className="text-xs text-muted-foreground font-mono" dir="ltr">{emp.mobile}</span>
                                )}
                              </div>
                              {selectedEmployeeId === emp.id && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedEmployee && (
                  <div className="flex items-center gap-2 rounded-lg border bg-primary/5 px-3 py-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>تم اختيار <strong>{selectedEmployee.fullName}</strong> — سيتم ملء البيانات تلقائياً</span>
                    <button
                      type="button"
                      className="mr-auto text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSelectedEmployeeId(null);
                        form.setValue("fullName", "");
                        form.setValue("phoneNumber", "");
                        form.setValue("activationCode", "");
                        form.setValue("deactivationCode", "");
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Name & Phone Fields ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الموظف الكامل</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-bot-fullname"
                      placeholder="محمد أحمد الخطيب"
                      readOnly={!isEditMode && inputMode === "search" && !!selectedEmployeeId}
                      className={cn(!isEditMode && inputMode === "search" && !!selectedEmployeeId && "bg-muted/50")}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!form.getValues("activationCode")) {
                          const phone = form.getValues("phoneNumber");
                          if (e.target.value && phone) autoGenerateCodes(e.target.value, phone);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-bot-phone"
                      placeholder="963912345678"
                      dir="ltr"
                      readOnly={!isEditMode && inputMode === "search" && !!selectedEmployeeId}
                      className={cn(!isEditMode && inputMode === "search" && !!selectedEmployeeId && "bg-muted/50")}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!form.getValues("activationCode")) {
                          const name = form.getValues("fullName");
                          if (name && e.target.value) autoGenerateCodes(name, e.target.value);
                        }
                      }}
                    />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">بالصيغة الدولية بدون + مثل: 963912345678</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── Activation Codes ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">أكواد التفعيل</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="button-regenerate-codes"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleRegenerateCodes}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  توليد تلقائي
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="activationCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-green-700 dark:text-green-400">
                      <Key className="h-3 w-3" />كود التفعيل
                    </FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-activation-code"
                        placeholder="ON####"
                        dir="ltr"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="deactivationCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-red-700 dark:text-red-400">
                      <Key className="h-3 w-3" />كود إلغاء التفعيل
                    </FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-deactivation-code"
                        placeholder="OFF####"
                        dir="ltr"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                يتم توليد الأكواد تلقائياً عند اختيار الموظف، ويمكنك تعديلها يدوياً أو إعادة التوليد
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button data-testid="button-submit-bot-user" type="submit" disabled={isPending}>
                {isPending ? "جاري الحفظ..." : isEditMode ? "حفظ التعديلات" : "إضافة المستخدم"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Document Viewer Dialog ───────────────────────────────────────────────────

function EmployeeDocsDialog({
  phoneNumber,
  open,
  onOpenChange,
}: {
  phoneNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", "allStatuses"],
    queryFn: async () => {
      const res = await fetch("/api/employees?allStatuses=true");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: open,
  });

  function normalizePhone(raw: string) {
    return raw.replace(/\D/g, "").replace(/^0+/, "");
  }

  const matched = employees.find(
    (e) => e.mobile && normalizePhone(e.mobile) === normalizePhone(phoneNumber)
  );
  const docs = matched ? ((matched.documentPaths as string[]) || []) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            مستندات الموظف المرتبط بهذا الرقم
          </DialogTitle>
        </DialogHeader>
        {!matched ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            لا يوجد موظف مرتبط بالرقم {phoneNumber} في قاعدة البيانات
          </div>
        ) : docs.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">لا توجد مستندات مرفوعة للموظف <strong>{matched.fullName}</strong></p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <p className="text-sm text-muted-foreground mb-3">موظف: <strong>{matched.fullName}</strong> — {docs.length} ملف</p>
            {docs.map((docPath, idx) => {
              const fileName = docPath.split("/").pop() || docPath;
              const isImage = /\.(jpg|jpeg|png)$/i.test(fileName);
              const isPdf = /\.pdf$/i.test(fileName);
              return (
                <div
                  key={idx}
                  data-testid={`doc-item-${idx}`}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                    isPdf ? "bg-red-100 text-red-700" : isImage ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                  )}>
                    {isPdf ? "PDF" : isImage ? "IMG" : "DOC"}
                  </div>
                  <span className="flex-1 truncate text-xs text-foreground" title={fileName}>{fileName}</span>
                  <a
                    href={docPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`link-doc-${idx}`}
                    className="shrink-0"
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Users Page ──────────────────────────────────────────────────────────

export default function UsersPage() {
  const { users, isLoading: usersLoading, deleteUser } = useUsers();
  const { botUsers, isLoading: botUsersLoading, deleteBotUser, updateBotUser } = useBotUsers();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

  const [isAddBotOpen, setIsAddBotOpen] = useState(false);
  const [editingBotUser, setEditingBotUser] = useState<BotUser | undefined>(undefined);
  const [docsPhone, setDocsPhone] = useState<string | null>(null);

  const isLoading = usersLoading || botUsersLoading;

  if (isLoading) return <Layout><div className="p-8 text-center">جاري التحميل...</div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">إدارة المستخدمين</h1>
        <p className="mt-1 text-muted-foreground">إدارة مستخدمي النظام ومستخدمي بوت الواتساب</p>
      </div>

      <Tabs defaultValue="system-users">
        <TabsList className="mb-5 h-10 rounded-lg bg-muted p-1">
          <TabsTrigger value="system-users" className="flex items-center gap-2 rounded-md text-sm" data-testid="tab-system-users">
            <UsersIcon className="h-4 w-4" />
            مستخدمو النظام
            <Badge variant="secondary" className="ml-1 text-xs">{users.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="bot-users" className="flex items-center gap-2 rounded-md text-sm" data-testid="tab-bot-users">
            <Bot className="h-4 w-4" />
            إدارة مستخدمي البوت
            <Badge variant="secondary" className="ml-1 text-xs">{botUsers.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── System Users Tab ── */}
        <TabsContent value="system-users">
          <div className="mb-4 flex justify-end">
            <Button
              data-testid="button-add-user"
              onClick={() => { setEditingUser(undefined); setIsAddUserOpen(true); }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              إضافة مستخدم
            </Button>
          </div>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">اسم المستخدم</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>
                        {user.role === "admin" ? "مدير نظام" : "موظف"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          user.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                        )} />
                        <span className="text-xs font-medium">{user.isOnline ? "نشط" : "غير نشط"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" data-testid={`button-edit-user-${user.id}`}
                          onClick={() => { setEditingUser(user); setIsAddUserOpen(true); }}>
                          <Pencil className="h-4 w-4 text-amber-600" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={user.username === "admin"} data-testid={`button-delete-user-${user.id}`}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
                              <AlertDialogDescription>هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(user.id)} className="bg-destructive" disabled={user.username === "admin"}>حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Bot Users Tab ── */}
        <TabsContent value="bot-users">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                {botUsers.filter((b) => b.isBotActive).length} نشط الآن
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {botUsers.filter((b) => !b.isBotActive).length} غير نشط
              </div>
            </div>
            <Button
              data-testid="button-add-bot-user"
              onClick={() => { setEditingBotUser(undefined); setIsAddBotOpen(true); }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              إضافة مستخدم بوت
            </Button>
          </div>

          {botUsers.length === 0 ? (
            <div className="rounded-xl border bg-card shadow-sm py-16 text-center">
              <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا يوجد مستخدمون مسجلون في نظام البوت بعد</p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => { setEditingBotUser(undefined); setIsAddBotOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                إضافة أول مستخدم
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">اسم الموظف</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />رقم الهاتف</div>
                    </TableHead>
                    <TableHead className="text-right">حالة البوت</TableHead>
                    <TableHead className="text-right">آخر تفاعل</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1"><Key className="h-3.5 w-3.5" />الأكواد</div>
                    </TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {botUsers.map((bu) => (
                    <TableRow key={bu.id} data-testid={`row-bot-user-${bu.id}`}>
                      <TableCell className="font-medium">{bu.fullName}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded" dir="ltr">
                          {bu.phoneNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          data-testid={`status-bot-${bu.id}`}
                          variant={bu.isBotActive ? "default" : "secondary"}
                          className={cn(
                            "gap-1 font-semibold",
                            bu.isBotActive
                              ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", bu.isBotActive ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
                          {bu.isBotActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {bu.lastInteraction ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(bu.lastInteraction).toLocaleString("ar-SY")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">لا يوجد</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground">تفعيل: <span className="font-mono font-bold text-green-700 dark:text-green-400">{bu.activationCode}</span></span>
                          <span className="text-[10px] text-muted-foreground">إيقاف: <span className="font-mono font-bold text-red-700 dark:text-red-400">{bu.deactivationCode}</span></span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-docs-${bu.id}`}
                            title="عرض المستندات"
                            onClick={() => setDocsPhone(bu.phoneNumber)}
                          >
                            <FileText className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-toggle-bot-${bu.id}`}
                            title={bu.isBotActive ? "إيقاف البوت" : "تفعيل البوت"}
                            onClick={() => updateBotUser({ id: bu.id, data: { isBotActive: !bu.isBotActive } })}
                          >
                            <RefreshCw className={cn("h-4 w-4", bu.isBotActive ? "text-orange-500" : "text-green-600")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-edit-bot-${bu.id}`}
                            onClick={() => { setEditingBotUser(bu); setIsAddBotOpen(true); }}
                          >
                            <Pencil className="h-4 w-4 text-amber-600" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-bot-${bu.id}`}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف مستخدم البوت</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف <strong>{bu.fullName}</strong> من نظام البوت؟ لا يمكن التراجع.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteBotUser(bu.id)} className="bg-destructive">حذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <UserFormDialog
        open={isAddUserOpen}
        onOpenChange={(open) => {
          setIsAddUserOpen(open);
          if (!open) setEditingUser(undefined);
        }}
        user={editingUser}
      />

      <BotUserFormDialog
        open={isAddBotOpen}
        onOpenChange={(open) => {
          setIsAddBotOpen(open);
          if (!open) setEditingBotUser(undefined);
        }}
        botUser={editingBotUser}
      />

      {docsPhone && (
        <EmployeeDocsDialog
          phoneNumber={docsPhone}
          open={!!docsPhone}
          onOpenChange={(open) => { if (!open) setDocsPhone(null); }}
        />
      )}
    </Layout>
  );
}
