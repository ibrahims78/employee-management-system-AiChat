# دليل قاعدة البيانات — التفصيل الشامل

<div dir="rtl">

**قاعدة البيانات:** PostgreSQL 15  
**ORM:** Drizzle ORM  
**الاتصال:** متغير البيئة `DATABASE_URL`  
**التهيئة:** `shared/schema.ts`

---

## نظرة عامة على الجداول

```
┌─────────────────────────────────────────────────────────────┐
│                    مخطط قاعدة البيانات                      │
├───────────┬──────────┬─────────────┬───────────┬────────────┤
│   users   │employees │  audit_logs │  api_keys │ bot_users  │
│           │          │             │           │            │
│ UUID (PK) │ serial   │ serial (PK) │serial(PK) │serial (PK) │
│           │          │             │           │            │
│           │          │ userId (FK) │createdBy  │            │
│           │          │ → users.id  │→ users.id │            │
└───────────┴──────────┴─────────────┴───────────┴────────────┘
                          +
                    ┌──────────┐
                    │ settings │
                    │serial(PK)│
                    └──────────┘
                          +
                    ┌──────────┐
                    │ sessions │
                    │  (auto)  │
                    └──────────┘
```

---

## الجدول الأول: `users` — مستخدمو النظام

يحتوي على حسابات المستخدمين البشريين الذين يدخلون إلى لوحة التحكم.

| العمود | النوع | القيود | الوصف |
|--------|-------|--------|-------|
| `id` | `varchar` (UUID) | PK، افتراضي: `gen_random_uuid()` | المعرّف الفريد |
| `username` | `text` | NOT NULL، UNIQUE | اسم المستخدم |
| `password` | `text` | NOT NULL | كلمة المرور (مشفّرة بـ scrypt) |
| `role` | `text` | NOT NULL، افتراضي: `'employee'` | الدور: `admin` أو `employee` |
| `lastLoginAt` | `timestamp` | nullable | آخر تسجيل دخول |
| `lastLogoutAt` | `timestamp` | nullable | آخر تسجيل خروج |
| `isOnline` | `boolean` | NOT NULL، افتراضي: `false` | هل المستخدم متصل الآن؟ |

**تشفير كلمات المرور:**
```
كلمة المرور الخام → scrypt(password, salt, 64) → hex.salt
```
المخرج: سلسلة من الشكل `<64-char-hex>.<32-char-hex-salt>`

**الأدوار:**
- `admin` — صلاحيات كاملة: إدارة المستخدمين، سجل التدقيق، الإعدادات، حذف المستندات
- `employee` — إمكانية القراءة وتعديل الموظفين، بدون إدارة المستخدمين

**ملاحظات:**
- `isOnline` تُعيَّن إلى `false` تلقائياً عند إعادة تشغيل الخادم
- المدير الافتراضي يُنشأ تلقائياً: `admin` / `123456`

---

## الجدول الثاني: `employees` — بيانات الموظفين

الجدول الرئيسي للنظام. يحتوي على كامل بيانات كل موظف.

### البيانات الشخصية

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `serial` (PK) | المعرّف التسلسلي التلقائي |
| `fullName` | `text` | الاسم الكامل (الاسم والكنية) |
| `fatherName` | `text` | اسم الأب |
| `motherName` | `text` | اسم الأم |
| `placeOfBirth` | `text` | مكان الولادة |
| `dateOfBirth` | `timestamp` | تاريخ الولادة |
| `registryPlaceAndNumber` | `text` | محل ورقم القيد |
| `nationalId` | `text` | UNIQUE — الرقم الوطني (11 رقماً) |
| `shamCashNumber` | `text` | رقم شام كاش (16 رقماً) |
| `gender` | `text` | الجنس: `ذكر` أو `أنثى` |

### البيانات المهنية والوظيفية

| العمود | النوع | القيم المحتملة |
|--------|-------|----------------|
| `certificate` | `text` | الشهادة (نص حر) |
| `certificateType` | `text` | `إعدادية` / `ثانوية` / `ثانوية صناعية` / `مهني` / `جامعة` |
| `specialization` | `text` | الاختصاص (نص حر) |
| `jobTitle` | `text` | المسمى الوظيفي |
| `category` | `text` | `أولى` / `ثانية` / `ثالثة` / `رابعة` |
| `employmentStatus` | `text` | `مثبت` / `عقد` |
| `appointmentDecisionNumber` | `text` | رقم قرار التعيين |
| `appointmentDecisionDate` | `timestamp` | تاريخ قرار التعيين |
| `firstStateStart` | `timestamp` | أول مباشرة على مستوى الدولة |
| `firstDirectorateStart` | `timestamp` | أول مباشرة في المديرية |
| `firstDepartmentStart` | `timestamp` | أول مباشرة في القسم الحالي |
| `currentStatus` | `text` | `على رأس عمله` / `إجازة بلا أجر` / `نقل` / `استقالة` |
| `assignedWork` | `text` | `رئيس القسم الهندسي` / `صيانة و اشراف و متابعة لجان` / `مستخدم` / `ورشة القسم الهندسي` |

### بيانات التواصل والمستندات

| العمود | النوع | الوصف |
|--------|-------|-------|
| `mobile` | `text` | رقم الجوال |
| `address` | `text` | العنوان |
| `documentPaths` | `jsonb` | مصفوفة مسارات المستندات المرفوعة — افتراضي: `[]` |
| `notes` | `text` | ملاحظات حرة |

**مثال على `documentPaths`:**
```json
[
  "storage/uploads/1710000000000-abc.pdf",
  "storage/uploads/1710000001000-xyz.jpg"
]
```

### حقول النظام

| العمود | النوع | الوصف |
|--------|-------|-------|
| `isDeleted` | `boolean` | حذف ناعم — افتراضي: `false` |
| `deletedAt` | `timestamp` | وقت الحذف الناعم |
| `createdAt` | `timestamp` | وقت الإضافة — افتراضي: `now()` |
| `updatedAt` | `timestamp` | وقت آخر تعديل — افتراضي: `now()` |

**نظام الحذف الناعم (Soft Delete):**
- عند "حذف" موظف: `isDeleted = true`، `deletedAt = now()`
- الموظف لا يُحذف فعلياً من قاعدة البيانات
- يمكن استعادته أو رؤيته في الأرشيف

**التحقق من صحة البيانات (Zod):**
- `nationalId`: 11 رقماً بالضبط، أرقام فقط
- `shamCashNumber`: 16 رقماً بالضبط، أرقام فقط

---

## الجدول الثالث: `audit_logs` — سجل التدقيق

يُسجّل كل عملية تتم في النظام مع من قام بها ومتى.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `serial` (PK) | المعرّف التسلسلي |
| `userId` | `varchar` (FK → `users.id`) | من قام بالعملية — `cascade delete` |
| `action` | `text` | نوع العملية |
| `entityType` | `text` | نوع الكيان المتأثر |
| `entityId` | `text` | معرّف الكيان |
| `oldValues` | `jsonb` | القيم القديمة قبل التعديل |
| `newValues` | `jsonb` | القيم الجديدة بعد التعديل |
| `createdAt` | `timestamp` | وقت العملية |

**قيم `action` الشائعة:**
- `CREATE` — إنشاء سجل جديد
- `UPDATE` — تعديل سجل
- `DELETE` — حذف سجل
- `LOGIN` — تسجيل دخول
- `LOGOUT` — تسجيل خروج
- `IMPORT` — استيراد من Excel
- `UPLOAD` — رفع مستند
- `DELETE_DOCUMENT` — حذف مستند
- `BOT_CONVERSATION` — محادثة البوت (يُسجَّل بواسطة `/api/v1/bot/log-conversation`)

**قيم `entityType` الشائعة:**
- `EMPLOYEE` — موظف
- `USER` — مستخدم النظام
- `BOT_USER` — مستخدم البوت
- `API_KEY` — مفتاح API
- `SETTINGS` — الإعدادات

**مثال على سجل:**
```json
{
  "id": 45,
  "userId": "40981383-af43-4ba2-...",
  "action": "UPDATE",
  "entityType": "EMPLOYEE",
  "entityId": "12",
  "oldValues": { "currentStatus": "على رأس عمله" },
  "newValues": { "currentStatus": "إجازة بلا أجر" },
  "createdAt": "2026-03-18T14:33:29.000Z"
}
```

**ملاحظة:** عند حذف مستخدم، تُحذف سجلاته في `audit_logs` تلقائياً (`cascade delete`).

---

## الجدول الرابع: `settings` — إعدادات النظام

جدول مرن من نوع مفتاح-قيمة لتخزين إعدادات النظام.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `serial` (PK) | المعرّف التسلسلي |
| `key` | `text` | UNIQUE — اسم الإعداد |
| `value` | `jsonb` | قيمة الإعداد (أي نوع JSON) |
| `updatedAt` | `timestamp` | وقت آخر تحديث |

**أمثلة على الإعدادات:**
```
key: "systemName"      → value: "مديرية الصحة - القسم الهندسي"
key: "sessionTimeout"  → value: 600
key: "theme"           → value: "light"
```

---

## الجدول الخامس: `api_keys` — مفاتيح API

يُدير مفاتيح الوصول البرمجي للنظام.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `serial` (PK) | المعرّف التسلسلي |
| `keyValue` | `text` | UNIQUE — قيمة المفتاح (64 رمز hex) |
| `description` | `text` | وصف المفتاح / اسمه |
| `keyType` | `text` | `human` أو `machine` — افتراضي: `human` |
| `expiryDate` | `timestamp` | تاريخ انتهاء الصلاحية (nullable) |
| `isActive` | `boolean` | هل المفتاح مفعَّل؟ — افتراضي: `true` |
| `createdAt` | `timestamp` | وقت الإنشاء |
| `createdBy` | `varchar` (FK → `users.id`) | من أنشأ المفتاح |

**نوعا المفاتيح:**

| النوع | الاستخدام |
|-------|----------|
| `human` | للمستخدمين البشريين — يُسمح بالدخول عبر المتصفح |
| `machine` | للبرمجيات (n8n) — محظور من الدخول البشري (403) |

**توليد المفاتيح:**
```javascript
crypto.randomBytes(32).toString("hex")
// ينتج: 64 رمز hex مثل "3477e2bd6616a95eb2..."
```

**المفتاح الثابت لـ n8n:**
```
3477e2bd6616a95eb2dcbb3a9e39b663fddab5a90fe7d71cdd45a7b34040fca4
```
يُنشأ تلقائياً عند بدء التطبيق إذا لم يكن موجوداً.

**وضع Bootstrap:**
إذا كان الجدول فارغاً (`api_keys` لا يحتوي على أي مفتاح)، يُسمح بالدخول بدون مفتاح لإنشاء أول مفتاح.

---

## الجدول السادس: `bot_users` — مستخدمو البوت

يحتوي على بيانات الموظفين المسجّلين في نظام البوت (واتساب + تيليغرام).

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `serial` (PK) | المعرّف التسلسلي |
| `fullName` | `text` | الاسم الكامل للموظف |
| `phoneNumber` | `text` | UNIQUE — رقم الهاتف (مُعرِّف رئيسي) |
| `whatsappLid` | `text` | معرّف جهاز واتساب الفريد (WhatsApp LID أو رقم الهاتف المُطبَّع) |
| `telegramChatId` | `text` | معرّف حساب تيليغرام (chat.id الرقمي) — **جديد V23** |
| `activationCode` | `text` | كود التفعيل الخاص بالموظف |
| `deactivationCode` | `text` | كود الإيقاف الخاص بالموظف |
| `isBotActive` | `boolean` | هل البوت مفعَّل لهذا الموظف الآن؟ |
| `lastInteraction` | `timestamp` | آخر تفاعل (لحساب الخمول التلقائي) |
| `autoDeactivationNotified` | `boolean` | هل أُرسل إشعار الإيقاف التلقائي؟ (يمنع التكرار) |

**دورة حياة السجل:**

```
إضافة من المدير في لوحة التحكم
         ↓
activationCode + deactivationCode يُعيَّنان يدوياً
         ↓
whatsappLid = null، telegramChatId = null (لم يُسجَّل بعد)
         ↓
الموظف يُرسل activationCode عبر واتساب أو تيليغرام
         ↓
عبر واتساب:  isBotActive = true، whatsappLid  يُسجَّل تلقائياً
عبر تيليغرام: isBotActive = true، telegramChatId يُسجَّل تلقائياً
         ↓
البوت يرد على رسائله (تتعرف عليه بـ LID أو chat.id)
         ↓
بعد 5 دقائق خمول أو إرسال deactivationCode
         ↓
isBotActive = false
```

**حقل `whatsappLid`:**
- يُملأ تلقائياً من رسالة التفعيل الأولى عبر واتساب
- يُستخدم لمنع سرقة الجلسة (لا يُقبَل جهاز مختلف بنفس الكود)
- يمكن مسحه (إعادة تعيين) من لوحة التحكم بالضغط على أيقونة الهاتف البنفسجية 🟣

**حقل `telegramChatId`:** *(جديد في V23)*
- يُملأ تلقائياً عند أول تفعيل من تيليغرام
- هو المعرّف الرقمي لمستخدم تيليغرام (chat.id) — مختلف تماماً عن رقم الهاتف
- يُستخدم للتعرف التلقائي على المستخدم في الرسائل اللاحقة
- يحمي من سرقة الجلسة: إذا جاء طلب بـ chat.id مختلف → رفض
- يمكن مسحه من لوحة التحكم بالضغط على أيقونة الهاتف الزرقاء 🔵

---

## الجدول السابع: `sessions` — الجلسات

جدول تلقائي يُنشئه `connect-pg-simple` لتخزين جلسات المتصفح.

| العمود | الوصف |
|--------|-------|
| `sid` | معرّف الجلسة (PK) |
| `sess` | بيانات الجلسة (JSON) |
| `expire` | وقت انتهاء الجلسة |

**ملاحظات:**
- يُنشأ تلقائياً عند أول تشغيل (`createTableIfMissing: true`)
- مدة الجلسة: **5 دقائق** (`maxAge: 5 * 60 * 1000`)
- مع `rolling: true` تُجدَّد مدة الجلسة مع كل طلب

---

## العلاقات بين الجداول

```
users (1) ←──── audit_logs (many)     [cascade delete]
users (1) ←──── api_keys (many)        [set null on delete]
employees       ─────────── (مستقل)
bot_users       ─────────── (مستقل)
settings        ─────────── (مستقل)
```

**ملاحظات العلاقات:**
- `audit_logs.userId` → `users.id` : حذف المستخدم يحذف سجلاته في التدقيق
- `api_keys.createdBy` → `users.id` : حذف المستخدم يُبقي المفتاح ويُعيّن `createdBy = null`
- `employees` و `bot_users` مستقلان — لا علاقة مباشرة بينهما في قاعدة البيانات

---

## استعلامات مفيدة

### عرض إحصائيات الموظفين
```sql
SELECT
  COUNT(*) FILTER (WHERE is_deleted = false) AS total_active,
  COUNT(*) FILTER (WHERE is_deleted = true) AS total_archived,
  COUNT(*) FILTER (WHERE current_status = 'على رأس عمله' AND is_deleted = false) AS on_duty,
  COUNT(*) FILTER (WHERE current_status = 'إجازة بلا أجر' AND is_deleted = false) AS on_leave
FROM employees;
```

### عرض مستخدمي البوت النشطين
```sql
SELECT full_name, phone_number, last_interaction
FROM bot_users
WHERE is_bot_active = true
ORDER BY last_interaction DESC;
```

### آخر 20 عملية في سجل التدقيق
```sql
SELECT al.*, u.username
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 20;
```

### مفاتيح API النشطة
```sql
SELECT key_value, description, key_type, expiry_date, created_at
FROM api_keys
WHERE is_active = true
  AND (expiry_date IS NULL OR expiry_date > NOW());
```

---

## الأمان والقيود

| القيد | الجدول | العمود |
|-------|--------|--------|
| UNIQUE | `users` | `username` |
| UNIQUE | `employees` | `national_id` |
| UNIQUE | `bot_users` | `phone_number` |
| UNIQUE | `api_keys` | `key_value` |
| UNIQUE | `settings` | `key` |
| CHECK (ضمني) | `employees` | `national_id` (11 رقماً) |
| CHECK (ضمني) | `employees` | `sham_cash_number` (16 رقماً) |

</div>
