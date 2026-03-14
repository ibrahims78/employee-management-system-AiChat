# 🏛️ برنامج ذاتية الموظفين | Employee Management System

<div dir="rtl">

نظام متكامل لإدارة ملفات وبيانات موظفي المكتب الهندسي، مبني بتقنيات ويب حديثة مع دعم كامل للغة العربية واتجاه RTL.

</div>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker" alt="Docker"/>
  <img src="https://img.shields.io/badge/RTL-Arabic-green?style=for-the-badge" alt="Arabic RTL"/>
</p>

---

## 📋 الفهرس | Table of Contents

- [نبذة عن البرنامج](#نبذة-عن-البرنامج)
- [المميزات الرئيسية](#المميزات-الرئيسية)
- [التقنيات المستخدمة](#التقنيات-المستخدمة)
- [متطلبات التشغيل](#متطلبات-التشغيل)
- [التثبيت السريع (ويندوز)](#التثبيت-السريع-ويندوز)
- [بيانات الدخول الافتراضية](#بيانات-الدخول-الافتراضية)
- [هيكل الملفات](#هيكل-الملفات)

---

## نبذة عن البرنامج

<div dir="rtl">

برنامج **ذاتية الموظفين** هو نظام إدارة موارد بشرية متكامل مصمم خصيصاً للمكاتب الهندسية والجهات الحكومية. يتيح البرنامج:

- إدارة ملفات جميع الموظفين بشكل مركزي وآمن
- متابعة الحالة الوظيفية (فعّال، مؤرشف، إجازة، نقل)
- رفع وتنظيم المستندات الخاصة بكل موظف
- استيراد البيانات من Excel وتصديرها بصيغ متعددة
- سجل تدقيق كامل لجميع العمليات
- لوحة تحكم تفاعلية بالإحصائيات والرسوم البيانية

</div>

---

## المميزات الرئيسية

<div dir="rtl">

### 👤 إدارة الموظفين
- إضافة وتعديل وحذف بيانات الموظفين
- بحث وفلترة متقدمة (بالاسم، الرقم الوظيفي، الاختصاص، الحالة)
- عرض البطاقات أو الجدول (Cards / Table View)
- عمليات جماعية (تغيير حالة متعدد / تصدير مختار)

### 📁 إدارة الملفات والمستندات
- رفع مستندات الموظفين (PDF, صور)
- إنشاء بطاقة موظف بصيغة Word
- تصدير Excel مخصص مع اختيار الخانات

### 📊 لوحة التحكم
- إحصائيات فورية (إجمالي، فعّالون، مؤرشفون، يمتلكون ملفات)
- رسم بياني للاختصاصات الأكثر شيوعاً
- مؤشرات أداء ديناميكية مع تأثير عداد

### 🔒 الأمان والإدارة
- نظام مصادقة بالجلسات مع حماية ضد هجمات Brute Force
- تحذير انتهاء الجلسة قبل دقيقة مع خيار التمديد
- سجل تدقيق كامل لكل عملية في النظام
- إدارة المستخدمين والصلاحيات (مدير / مستخدم)

### 🌙 تجربة المستخدم
- واجهة عربية بالكامل مع دعم RTL
- وضع داكن / فاتح
- Skeleton Loaders عوضاً عن شاشات التحميل الجامدة
- استيراد بيانات الموظفين من Excel (دفعة واحدة)

</div>

---

## التقنيات المستخدمة

| الطبقة | التقنية |
|--------|---------|
| الواجهة الأمامية | React 18 + Vite + TypeScript |
| مكتبة UI | Shadcn/UI + Tailwind CSS |
| إدارة الحالة | TanStack Query v5 |
| الخادم | Express.js v5 + TypeScript |
| قاعدة البيانات | PostgreSQL 15 + Drizzle ORM |
| المصادقة | Express-Session + Argon2 |
| الجداول | ExcelJS (استيراد/تصدير) |
| النشر | Docker + Docker Compose |

---

## متطلبات التشغيل

| المتطلب | الحد الأدنى |
|---------|------------|
| نظام التشغيل | Windows 10 v1903+ / Linux / macOS |
| ذاكرة RAM | 4 جيجابايت (8 موصى) |
| مساحة التخزين | 5 جيجابايت فارغة |
| Docker Desktop | أحدث إصدار مع WSL2 |
| الاتصال بالإنترنت | مطلوب للتثبيت الأول فقط |

---

## التثبيت السريع (ويندوز)

<div dir="rtl">

### الطريقة التلقائية — ملف setup.bat

**الخطوة 1:** ثبّت [Docker Desktop](https://www.docker.com/products/docker-desktop) وتأكد من تفعيل WSL2

**الخطوة 2:** حمّل ملف الإعداد مباشرةً:

```
https://raw.githubusercontent.com/ibrahims78/employee-management-system/main/setup.bat
```

**الخطوة 3:** انقر بزر الفأرة الأيمن على الملف → **تشغيل كمسؤول**

الملف سيقوم تلقائياً بـ:
- التحقق من Docker وتشغيله
- تنزيل كود المشروع من GitHub
- إنشاء مجلدات التخزين
- بناء وتشغيل الحاويات (مع إعادة المحاولة تلقائياً)
- فتح المتصفح على التطبيق

للتوثيق التفصيلي: [دليل Docker الكامل](docs/docker-windows-setup.md)

### الطريقة اليدوية

```bash
git clone https://github.com/ibrahims78/employee-management-system.git
cd employee-management-system
cp .env.example .env
docker compose up -d --build
```

</div>

---

## بيانات الدخول الافتراضية

> ⚠️ **مهم:** غيّر كلمة المرور فوراً بعد أول دخول من صفحة المستخدمين.

| الحقل | القيمة |
|-------|--------|
| اسم المستخدم | `admin` |
| كلمة المرور | `123456` |
| الرابط | `http://localhost:5001` |

---

## هيكل الملفات

```
employee-management-system/
├── 📁 client/                  # الواجهة الأمامية (React + Vite)
│   ├── src/
│   │   ├── pages/              # الصفحات (Dashboard, Employees, ...)
│   │   ├── components/         # المكونات المشتركة
│   │   ├── hooks/              # React Hooks المخصصة
│   │   └── lib/                # المساعدات والأدوات
│   └── index.html
├── 📁 server/                  # الخادم (Express.js)
│   ├── index.ts                # نقطة الدخول
│   ├── routes.ts               # جميع مسارات API
│   ├── storage.ts              # طبقة الوصول لقاعدة البيانات
│   ├── auth.ts                 # منطق المصادقة
│   └── db.ts                   # اتصال قاعدة البيانات
├── 📁 shared/                  # الكود المشترك
│   ├── schema.ts               # مخطط قاعدة البيانات (Drizzle)
│   └── routes.ts               # تعريف مسارات API
├── 📁 script/                  # سكريبتات مساعدة
│   ├── build.ts                # سكريبت البناء
│   └── seed-admin.ts           # إنشاء حساب المدير الأولي
├── 📁 docs/                    # التوثيق التفصيلي
│   ├── docker-windows-setup.md # دليل Docker على ويندوز
│   └── deployment.md           # دليل النشر العام
├── 📁 storage/                 # (يُنشأ تلقائياً - غير موجود في المستودع)
│   ├── uploads/                # مستندات الموظفين
│   └── backups/                # النسخ الاحتياطية
├── Dockerfile                  # تعريف صورة Docker
├── docker-compose.yml          # تنسيق الخدمات
├── entrypoint.sh               # نقطة دخول الحاوية
├── setup.bat                   # إعداد تلقائي لويندوز
├── table.sql                   # تعريف جداول قاعدة البيانات
├── .env.example                # نموذج المتغيرات البيئية
├── CHANGELOG.md                # سجل التغييرات
└── package.json                # تعريف المشروع والتبعيات
```

---

## 📜 الترخيص | License

هذا البرنامج مخصص للاستخدام الداخلي للمكتب الهندسي.  
This software is intended for internal use by the Engineering Office.

---

<div align="center">

**تم التطوير بواسطة إبراهيم الصيداوي**

</div>
