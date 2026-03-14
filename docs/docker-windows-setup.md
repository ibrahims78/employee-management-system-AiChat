# دليل إعداد البرنامج على ويندوز 10 باستخدام Docker

<div dir="rtl">

## المتطلبات الأساسية

| المتطلب | الحد الأدنى |
|---------|------------|
| ويندوز 10 | نسخة 1903 أو أحدث (Build 18362+) |
| ذاكرة RAM | 4 جيجابايت (8 موصى به) |
| مساحة تخزين | 5 جيجابايت فارغة على الأقل |
| معالج | يدعم تقنية Virtualization (VT-x / AMD-V) |

---

## المرحلة الأولى: تثبيت Docker Desktop

### 1. تحميل Docker Desktop

افتح المتصفح وانتقل إلى:
```
https://www.docker.com/products/docker-desktop
```
اضغط **"Download for Windows"** وحمّل ملف التثبيت.

### 2. تشغيل المثبّت

- شغّل `Docker Desktop Installer.exe`
- في شاشة الخيارات، تأكد من تحديد:
  - ✅ **Use WSL 2 instead of Hyper-V** (مهم جداً)
- أكمل التثبيت وأعد تشغيل الجهاز عند الطلب

### 3. إعداد WSL 2 (إذا طُلب منك)

إذا ظهرت رسالة تطلب تحديث WSL2، افتح PowerShell كمسؤول ونفّذ:
```powershell
wsl --update
wsl --set-default-version 2
```

### 4. التحقق من نجاح التثبيت

افتح Docker Desktop وانتظر حتى يصبح أيقونة الحوت **خضراء** في شريط المهام (أسفل اليمين).

ثم افتح **PowerShell** أو **CMD** وتحقق:
```cmd
docker --version
docker compose version
```
يجب أن يظهر رقم الإصدار لكل أمر.

---

## المرحلة الثانية: التثبيت التلقائي بملف setup.bat

هذه هي **الطريقة الأسهل والموصى بها**.

### الخطوة 1: تحميل ملف الإعداد

افتح المتصفح وانتقل إلى:
```
https://raw.githubusercontent.com/ibrahims78/employee-management-system/main/setup.bat
```
اضغط **كليك يمين في أي مكان بالصفحة** → اختر **"حفظ باسم"** → احفظه على سطح المكتب باسم `setup.bat`

### الخطوة 2: تشغيل الملف كمسؤول

- انقر بزر الفأرة الأيمن على `setup.bat`
- اختر **"تشغيل كمسؤول"**
- اضغط **نعم** عند ظهور نافذة تأكيد UAC

### الخطوة 3: انتظر اكتمال التثبيت

الملف سيقوم تلقائياً بـ 8 خطوات:

```
[1/8] التحقق من صلاحيات المسؤول
[2/8] التحقق من Git وتثبيته (إن لم يكن موجوداً)
[3/8] التحقق من Docker وعمله
[4/8] تنزيل/تحديث المشروع من GitHub
[5/8] إنشاء مجلدات التخزين
[6/8] بناء وتشغيل الحاويات (مع إعادة المحاولة تلقائياً حتى 3 مرات)
[7/8] انتظار جاهزية التطبيق وعرض السجلات
[8/8] فتح المتصفح تلقائياً
```

### الخطوة 4: الدخول للبرنامج

بعد اكتمال التثبيت، سيفتح المتصفح تلقائياً على:
```
http://localhost:5001
```

بيانات الدخول الافتراضية:
- **المستخدم:** `admin`
- **كلمة المرور:** `123456`

> ⚠️ غيّر كلمة المرور فوراً من صفحة المستخدمين بعد أول دخول.

---

## المرحلة الثالثة: التثبيت اليدوي (بديل)

إذا أردت التحكم الكامل، استخدم هذه الطريقة:

### 1. تنزيل المشروع

افتح PowerShell وشغّل:
```powershell
git clone https://github.com/ibrahims78/employee-management-system.git C:\employee-management
cd C:\employee-management
```

### 2. إنشاء مجلدات التخزين

```powershell
mkdir storage\uploads
mkdir storage\backups
```

### 3. بناء وتشغيل الحاويات

```powershell
docker compose up -d --build
```

انتظر دقيقتين حتى تكتمل عملية البناء.

### 4. التحقق من عمل الحاويات

```powershell
docker ps
```

يجب أن ترى حاويتين تعملان:
- `staff-health-app` (التطبيق على المنفذ 5001)
- `staff-health-db` (PostgreSQL)

افتح المتصفح على: `http://localhost:5001`

---

## عمليات الصيانة الشائعة

### إيقاف البرنامج مؤقتاً
```powershell
cd C:\employee-management
docker compose stop
```

### إعادة تشغيل البرنامج
```powershell
cd C:\employee-management
docker compose start
```

### تحديث البرنامج لأحدث إصدار
```powershell
cd C:\employee-management
git pull origin main
docker compose down
docker compose up -d --build
```

### عرض سجلات التطبيق
```powershell
docker logs staff-health-app --tail 50
```

### عرض سجلات قاعدة البيانات
```powershell
docker logs staff-health-db --tail 20
```

### النسخ الاحتياطي اليدوي
```powershell
docker exec staff-health-db pg_dump -U hruser hr_db > backup.sql
```

---

## حل المشكلات الشائعة

### المشكلة: Docker لا يعمل بعد التثبيت
**الحل:** تأكد من تشغيل Docker Desktop وانتظار ظهور الأيقونة الخضراء، ثم أعد تشغيل setup.bat.

### المشكلة: فشل البناء بسبب مشكلة شبكة (ECONNRESET)
**الحل:** ملف setup.bat يعيد المحاولة تلقائياً 3 مرات. إذا استمرت المشكلة:
```powershell
docker system prune -f
docker builder prune -f
```
ثم شغّل setup.bat مجدداً.

### المشكلة: المنفذ 5001 محجوز
**الحل:** ابحث عن البرنامج الذي يستخدمه:
```powershell
netstat -ano | findstr :5001
```
أوقف البرنامج أو غيّر المنفذ في `docker-compose.yml`.

### المشكلة: `Virtualization not enabled`
**الحل:** أعد تشغيل الجهاز وادخل BIOS → فعّل **Intel VT-x** أو **AMD-V**.

### المشكلة: رسالة "WSL 2 requires an update"
**الحل:**
```powershell
wsl --update
```
ثم أعد تشغيل Docker Desktop.

---

## بنية الحاويات

```
┌─────────────────────────────────────────┐
│           Docker Compose                │
│                                         │
│  ┌──────────────────┐                   │
│  │   staff-health-  │  Port 5001        │
│  │       app        │◄──────────────────┤ المتصفح
│  │  (Node.js App)   │                   │
│  └────────┬─────────┘                   │
│           │ DATABASE_URL                │
│  ┌────────▼─────────┐                   │
│  │   staff-health-  │  Port 5432        │
│  │       db         │  (داخلي فقط)      │
│  │   (PostgreSQL)   │                   │
│  └──────────────────┘                   │
│                                         │
│  Volume: postgres_data (بيانات دائمة)   │
│  Volume: ./storage (ملفات الموظفين)     │
└─────────────────────────────────────────┘
```

</div>
