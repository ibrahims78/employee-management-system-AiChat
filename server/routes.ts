import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import isIP from "validator/lib/isIP";
import rateLimit from "express-rate-limit";
import { format } from "date-fns";
import * as XLSX from "xlsx";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { message: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Optional: Skip rate limiting for local development if needed
    return process.env.NODE_ENV === "development" && req.ip === "127.0.0.1";
  }
});

// Configure multer for document uploads
const storage_multer = multer.diskStorage({
  destination: async function (req: Request, file: Express.Multer.File, cb: any) {
    const uploadPath = path.join(process.cwd(), "storage", "temp_uploads");
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req: Request, file: Express.Multer.File, cb: any) {
    // Generate a secure unique name while preserving extension
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueId}${ext}`);
  }
});

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // .xlsx
];

const upload = multer({ 
  storage: storage_multer,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مسموح به. يسمح فقط بملفات PDF و Word و Excel والصور."));
    }
  }
});

// Memory storage multer for Excel imports
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Arabic column → field name mapping for Excel import
const IMPORT_COLUMN_MAP: Record<string, string> = {
  'الاسم والكنية': 'fullName',
  'اسم الأب': 'fatherName',
  'اسم الأم': 'motherName',
  'مكان الولادة': 'placeOfBirth',
  'تاريخ الولادة': 'dateOfBirth',
  'محل ورقم القيد': 'registryPlaceAndNumber',
  'الرقم الوطني': 'nationalId',
  'رقم شام كاش': 'shamCashNumber',
  'الجنس': 'gender',
  'الشهادة': 'certificate',
  'نوع الشهادة': 'certificateType',
  'الاختصاص': 'specialization',
  'الصفة الوظيفية': 'jobTitle',
  'الفئة': 'category',
  'الوضع الوظيفي': 'employmentStatus',
  'رقم قرار التعيين': 'appointmentDecisionNumber',
  'تاريخ قرار التعيين': 'appointmentDecisionDate',
  'أول مباشرة بالدولة': 'firstStateStart',
  'أول مباشرة بالمديرية': 'firstDirectorateStart',
  'أول مباشرة بالقسم': 'firstDepartmentStart',
  'وضع العامل الحالي': 'currentStatus',
  'العمل المكلف به': 'assignedWork',
  'رقم الجوال': 'mobile',
  'العنوان': 'address',
  'ملاحظات': 'notes',
};

const IMPORT_DATE_FIELDS = new Set(['dateOfBirth', 'appointmentDecisionDate', 'firstStateStart', 'firstDirectorateStart', 'firstDepartmentStart']);

function parseCellDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val.trim());
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function sanitizePath(name: string) {
  return name.replace(/[^a-z0-9_\u0600-\u06FF\s-]/gi, '_').trim();
}

function parseDate(dateStr: any): Date | null {
  if (!dateStr || dateStr === "" || dateStr === "null") return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  // Clean up temp uploads on startup
  const tempUploadPath = path.join(process.cwd(), "storage", "temp_uploads");
  try {
    const stats = await fs.stat(tempUploadPath).catch(() => null);
    if (stats && stats.isDirectory()) {
      const files = await fs.readdir(tempUploadPath);
      await Promise.all(files.map(file => fs.unlink(path.join(tempUploadPath, file))));
      console.log("Cleared temporary upload files");
    }
  } catch (err) {
    console.error("Error clearing temporary upload files:", err);
  }

  // Ensure all storage directories exist on startup
  const uploadsDir = path.join(process.cwd(), "storage", "uploads");
  const backupsDir = path.join(process.cwd(), "storage", "backups");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(backupsDir, { recursive: true });

  // Warn if employees have document paths pointing to missing files
  try {
    const allEmployees = await storage.getEmployees(false, 1, 10000, false, true);
    const employeesWithDocs = allEmployees.filter(e =>
      Array.isArray(e.documentPaths) && (e.documentPaths as string[]).length > 0
    );
    let missingCount = 0;
    for (const emp of employeesWithDocs) {
      for (const docPath of (emp.documentPaths as string[])) {
        const relativePath = docPath.startsWith('/') ? docPath.substring(1) : docPath;
        const storagePath = relativePath.startsWith('uploads')
          ? path.join("storage", relativePath)
          : relativePath;
        const fullPath = path.resolve(process.cwd(), storagePath);
        const exists = await fs.stat(fullPath).then(() => true).catch(() => false);
        if (!exists) missingCount++;
      }
    }
    if (missingCount > 0) {
      console.warn(`[WARN] ${missingCount} employee document file(s) are missing from storage. The storage/uploads folder may have been deleted.`);
    } else if (employeesWithDocs.length > 0) {
      console.log(`[OK] All employee document files verified (${employeesWithDocs.length} employees with documents).`);
    }
  } catch (err) {
    console.error("Error checking document files:", err);
  }

  app.use("/uploads", (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).send("Unauthorized");
  }, express.static(uploadsDir));

  // Auth Routes
  app.post(api.auth.login.path, loginLimiter, async (req, res, next) => {
    const { username } = req.body;
    const user = await storage.getUserByUsername(username);
    
    if (user && user.isOnline) {
      // Allow override if lastLoginAt is older than the session timeout (10 min)
      // This auto-recovers from stuck sessions caused by crashes/restarts/abandoned tabs
      const sessionTimeoutMs = 10 * 60 * 1000;
      const isStale = !user.lastLoginAt || 
        (Date.now() - new Date(user.lastLoginAt).getTime()) > sessionTimeoutMs;

      if (!isStale) {
        return res.status(400).json({ 
          message: "المستخدم مسجل دخول بالفعل من جهاز آخر. يرجى تسجيل الخروج أولاً أو المحاولة لاحقاً." 
        });
      }
      // Session expired → allow login and reset the stale isOnline flag
      await storage.updateUser(user.id, { isOnline: false });
    }

    passport.authenticate("local", async (err: any, authenticatedUser: any, info: any) => {
      if (err) return next(err);
      if (!authenticatedUser) {
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }

      req.login(authenticatedUser, async (loginErr) => {
        if (loginErr) return next(loginErr);
        
        const updatedUser = await storage.updateUser(authenticatedUser.id, { 
          isOnline: true, 
          lastLoginAt: new Date() 
        });
        
        await storage.createAuditLog({
          userId: authenticatedUser.id,
          action: "LOGIN",
          entityType: "USER",
          entityId: authenticatedUser.id,
          newValues: { loginTime: new Date() }
        });
        
        res.status(200).json({ user: updatedUser });
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, async (req, res, next) => {
    if (req.user) {
      const userId = req.user.id;
      await storage.updateUser(userId, { 
        isOnline: false, 
        lastLogoutAt: new Date() 
      });
      await storage.createAuditLog({
        userId,
        action: "LOGOUT",
        entityType: "USER",
        entityId: userId,
        newValues: { logoutTime: new Date() }
      });
    }
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.status(200).json(req.user);
  });

  // Heartbeat — keeps isOnline and lastLoginAt fresh while the user is active
  app.post("/api/auth/heartbeat", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const updatedUser = await storage.updateUser(req.user.id, {
      isOnline: true,
      lastLoginAt: new Date(),
    });
    res.status(200).json({ user: updatedUser });
  });

  // Protected middleware for all below
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth")) return next();
    ensureAuthenticated(req, res, next);
  });

  // Employee Import Route
  app.post('/api/employees/import', uploadMemory.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي ملف" });

    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];

      if (rows.length === 0) {
        return res.status(400).json({ message: "الملف لا يحتوي على بيانات" });
      }

      // تطبيع أسماء الحالات الشائعة
      const STATUS_NORMALIZE: Record<string, string> = {
        'إجازة بلا اجر': 'إجازة بلا أجر',
        'اجازة بلا اجر': 'إجازة بلا أجر',
        'اجازة بلا أجر': 'إجازة بلا أجر',
        'على راس عمله':  'على رأس عمله',
        'علي رأس عمله':  'على رأس عمله',
        'علي راس عمله':  'على رأس عمله',
      };

      // المرحلة 1: تحقق من جميع الصفوف وجمع الصالح منها
      const validRows: { rowNum: number; data: any }[] = [];
      const errors: Array<{ row: number; message: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        const data: Record<string, any> = {};

        for (const [arabicCol, fieldName] of Object.entries(IMPORT_COLUMN_MAP)) {
          const val = row[arabicCol];
          if (IMPORT_DATE_FIELDS.has(fieldName)) {
            data[fieldName] = parseCellDate(val);
          } else {
            data[fieldName] = val !== undefined && val !== null ? String(val).trim() : '';
          }
        }

        // تحقق من الرقم الوطني
        if (!data.nationalId || !/^[0-9]{11}$/.test(data.nationalId)) {
          errors.push({ row: rowNum, message: `الرقم الوطني غير صحيح: "${data.nationalId}"` });
          continue;
        }
        if (!data.fullName) {
          errors.push({ row: rowNum, message: 'الاسم والكنية مطلوب' });
          continue;
        }

        // تطبيع الحالة
        if (data.currentStatus && STATUS_NORMALIZE[data.currentStatus]) {
          data.currentStatus = STATUS_NORMALIZE[data.currentStatus];
        }

        // القيم الافتراضية
        if (!data.gender) data.gender = 'ذكر';
        if (!data.currentStatus) data.currentStatus = 'على رأس عمله';
        if (!data.category) data.category = 'أولى';
        if (!data.employmentStatus) data.employmentStatus = 'مثبت';
        if (!data.assignedWork) data.assignedWork = 'ورشة القسم الهندسي';
        if (!data.certificateType) data.certificateType = '';
        if (!data.certificate) data.certificate = '';
        if (!data.specialization) data.specialization = '';
        if (!data.jobTitle) data.jobTitle = '';
        if (!data.mobile) data.mobile = '';
        if (!data.address) data.address = '';
        if (!data.fatherName) data.fatherName = '';
        if (!data.motherName) data.motherName = '';
        if (!data.placeOfBirth) data.placeOfBirth = '';
        if (!data.registryPlaceAndNumber) data.registryPlaceAndNumber = '';
        if (!data.appointmentDecisionNumber) data.appointmentDecisionNumber = '';
        if (!data.shamCashNumber) data.shamCashNumber = '';

        validRows.push({ rowNum, data });
      }

      // المرحلة 2: إدخال دفعي لجميع الصفوف الصالحة (استعلام واحد بدل N استعلام)
      const { created, duplicateNationalIds } = await storage.bulkCreateEmployees(
        validRows.map(r => r.data)
      );

      // إضافة أخطاء التكرار
      for (const nationalId of duplicateNationalIds) {
        const rowNum = validRows.find(r => r.data.nationalId === nationalId)?.rowNum;
        if (rowNum) errors.push({ row: rowNum, message: `الرقم الوطني "${nationalId}" مدخل مسبقاً` });
      }

      // المرحلة 3: تسجيل العمليات دفعياً
      if (req.user && created.length > 0) {
        await storage.bulkCreateAuditLogs(
          created.map(emp => ({
            userId: req.user!.id,
            action: 'CREATE' as const,
            entityType: 'EMPLOYEE' as const,
            entityId: String(emp.id),
            newValues: { source: 'excel_import', fullName: emp.fullName },
          }))
        );
      }

      const imported = created.length;
      res.json({ imported, failed: errors.length, total: rows.length, errors });
    } catch (e: any) {
      console.error('Import error:', e);
      res.status(500).json({ message: 'خطأ في معالجة ملف Excel: ' + (e.message || 'خطأ غير معروف') });
    }
  });

  // Employee Routes
  app.get(api.employees.list.path, async (req, res) => {
    const includeArchived = req.query.includeArchived === 'true';
    const all = req.query.all === 'true';
    const allStatuses = req.query.allStatuses === 'true';
    const page = parseInt(req.query.page as string) || 1;
    // When all=true or allStatuses=true, no limit is applied (handled in storage layer)
    const limit = (all || allStatuses) ? 10000 : Math.min(parseInt(req.query.limit as string) || 50, 100);
    const employees = await storage.getEmployees(includeArchived, page, limit, all, allStatuses);
    res.json(employees);
  });

  app.get(api.employees.get.path, async (req, res) => {
    const employee = await storage.getEmployee(Number(req.params.id));
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  });

  app.delete(api.employees.deleteAttachment.path, async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Only admins can delete attachments" });
    }
    const employeeId = Number(req.params.id);
    const fileId = String(req.params.index); // This is the unique filename or part of the path
    
    const employee = await storage.getEmployee(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const currentPaths = (employee.documentPaths as string[]) || [];
    // Enhanced search: match exactly or by filename
    const filePath = currentPaths.find(p => p === fileId || p.endsWith(fileId) || p.includes(`/${fileId}`));
    
    if (!filePath) {
      console.error(`Attachment not found. Looking for: ${fileId} in`, currentPaths);
      return res.status(404).json({ message: "Attachment not found" });
    }

    const newPaths = currentPaths.filter(p => p !== filePath);

    // Physically delete file
    // Handle both relative and absolute-style paths stored in DB
    const relativePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    // Map /uploads/... to storage/uploads/...
    const storagePath = relativePath.startsWith('uploads') 
      ? path.join("storage", relativePath) 
      : relativePath;

    const fullPath = path.resolve(process.cwd(), storagePath);
    const absoluteUploadsDir = path.resolve(process.cwd(), "storage", "uploads");
    
    if (fullPath.startsWith(absoluteUploadsDir)) {
      try {
        await fs.unlink(fullPath);
        console.log(`Successfully deleted file: ${fullPath}`);
      } catch (err: any) {
        console.error(`Error deleting physical file ${fullPath}:`, err.message);
        // We continue even if file is missing from disk to keep DB in sync
      }
    } else {
      console.error(`Security Block: Path ${fullPath} is outside ${absoluteUploadsDir}`);
      return res.status(400).json({ message: "Invalid file path" });
    }

    const updatedEmployee = await storage.updateEmployee(employeeId, { documentPaths: newPaths });
    
    await storage.createAuditLog({
      userId: req.user.id,
      action: "DELETE_ATTACHMENT",
      entityType: "EMPLOYEE",
      entityId: String(employeeId),
      oldValues: { path: filePath },
      newValues: { remaining: newPaths.length }
    });

    res.json(updatedEmployee);
  });

  app.post(api.employees.create.path, upload.array("documents"), async (req, res) => {
    try {
      const body = { ...req.body };
      
      // Convert date strings back to Date objects
      const dateFields = ["dateOfBirth", "appointmentDecisionDate", "firstStateStart", "firstDirectorateStart", "firstDepartmentStart"];
      for (const field of dateFields) {
        if (body[field] !== undefined) {
          body[field] = parseDate(body[field]);
        }
      }

      // Validate using the schema
      const input = api.employees.create.input.parse(body);
      
      // Check if nationalId is provided to avoid DB null constraint error
      if (!input.nationalId) {
        return res.status(400).json({ message: "الرقم الوطني مطلوب", field: "nationalId" });
      }

      const employee = await storage.createEmployee(input);

      // Move files to a folder named by ID
      const safeEmployeeName = sanitizePath(employee.fullName);
      const safeFolder = `${employee.nationalId}_${safeEmployeeName}`;
      const uploadBaseDir = path.join(process.cwd(), "storage", "uploads", safeFolder);
      
      try {
        await fs.mkdir(uploadBaseDir, { recursive: true });

        const documentPaths: string[] = [];
        const files = (req as any).files;
        if (files && Array.isArray(files)) {
          for (const file of files) {
            const dateStr = format(new Date(), "yyyy-MM-dd");
            const safeEmployeeName = sanitizePath(employee.fullName);
            const originalExt = path.extname(file.originalname);
            const dynamicName = `${safeEmployeeName}_document_${dateStr}_${Math.random().toString(36).substring(2, 7)}${originalExt}`;
            
            const finalPath = path.join(uploadBaseDir, dynamicName);
            try {
              await fs.copyFile(file.path, finalPath);
              await fs.unlink(file.path);
              documentPaths.push(`/uploads/${safeFolder}/${dynamicName}`);
            } catch (err) {
              console.error("Error moving file:", err);
            }
          }
        }

        // Update employee with document paths
        const updatedEmployee = await storage.updateEmployee(employee.id, { documentPaths });

        if (req.user) {
          await storage.createAuditLog({
            userId: req.user.id,
            action: 'CREATE',
            entityType: 'EMPLOYEE',
            entityId: String(updatedEmployee.id),
            newValues: updatedEmployee
          });
        }

        res.status(201).json(updatedEmployee);
      } catch (fileError) {
        console.error("Error handling employee documents:", fileError);
        res.status(500).json({ message: "خطأ أثناء معالجة ملفات الموظف" });
      }
    } catch (e: any) {
      if (e.code === '23505' && e.detail?.includes('national_id')) {
        return res.status(400).json({ 
          message: "الرقم الوطني مدخل مسبقاً لموظف آخر، يرجى التأكد من البيانات.", 
          field: "nationalId" 
        });
      }
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message, field: e.errors[0].path.join('.') });
      console.error(e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.employees.update.path, upload.array("documents"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const oldEmployee = await storage.getEmployee(id);
      if (!oldEmployee) return res.status(404).json({ message: "Employee not found" });
      
      const body = { ...req.body };
      const safeEmployeeName = sanitizePath(oldEmployee.fullName);
      const safeFolder = `${oldEmployee.nationalId}_${safeEmployeeName}`;
      const uploadBaseDir = path.join(process.cwd(), "storage", "uploads", safeFolder);
      
      await fs.mkdir(uploadBaseDir, { recursive: true });

      const dateFields = ["dateOfBirth", "appointmentDecisionDate", "firstStateStart", "firstDirectorateStart", "firstDepartmentStart"];
      for (const field of dateFields) {
        if (body[field] !== undefined) {
          body[field] = parseDate(body[field]);
        }
      }

      const documentPaths: string[] = Array.isArray(oldEmployee.documentPaths) ? [...oldEmployee.documentPaths] : [];
      
      // Handle file deletions by unique identifier (filename)
      if (body.removedFiles) {
        let filesToDelete: string[] = [];
        try {
          if (typeof body.removedFiles === 'string') {
            filesToDelete = JSON.parse(body.removedFiles);
          } else if (Array.isArray(body.removedFiles)) {
            filesToDelete = body.removedFiles;
          }

          for (const fileName of filesToDelete) {
            const index = documentPaths.findIndex(p => p === fileName || p.endsWith(fileName) || p.includes(`/${fileName}`));
            if (index !== -1) {
              const filePath = documentPaths[index];
              const relativePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
              const storagePath = relativePath.startsWith('uploads') 
                ? path.join("storage", relativePath) 
                : relativePath;

              const fullPath = path.resolve(process.cwd(), storagePath);
              const absoluteUploadsDir = path.resolve(process.cwd(), "storage", "uploads");
              
              if (fullPath.startsWith(absoluteUploadsDir)) {
                try {
                  await fs.unlink(fullPath);
                } catch (err: any) {
                  console.error(`Error deleting physical file ${fullPath}:`, err.message);
                  // We continue to sync DB even if physical file is missing
                }
              }
              documentPaths.splice(index, 1);
            }
          }
        } catch (parseError) {
          console.error("Error in removedFiles processing:", parseError);
          return res.status(400).json({ message: "خطأ في معالجة قائمة الملفات المحذوفة" });
        }
      }

      const updateFiles = (req as any).files;
      if (updateFiles && Array.isArray(updateFiles)) {
        for (const file of updateFiles) {
          const dateStr = format(new Date(), "yyyy-MM-dd");
          const safeEmployeeName = sanitizePath(oldEmployee.fullName);
          const originalExt = path.extname(file.originalname);
          const dynamicName = `${safeEmployeeName}_document_${dateStr}_${Math.random().toString(36).substring(2, 7)}${originalExt}`;

          const finalPath = path.join(uploadBaseDir, dynamicName);
          try {
            await fs.copyFile(file.path, finalPath);
            await fs.unlink(file.path);
            documentPaths.push(`/uploads/${safeFolder}/${dynamicName}`);
          } catch (err) {
            console.error("Error moving update file:", err);
          }
        }
      }
      body.documentPaths = documentPaths;

      const input = api.employees.update.input.parse(body);
      const employee = await storage.updateEmployee(id, input);

      if (req.user) {
        await storage.createAuditLog({
          userId: req.user.id,
          action: 'UPDATE',
          entityType: 'EMPLOYEE',
          entityId: String(id),
          oldValues: oldEmployee,
          newValues: employee
        });
      }

      res.json(employee);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message, field: e.errors[0].path.join('.') });
      console.error(e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.employees.delete.path, async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    const id = Number(req.params.id);
    const employee = await storage.getEmployee(id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // حذف مجلد ملفات الموظف من القرص عند الأرشفة
    const safeFolder = `${employee.nationalId}_${sanitizePath(employee.fullName)}`;
    const uploadFolder = path.join(process.cwd(), "storage", "uploads", safeFolder);
    try {
      await fs.rm(uploadFolder, { recursive: true, force: true });
      console.log(`Deleted upload folder for employee ${id}: ${safeFolder}`);
    } catch (err) {
      console.error(`Error deleting upload folder for employee ${id}:`, err);
    }

    await storage.deleteEmployee(id);

    if (req.user) {
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'DELETE',
        entityType: 'EMPLOYEE',
        entityId: String(id),
        oldValues: employee,
        newValues: { isDeleted: true, deletedAt: new Date() }
      });
    }

    res.status(204).end();
  });

  // User Routes
  app.get(api.users.list.path, async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      const input = api.users.create.input.parse(req.body);
      const hashed = await hashPassword(input.password);
      const user = await storage.createUser({ ...input, password: hashed });
      
      if (req.user) {
        await storage.createAuditLog({
          userId: req.user.id,
          action: 'CREATE',
          entityType: 'USER',
          entityId: user.id,
          newValues: { username: input.username, role: input.role }
        });
      }
      res.status(201).json(user);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message, field: e.errors[0].path.join('.') });
      throw e;
    }
  });

  app.put(api.users.update.path, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      const id = req.params.id;
      const oldUser = await storage.getUser(id);
      if (!oldUser) return res.status(404).json({ message: "User not found" });
      
      const input = api.users.update.input.parse(req.body);
      const updates = { ...input };
      if (updates.password) {
        updates.password = await hashPassword(updates.password);
      }
      const user = await storage.updateUser(id, updates);
      
      if (req.user) {
        await storage.createAuditLog({
          userId: req.user.id,
          action: 'UPDATE',
          entityType: 'USER',
          entityId: id,
          oldValues: { username: oldUser.username, role: oldUser.role },
          newValues: { username: updates.username, role: updates.role }
        });
      }
      res.json(user);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message, field: e.errors[0].path.join('.') });
      throw e;
    }
  });

  app.delete(api.users.delete.path, async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    const id = req.params.id;
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (req.user?.id === id) {
      return res.status(400).json({ message: "لا يمكن حذف حسابك الشخصي" });
    }

    await storage.deleteUser(id);
    
    if (req.user) {
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'DELETE',
        entityType: 'USER',
        entityId: id,
        oldValues: { username: user.username, role: user.role }
      });
    }
    res.status(204).end();
  });

  // Audit Logs
  app.get(api.auditLogs.list.path, async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(200, Math.max(10, parseInt(req.query.limit as string) || 50));
    const action = req.query.action as string | undefined;
    const search = req.query.search as string | undefined;

    const [result, actionCounts] = await Promise.all([
      storage.getAuditLogs(page, limit, action, search),
      storage.getAuditLogActionCounts(),
    ]);

    res.json({ ...result, page, limit, actionCounts });
  });

  app.delete('/api/audit-logs', async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    try {
      await storage.clearAuditLogs();
      res.json({ message: "تم مسح سجل العمليات بنجاح" });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "خطأ أثناء مسح السجل" });
    }
  });

  // Settings & Backup Routes
  app.get(api.settings.listBackups.path, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("Unauthorized");
    try {
      const backupDir = path.join(process.cwd(), "storage", "backups");
      await fs.mkdir(backupDir, { recursive: true });
      const files = await fs.readdir(backupDir);
      const backupFiles = await Promise.all(files.filter(f => f.endsWith('.json')).map(async (f) => {
        const stats = await fs.stat(path.join(backupDir, f));
        return {
          filename: f,
          size: stats.size,
          createdAt: stats.birthtime.toISOString()
        };
      }));
      res.json(backupFiles.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (error) {
      res.status(500).json({ message: "خطأ أثناء جلب قائمة النسخ الاحتياطية" });
    }
  });

  app.post(api.settings.backup.path, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("Unauthorized");
    
    try {
      const backupDir = path.join(process.cwd(), "storage", "backups");
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const filename = `backup_${timestamp}.json`;
      const backupPath = path.join(backupDir, filename);
      
      const [employeesRaw, usersData, { logs: auditDataRaw }] = await Promise.all([
        storage.getEmployees(false, 1, 10000, true),
        storage.getUsers(),
        storage.getAuditLogs(1, 1000000), // جلب جميع السجلات للنسخة الاحتياطية
      ]);

      // Ensure dates are stringified correctly
      const employeesData = employeesRaw.map(e => ({
        ...e,
        dateOfBirth: e.dateOfBirth instanceof Date ? e.dateOfBirth.toISOString() : e.dateOfBirth,
        appointmentDecisionDate: e.appointmentDecisionDate instanceof Date ? e.appointmentDecisionDate.toISOString() : e.appointmentDecisionDate,
        firstStateStart: e.firstStateStart instanceof Date ? e.firstStateStart.toISOString() : e.firstStateStart,
        firstDirectorateStart: e.firstDirectorateStart instanceof Date ? e.firstDirectorateStart.toISOString() : e.firstDirectorateStart,
        firstDepartmentStart: e.firstDepartmentStart instanceof Date ? e.firstDepartmentStart.toISOString() : e.firstDepartmentStart,
        deletedAt: e.deletedAt instanceof Date ? e.deletedAt.toISOString() : e.deletedAt,
        createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
        updatedAt: e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt
      }));

      const auditData = auditDataRaw.map(l => {
        const log = l.log;
        return {
          ...log,
          createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt
        };
      });
      
      const backupContent = JSON.stringify({
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: {
          employees: employeesData,
          users: usersData,
          auditLogs: auditData
        }
      }, null, 2);
      
      await fs.writeFile(backupPath, backupContent);
      
      if (req.user) {
        await storage.createAuditLog({
          userId: req.user.id,
          action: "BACKUP_CREATED",
          entityType: "SYSTEM",
          entityId: "backup",
          newValues: { filename }
        });
      }
      
      res.json({ message: "تم إنشاء النسخة الاحتياطية بنجاح", filename });
    } catch (error: any) {
      console.error("Backup error:", error);
      res.status(500).json({ message: "خطأ أثناء إنشاء النسخة الاحتياطية" });
    }
  });

  app.post(api.settings.update.path, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("Unauthorized");
    const { key, value } = req.body;
    const updated = await storage.updateSetting(key, value);
    res.json(updated);
  });

  app.get(api.settings.get.path, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("Unauthorized");
    const value = await storage.getSetting(req.params.key);
    // Return empty object instead of 404 for backup_config to avoid UI errors
    if (value === undefined) {
      if (req.params.key === 'backup_config') return res.json({ enabled: false });
      return res.status(404).json({ message: "Setting not found" });
    }
    res.json(value);
  });

  app.post(api.settings.restoreBackup.path, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("Unauthorized");
    const { filename } = req.body;
    try {
      const backupPath = path.join(process.cwd(), "storage", "backups", filename);
      const content = await fs.readFile(backupPath, 'utf-8');
      const backup = JSON.parse(content);
      
      if (!backup.data) throw new Error("Invalid backup format");
      
      // Perform restore within a transaction (handled in storage.restoreFromData)
      await storage.restoreFromData(backup.data);
      
      if (req.user) {
        await storage.createAuditLog({
          userId: req.user.id,
          action: "BACKUP_RESTORED",
          entityType: "SYSTEM",
          entityId: "backup",
          newValues: { filename, restoredAt: new Date().toISOString() }
        });
      }
      
      res.json({ message: "تمت استعادة النسخة الاحتياطية بنجاح" });
    } catch (error: any) {
      console.error("Restore error:", error);
      res.status(500).json({ message: "خطأ أثناء استعادة النسخة الاحتياطية: " + error.message });
    }
  });

  app.delete(api.settings.deleteBackup.path, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("Unauthorized");
    const { filename } = req.params;
    try {
      const backupPath = path.join(process.cwd(), "storage", "backups", filename);
      await fs.unlink(backupPath);
      
      if (req.user) {
        await storage.createAuditLog({
          userId: req.user.id,
          action: "BACKUP_DELETED",
          entityType: "SYSTEM",
          entityId: "backup",
          newValues: { filename, deletedAt: new Date() }
        });
      }
      
      res.json({ message: "تم حذف النسخة الاحتياطية بنجاح" });
    } catch (error) {
      res.status(404).json({ message: "النسخة الاحتياطية غير موجودة" });
    }
  });

  return httpServer;
}
