# دليل الورك فلو الشامل — Sidawi AI Health V23
## نظام الذكاء الاصطناعي متعدد القنوات لإدارة بيانات موظفي مديرية الصحة

---

## 📋 جدول المحتويات

1. [نظرة عامة على الهيكل](#نظرة-عامة)
2. [المُشغِّلات (Triggers)](#المشغلات)
3. [التطبيع وتوحيد البيانات](#التطبيع)
4. [التحقق من الهوية](#التحقق)
5. [معالجة الأخطاء](#معالجة-الأخطاء)
6. [التوجيه حسب الإجراء](#التوجيه)
7. [الذاكرة والسياق](#الذاكرة)
8. [عقد الذكاء الاصطناعي والأدوات](#الذكاء-الاصطناعي)
9. [إرسال الردود](#إرسال-الردود)
10. [تسجيل المحادثات](#تسجيل-المحادثات)
11. [إشعارات المدير](#إشعارات-المدير)
12. [التنظيف التلقائي الساعي](#التنظيف-التلقائي)
13. [كيفية مشاهدة كل شيء](#كيفية-المشاهدة)
14. [إعداد الورك فلو خطوة بخطوة](#إعداد-الورك-فلو)
15. [الـ API Endpoints الجديدة](#api-endpoints)

---

## نظرة عامة

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Sidawi AI Health V23                             │
│                  Multi-Channel Pro Workflow                         │
├──────────────┬──────────────┬─────────────────────────────────────┤
│   WhatsApp   │   Telegram   │   Schedule (كل ساعة)                │
│   Webhook    │   Trigger    │   Cleanup Trigger                    │
└──────┬───────┴──────┬───────┴──────────┬──────────────────────────┘
       │               │                  │
       ▼               ▼                  ▼
  Normalize_WA   Normalize_TG      Call_Cleanup_API
       │               │                  │
       └───────┬───────┘                  ▼
               │                  Admin_Cleanup_Report
               ▼
        Verify_Identity ──► Restore_Context
               │
               ▼
       Check_Service_Error
         │           │
      خطأ ✗        طبيعي ✓
         │           │
         ▼           ▼
  [Error Alerts] Route_by_Action
                   │  │  │  │  │
               [5 مسارات]
               ┌──┴──┴──┴──┴──┐
          تفعيل│ إيقاف│timeout│ذكاء│غير مصرح
               │                │
               ▼                ▼
        Dispatch_XX       AI_Agent + Tools
        (WA أو TG)              │
                                ▼
                       Dispatch_AI_Response
                         │           │
                      WA_Output   TG_Output
                              │
                              ▼
                       Log_Conversation
└─────────────────────────────────────────────────────────────────────┘
```

**إجمالي العقد:** 37 node
**الحالة الابتدائية:** `active: false` — يجب التفعيل يدوياً بعد الإعداد

---

## المشغلات

### العقدة 1: WA_Webhook
```
النوع:    n8n-nodes-base.webhook
المسار:   POST /webhook/sidawi-health-v23-wa
الغاية:   استقبال رسائل WhatsApp الواردة من التطبيق أو خدمة WA Gateway
```

**البيانات الواردة:**
```json
{
  "body": {
    "from": "966501234567",
    "content": "كود التفعيل أو سؤال الموظف"
  }
}
```

**الإعداد:**
- لا تحتاج credentials
- سجِّل الـ Webhook URL في خدمة WA Gateway الخاصة بك
- الـ URL النهائي: `https://your-n8n-instance.com/webhook/sidawi-health-v23-wa`

---

### العقدة 2: TG_Trigger
```
النوع:    n8n-nodes-base.telegramTrigger
الغاية:   الاستماع لرسائل Telegram القادمة للبوت تلقائياً
```

**البيانات الواردة:**
```json
{
  "message": {
    "chat": { "id": 123456789 },
    "from": { "id": 123456789, "first_name": "إبراهيم" },
    "text": "كود التفعيل أو السؤال"
  }
}
```

**الإعداد:**
1. في n8n → Credentials → New → Telegram API
2. أدخل الـ Token من @BotFather
3. اختر الـ Credential في هذه العقدة
4. استبدل `TELEGRAM_CREDENTIAL_ID` بالـ ID الفعلي

**ملاحظة:** عند تفعيل الورك فلو، n8n يُسجِّل الـ Webhook مع Telegram تلقائياً

---

### العقدة 3: Schedule_Cleanup_Trigger
```
النوع:    n8n-nodes-base.scheduleTrigger
الجدول:   كل ساعة (minutesInterval: 1 لحقل hours)
الغاية:   تشغيل التنظيف التلقائي للجلسات المنتهية
```

**لا تحتاج أي إعداد إضافي** — تعمل تلقائياً بمجرد تفعيل الورك فلو

---

## التطبيع

### العقدة 4: Normalize_WA | العقدة 5: Normalize_TG
```
النوع:    n8n-nodes-base.set (typeVersion 3.4)
الغاية:   توحيد تنسيق البيانات من القناتين في شكل موحَّد
```

**المشكلة:** WhatsApp وTelegram يرسلان البيانات بهياكل JSON مختلفة تماماً.

**الحل:** كلا الـ nodes يُخرجان نفس الشكل:

| الحقل | مصدر WA | مصدر TG |
|-------|---------|---------|
| `from` | `$json.body.from` (رقم الهاتف) | `String($json.message.chat.id)` (معرِّف رقمي) |
| `content` | `$json.body.content` (نص الرسالة) | `$json.message.text` (نص الرسالة) |
| `source` | القيمة الثابتة `"whatsapp"` | القيمة الثابتة `"telegram"` |

**بعد التطبيع:**
```json
{ "from": "966501234567", "content": "ABCD1234", "source": "whatsapp" }
{ "from": "123456789",    "content": "ABCD1234", "source": "telegram" }
```

---

## التحقق

### العقدة 6: Verify_Identity
```
النوع:    n8n-nodes-base.httpRequest
الطريقة:  POST
الرابط:   /api/v1/bot/check-auth
الغاية:   التحقق من هوية المستخدم ومعرفة الإجراء المطلوب
continueOnFail: true  ← يكمل حتى عند فشل الاتصال بالسيرفر
```

**ما يُرسله:**
```json
{
  "phoneNumber": "966501234567",
  "activationCode": "ABCD1234",
  "source": "whatsapp"
}
```

> **ملاحظة مهمة — حقل `source`:** هذا الحقل أُضيف في التحديث V23.1 ويُخبر السيرفر بمصدر الرسالة. بدونه كان المستخدمون عبر تيليغرام يحصلون على `unauthorized` لأن `chat.id` (رقم تيليغرام) لا يُطابَق برقم الهاتف. الآن:
> - `source: "whatsapp"` → يُقارَن الـ LID أو رقم الهاتف بالسجل المسجّل
> - `source: "telegram"` → يُبحَث بـ `telegramChatId` مباشرةً، ولا مقارنة هاتفية (chat.id ليس رقم هاتف)

**ما يرجعه السيرفر:**
```json
{
  "authorized": true,
  "action": "message",
  "full_name": "إبراهيم محمد",
  "deactivation_code": "STOP-XYZ9"
}
```

**قيم action الممكنة:**
- `activated` — تفعيل ناجح (كود صحيح) → يُخزَّن `whatsappLid` أو `telegramChatId` تلقائياً
- `deactivated` — إيقاف يدوي
- `auto_deactivated` — انتهت الجلسة تلقائياً بعد 5 دقائق
- `message` — المستخدم نشط ويرسل سؤالاً
- `unauthorized` — كود خاطئ أو مستخدم غير مسجل

---

### العقدة 7: Restore_Context
```
النوع:    n8n-nodes-base.code (JavaScript)
الغاية:   إعادة ربط بيانات المصدر (source, from, content) بعد فقدانها
```

**المشكلة التقنية:** عندما ينفِّذ `Verify_Identity` طلب HTTP، فإن الـ output الخاص به يكون فقط بيانات رد الـ API، وتُفقَد البيانات الأصلية (source, from, content).

**الحل — كود JavaScript:**
```javascript
const authResp = $input.item.json;  // رد check-auth

let source, from, content;
try {
  // جرِّب WhatsApp أولاً
  const wa = $('Normalize_WA').item.json;
  source = wa.source; from = wa.from; content = wa.content;
} catch (_e1) {
  // إذا فشل → جرِّب Telegram
  const tg = $('Normalize_TG').item.json;
  source = tg.source; from = tg.from; content = tg.content;
}

return [{ json: { ...authResp, source, from, content } }];
```

**النتيجة النهائية بعد دمج البيانات:**
```json
{
  "authorized": true,
  "action": "message",
  "full_name": "إبراهيم محمد",
  "source": "telegram",
  "from": "123456789",
  "content": "كم عدد الموظفين؟"
}
```

---

## معالجة الأخطاء

### العقدة 8: Check_Service_Error
```
النوع:    n8n-nodes-base.if
الغاية:   اكتشاف ما إذا كان السيرفر قد أعاد خطأً
```

**الشرط:** هل `typeof $json.error === "object"`؟

عندما تفشل العقدة `Verify_Identity` (مع `continueOnFail: true`)، فإن الـ output يحتوي على:
```json
{ "error": { "message": "ECONNREFUSED", "name": "RequestError" }, "source": "whatsapp", "from": "..." }
```

- **True (خطأ):** يذهب إلى `Source_Error_Router` + `Admin_Error_Alert` في آنٍ واحد
- **False (طبيعي):** يذهب إلى `Route_by_Action`

---

### العقدة 9: Source_Error_Router
```
النوع:    n8n-nodes-base.if
الغاية:   إرسال رسالة الخطأ للمستخدم عبر القناة الصحيحة
```

- **True (whatsapp):** → `WA_Service_Error`
- **False (telegram):** → `TG_Service_Error`

---

### العقدة 10: WA_Service_Error | العقدة 11: TG_Service_Error
```
الغاية:   إبلاغ المستخدم بأن الخدمة غير متاحة
```

**الرسالة المُرسَلة:**
```
⚠️ عذراً، النظام غير متاح حالياً بسبب خطأ تقني.
يرجى المحاولة مرة أخرى بعد دقيقتين.
إذا استمرت المشكلة، تواصل مع مسؤول النظام.
```

---

### العقدة 12: Admin_Error_Alert
```
النوع:    n8n-nodes-base.telegram
المستقبِل: ADMIN_TELEGRAM_CHAT_ID
الغاية:   إبلاغ المدير فوراً عن أي خطأ في السيرفر
```

**الرسالة المُرسَلة للمدير:**
```
🚨 تنبيه: خطأ في خدمة التحقق

⏰ الوقت: 19/03/2026، 14:30
📡 المصدر: whatsapp
📞 المُرسِل: 966501234567
❌ الخطأ: ECONNREFUSED - connect ECONNREFUSED 127.0.0.1:5000

⚠️ يُرجى مراجعة السيرفر فوراً.
```

**كيف يعمل:** عندما يرجع `Check_Service_Error` بـ True، يُرسل البيانات لكلٍّ من `Source_Error_Router` و`Admin_Error_Alert` في نفس الوقت (اتصال واحد لمخرجَين).

---

## التوجيه

### العقدة 13: Route_by_Action
```
النوع:    n8n-nodes-base.switch
الغاية:   توجيه التنفيذ للمسار الصحيح بناءً على قيمة action
```

| المخرج | القيمة | الوجهة |
|--------|--------|--------|
| 0 — تفعيل | `activated` | `Dispatch_Welcome` |
| 1 — إيقاف يدوي | `deactivated` | `Dispatch_Goodbye` |
| 2 — إيقاف تلقائي | `auto_deactivated` | `Dispatch_AutoTimeout` |
| 3 — رسالة للذكاء | `message` | `AI_Agent` |
| 4 — غير مصرح | `unauthorized` | `Admin_Unauthorized_Alert` |

---

### عقد التوجيه حسب القناة: Dispatch_Welcome / Dispatch_Goodbye / Dispatch_AutoTimeout
```
النوع:    n8n-nodes-base.if
الشرط:    $json.source === "whatsapp"
```

- **True:** → عقدة WhatsApp المقابلة
- **False:** → عقدة Telegram المقابلة

هذا النمط يضمن وصول كل رسالة عبر نفس القناة التي أرسلها المستخدم منها.

---

## الذاكرة

### العقدة 26: Memory_Window
```
النوع:    @n8n/n8n-nodes-langchain.memoryBufferWindow
الغاية:   الحفاظ على سياق المحادثة لكل مستخدم على كل قناة
```

**الإعدادات المهمة:**

| الإعداد | القيمة | التفسير |
|---------|--------|---------|
| `sessionIdType` | `customKey` | مفتاح مخصص بدلاً من المعرِّف الافتراضي |
| `sessionKey` | `{from}_{source}` | مفتاح فريد لكل مستخدم وقناة |
| `contextWindowLength` | `10` | يحتفظ بآخر 10 رسائل فقط |

**مثال على المفاتيح:**
```
966501234567_whatsapp  ← مستخدم WA
123456789_telegram     ← نفس الشخص عبر TG (ذاكرة منفصلة)
966507654321_whatsapp  ← مستخدم WA آخر
```

**لماذا 10 رسائل فقط؟**
- تجنُّب استهلاك tokens كثيرة مع Gemini
- أداء أسرع
- السياق الضروري عادةً لا يتجاوز 5-7 رسائل

---

## الذكاء الاصطناعي

### العقدة 24: AI_Agent
```
النوع:    @n8n/n8n-nodes-langchain.agent
النموذج:  Google Gemini (Hxp1njnkn8szDJPn)
الغاية:   المعالجة الذكية للاستفسارات واستدعاء الأدوات المناسبة
```

**System Prompt (الموجِّه):**
```
أنت النظام الخبير للإدارة التقنية والذاتية بمديرية الصحة.
الموظف المُصرَّح له: {{ full_name }}

قواعد صارمة:
[1] لا تجيب من معرفتك — استخدم الأدوات دائماً
[2] للإحصاءات: get_employee_stats
[3] للتفاصيل: fetch_employee_database
[4] لملف Word: generate_word_link
[5] لملف Excel: export_excel_tool
[6] الموظف غير الموجود: "لا يوجد موظف بهذا الاسم"
[7] اللغة العربية الفصيحة دائماً
```

**مدخل الرسالة:** `$json.content` (السؤال الذي كتبه المستخدم)

---

### العقدة 25: Gemini_Model
```
النوع:    @n8n/n8n-nodes-langchain.lmChatGoogleGemini
الـ Credential: Hxp1njnkn8szDJPn (موجود مسبقاً)
الاتصال:  ai_languageModel → AI_Agent
```

يتصل بـ AI_Agent عبر اتصال خاص من نوع `ai_languageModel`، وليس اتصالاً عادياً.

---

### العقدة 27: fetch_employee_database
```
النوع:    @n8n/n8n-nodes-langchain.toolHttpRequest
الرابط:   /api/v1/bot/master-query
الغاية:   جلب كافة بيانات الموظفين التفصيلية
الاتصال:  ai_tool → AI_Agent
```

**متى يستخدمها الذكاء الاصطناعي:**
- "أعطني بيانات الموظف أحمد"
- "ما هو رقم هاتف فلان؟"
- "هل الموظف X موجود؟"

---

### العقدة 28: generate_word_link
```
النوع:    @n8n/n8n-nodes-langchain.toolHttpRequest
الرابط:   /api/v1/bot/generate-word-link
المعاملات: nationalId (اختياري) أو name (اختياري)
الغاية:   توليد بطاقة Word للموظف وإرجاع رابط التنزيل
```

**متى يستخدمها:**
- "حمِّل بطاقة الموظف أحمد"
- "أريد ملف وورد لـ X"
- "أعطني وثيقة فلان"

---

### العقدة 29: export_excel_tool
```
النوع:    @n8n/n8n-nodes-langchain.toolHttpRequest
الرابط:   /api/v1/bot/generate-custom-excel
الغاية:   تصدير ملف Excel مخصص بناءً على فلاتر وأعمدة يحددها الموظف
```

**المعاملات المدعومة (كلها اختيارية — يحددها الذكاء الاصطناعي تلقائياً):**

| المعامل | الوصف | مثال |
|---------|-------|-------|
| `status` | وضع العامل الحالي | على رأس عمله / إجازة / نقل |
| `category` | الفئة الوظيفية | طبي / تمريض / إداري / تقني |
| `gender` | الجنس | ذكر / أنثى |
| `employmentStatus` | نوع التوظيف | دائم / مؤقت / عقد |
| `assignedWork` | العمل المكلف به | اسم العمل |
| `search` | بحث نصي | اسم أو رقم وطني أو جوال |
| `columns` | أعمدة مختارة مفصولة بفاصلة | الاسم والكنية,رقم الجوال |
| `title` | عنوان مخصص للملف | تقرير الأطباء |

**متى يستخدمها:**
- "صدِّر بيانات الموظفين إكسل" ← يصدِّر الكل بجميع الأعمدة
- "أريد إكسل موظفي التمريض فقط" ← يُفعِّل فلتر category=تمريض
- "أعطني إكسل الإناث على رأس عملهن" ← gender=أنثى + status=على رأس عمله
- "إكسل بالاسم والجوال والصفة فقط" ← يُمرِّر columns المحددة
- "جدول الأطباء الدائمين برواتبهم" ← category=طبي + employmentStatus=دائم

---

### العقدة 30: get_employee_stats ← جديدة
```
النوع:    @n8n/n8n-nodes-langchain.toolHttpRequest
الرابط:   /api/v1/bot/stats
الغاية:   إحصاءات سريعة بدون استرجاع كل السجلات
```

**ما تُرجعه:**
```json
{
  "total": 450,
  "byStatus": { "على رأس عمله": 380, "إجازة": 50, "نقل": 20 },
  "byCategory": { "طبي": 200, "تمريض": 150, "إداري": 100 },
  "byGender": { "ذكر": 280, "أنثى": 170 },
  "byEmploymentStatus": { "دائم": 320, "مؤقت": 130 }
}
```

**متى يستخدمها:**
- "كم عدد الموظفين؟"
- "كم موظفاً في إجازة؟"
- "ما نسبة النساء؟"
- أي سؤال إحصائي عام

**ميزتها:** أسرع بكثير من `fetch_employee_database` لأنها تُجيب بإحصاء دون نقل كل السجلات.

---

## إرسال الردود

### العقد 31-33: Dispatch_AI_Response / WA_AI_Output / TG_AI_Output
```
الغاية:   إرسال رد الذكاء الاصطناعي عبر القناة الصحيحة
```

**السيناريو:**
1. `AI_Agent` ينتهي من المعالجة ويُخرج `$json.output`
2. `Dispatch_AI_Response` يفحص `$('Restore_Context').item.json.source`
3. إذا WhatsApp → `WA_AI_Output` (HTTP POST لـ 172.17.0.1:8082)
4. إذا Telegram → `TG_AI_Output` (Telegram Node)
5. كلاهما يتجه لـ `Log_Conversation`

**لماذا نرجع لـ Restore_Context لمعرفة المصدر؟**
لأن `AI_Agent` يُخرج فقط نص الرد (`output`)، ولا يحمل `source`. لذا نرجع للعقدة التي حفظت المصدر في بداية التسلسل.

---

## تسجيل المحادثات

### العقدة 34: Log_Conversation
```
النوع:    n8n-nodes-base.httpRequest
الطريقة:  POST
الرابط:   /api/v1/bot/log-conversation
continueOnFail: true  ← لا يوقف التنفيذ إذا فشل التسجيل
الغاية:   حفظ كل محادثة في سجل التدقيق (Audit Log)
```

**ما يُرسله:**
```json
{
  "phoneNumber": "966501234567",
  "source": "whatsapp",
  "userMessage": "كم عدد الموظفين؟",
  "botResponse": "إجمالي الموظفين هو 450 موظفاً..."
}
```

**أين تُحفظ؟** في جدول `audit_logs` بقاعدة البيانات بهذا الشكل:
```
action:     BOT_CONVERSATION
entityType: BOT_USER
entityId:   966501234567
newValues:  { source, userMessage, botResponse, timestamp }
```

---

## كيفية المشاهدة

### مشاهدة المحادثات المسجَّلة

**الطريقة 1 — من لوحة التحكم:**
1. سجِّل دخولك بـ `admin / 123456`
2. اذهب إلى قسم **سجل التدقيق** في القائمة الجانبية
3. ابحث عن الإجراءات من نوع `BOT_CONVERSATION`
4. كل سطر يحتوي على: معرِّف المستخدم، القناة، السؤال، الرد، الوقت

**الطريقة 2 — مباشرةً من n8n:**
1. افتح الورك فلو في n8n
2. اضغط على **Executions** في القائمة العلوية
3. اختر أي تنفيذ لترى تفصيله خطوةً بخطوة
4. اضغط على عقدة `Log_Conversation` لترى البيانات المُرسَلة

---

## إشعارات المدير

### كيف تُنشأ وتُرسَل؟

هناك **3 أنواع** من إشعارات المدير:

---

#### النوع 1: تنبيه خطأ السيرفر — Admin_Error_Alert (العقدة 12)

**متى يُرسَل:** عند فشل الاتصال بالسيرفر أثناء `Verify_Identity`

**مسار الإرسال:**
```
Verify_Identity (يفشل) → continueOnFail يُكمل مع $json.error
   ↓
Restore_Context (يُضيف source و from)
   ↓
Check_Service_Error (يكتشف $json.error موجود)
   ↓
Admin_Error_Alert ← يُرسَل هنا بالتوازي مع Source_Error_Router
```

**الرسالة:**
```
🚨 تنبيه: خطأ في خدمة التحقق

⏰ الوقت: [التاريخ والوقت]
📡 المصدر: whatsapp / telegram
📞 المُرسِل: [رقم الهاتف أو chat_id]
❌ الخطأ: [رسالة الخطأ التقنية]

⚠️ يُرجى مراجعة السيرفر فوراً.
```

---

#### النوع 2: تنبيه وصول غير مصرح — Admin_Unauthorized_Alert (العقدة 23)

**متى يُرسَل:** عندما يُرسل شخص كوداً خاطئاً أو غير مسجَّل في النظام

**مسار الإرسال:**
```
check-auth يرجع { action: "unauthorized" }
   ↓
Restore_Context يُضيف source و from
   ↓
Check_Service_Error → False (طبيعي، لا خطأ)
   ↓
Route_by_Action → المخرج رقم 4 (unauthorized)
   ↓
Admin_Unauthorized_Alert ← يُرسَل هنا
```

**الرسالة:**
```
🔐 محاولة وصول غير مصرح به

⏰ الوقت: [التاريخ والوقت]
📡 المصدر: whatsapp / telegram
📞 المُعرِّف: [رقم الهاتف أو chat_id]
🔑 الكود المُرسَل: [الكود الذي أدخله]

⚠️ هذا المستخدم غير مسجل في النظام أو أرسل كوداً خاطئاً.
```

**الفائدة:** يُنبِّهك فوراً إذا حاول أحد التطفل على النظام.

---

#### النوع 3: تنبيه التفعيل الجديد — Admin_Activation_Alert (العقدة 37)

**متى يُرسَل:** عند كل تفعيل ناجح لمستخدم عبر واتساب أو تيليغرام

**مسار الإرسال:**
```
check-auth يرجع { action: "activated" }
   ↓
Restore_Context يُضيف source و from
   ↓
Check_Service_Error → False (طبيعي)
   ↓
Route_by_Action → المخرج رقم 0 (activated)
   ↓
Dispatch_Welcome ← يُوجِّه لـ WA_Welcome أو TG_Welcome
   ↓ (بالتوازي مع رسالة الترحيب)
Admin_Activation_Alert ← يُرسَل هنا عبر /api/v1/bot/admin-notify
```

**الرسالة التي يستلمها المدير:**
```
✅ تفعيل جديد للبوت

👤 الاسم: إبراهيم محمد
📡 المصدر: whatsapp / telegram
📞 الرقم: 9671XXXXXXXXX
⏰ الوقت: 19/03/2026، 14:30

💡 المستخدم أصبح نشطاً في النظام.
```

**الفائدة:** تُخبرك فوراً عند كل تفعيل جديد لمتابعة استخدام البوت والتحقق من هوية المستخدمين.

> ملاحظة: يُرسَل الإشعار عبر نقطة `/api/v1/bot/admin-notify` (وليس مباشرةً عبر بوابة WA)، مما يعني وصوله عبر WA وTG معاً حسب الإعدادات.

---

#### النوع 4: تقرير التنظيف الساعي — Admin_Cleanup_Report (العقدة 36)

**متى يُرسَل:** كل ساعة تلقائياً

**مسار الإرسال:**
```
Schedule_Cleanup_Trigger (كل ساعة)
   ↓
Call_Cleanup_API (يُنظِّف الجلسات المنتهية على السيرفر)
   ↓
Admin_Cleanup_Report ← يُرسَل هنا بنتيجة التنظيف
```

**الرسالة:**
```
🧹 تقرير التنظيف التلقائي — [التاريخ والوقت]

✅ جلسات مُنظَّفة: 3
👥 إجمالي المستخدمين: 45
🟢 نشطون بعد التنظيف: 12

⏰ وقت التنفيذ: 2026-03-19T14:00:00.000Z
```

---

### كيف تستلم الإشعارات؟

1. افتح تطبيق Telegram
2. ابحث عن بوتك أو ابدأ محادثة معه
3. اكتب أي رسالة
4. ستظهر لك رسالة، انسخ الـ `chat_id` من هنا:
   ```
   https://api.telegram.org/bot{TOKEN}/getUpdates
   ```
5. ضع هذا الـ ID مكان `ADMIN_TELEGRAM_CHAT_ID` في الـ 3 عقد المعنية

---

## التنظيف التلقائي

### العقدة 35: Call_Cleanup_API
```
الطريقة: POST
الرابط:  /api/v1/bot/cleanup-sessions
الغاية:  إيقاف جلسات الموظفين التي انتهت (أكثر من 5 دقائق بدون نشاط)
```

**ما يفعله السيرفر:**
1. يجلب كل مستخدمي البوت
2. يحسب نقطة الزمن = الآن - 5 دقائق
3. يُوقف كل من كان `isBotActive: true` و`lastInteraction` أقدم من 5 دقائق
4. يُرجع تقرير بالأعداد

**لماذا رغم وجود Cron داخلي في السيرفر؟**
السيرفر يُنظِّف كل 60 ثانية تلقائياً. هذا الـ endpoint يتيح:
- التنظيف اليدوي عند الحاجة
- استقبال تقرير مفصَّل لإرساله للمدير
- التحكم من n8n في وقت التنظيف

---

## إعداد الورك فلو

### الخطوات المطلوبة قبل التفعيل

**الخطوة 1: استيراد الملف**
```
n8n → Workflows → Import from file
اختر: docs/workflows/Sidawi_AI_Health_V23.json
```

**الخطوة 2: إنشاء Telegram Credential**
```
n8n → Credentials → New → Telegram API
Name: Telegram API
Token: (من @BotFather)
Save
```

**الخطوة 3: استبدال TELEGRAM_CREDENTIAL_ID**
في كل عقدة Telegram (6 عقد):
- TG_Trigger
- TG_Service_Error
- Admin_Error_Alert
- TG_Welcome / TG_Goodbye / TG_AutoTimeout
- TG_AI_Output
- Admin_Unauthorized_Alert
- Admin_Cleanup_Report

غيِّر:
```
"id": "TELEGRAM_CREDENTIAL_ID"
```
إلى الـ ID الفعلي للـ Credential الذي أنشأته.

**الخطوة 4: استبدال ADMIN_TELEGRAM_CHAT_ID**
في 3 عقد:
- Admin_Error_Alert
- Admin_Unauthorized_Alert
- Admin_Cleanup_Report

غيِّر `ADMIN_TELEGRAM_CHAT_ID` إلى رقمك الفعلي.

**الخطوة 5: تحديث رابط السيرفر**
ابحث عن:
```
employee-management-system-ai-chat--alsid2225.replit.app
```
واستبدله برابط Replit الفعلي إذا كان مختلفاً.

**الخطوة 6: تفعيل الورك فلو**
```
Toggle الـ Active في أعلى يمين الورك فلو
```

---

## API Endpoints

تمت إضافة endpoints جديدة لدعم الورك فلو متعدد القنوات:

### PATCH /api/v1/bot/bot-users/:id — إعادة تعيين الجهاز *(جديد V23.1)*
```
الحماية:  session (تسجيل دخول لوحة التحكم)
الغاية:   مسح whatsappLid أو telegramChatId أو كليهما لإعادة تسجيل الجهاز

الجسم (أحد الخيارات):
{ "resetWhatsappLid": true }        ← يمسح معرف واتساب فقط
{ "resetTelegramId": true }          ← يمسح معرف تيليغرام فقط
{ "resetWhatsappLid": true, "resetTelegramId": true }  ← يمسح كليهما

الرد: { "success": true, "user": { ... } }
```

**متى تستخدمه؟**
- المستخدم غيّر هاتفه → امسح `whatsappLid` ليتمكن من التفعيل من الجهاز الجديد
- المستخدم غيّر حساب تيليغرام → امسح `telegramChatId`
- في لوحة التحكم: صفحة **المستخدمون** → **مستخدمو البوت** → أيقونة 🟣 أو 🔵 بجانب الاسم

---

### GET /api/v1/bot/stats
```
الحماية: x-api-key header
الغاية:  إحصاءات الموظفين للبوت

الرد:
{
  "total": 450,
  "byStatus": { ... },
  "byCategory": { ... },
  "byGender": { ... },
  "byEmploymentStatus": { ... },
  "generatedAt": "2026-03-19T14:00:00.000Z"
}
```

### POST /api/v1/bot/log-conversation
```
الحماية: x-api-key header
الجسم:
{
  "phoneNumber": "966501234567",
  "source": "whatsapp",
  "userMessage": "السؤال",
  "botResponse": "الجواب"
}

الرد: { "success": true }
```

### POST /api/v1/bot/cleanup-sessions
```
الحماية: x-api-key header
لا يحتاج جسماً

الرد:
{
  "success": true,
  "cleaned": 3,
  "totalUsers": 45,
  "activeAfterCleanup": 12,
  "cleanedAt": "2026-03-19T14:00:00.000Z"
}
```

---

## ملخص العقد الـ 37

| # | الاسم | النوع | الغاية |
|---|-------|-------|--------|
| 1 | WA_Webhook | Webhook | استقبال WhatsApp |
| 2 | TG_Trigger | Telegram Trigger | استقبال Telegram |
| 3 | Schedule_Cleanup_Trigger | Schedule | جدول ساعي |
| 4 | Normalize_WA | Set | توحيد بيانات WA |
| 5 | Normalize_TG | Set | توحيد بيانات TG |
| 6 | Verify_Identity | HTTP Request | التحقق من السيرفر |
| 7 | Restore_Context | Code (JS) | إعادة ربط المصدر |
| 8 | Check_Service_Error | IF | اكتشاف الأخطاء |
| 9 | Source_Error_Router | IF | توجيه رسالة الخطأ |
| 10 | WA_Service_Error | HTTP Request | خطأ عبر WA |
| 11 | TG_Service_Error | Telegram | خطأ عبر TG |
| 12 | Admin_Error_Alert | Telegram | تنبيه المدير بالخطأ |
| 13 | Route_by_Action | Switch | توجيه حسب الإجراء |
| 14 | Dispatch_Welcome | IF | توجيه الترحيب |
| 15 | WA_Welcome | HTTP Request | ترحيب عبر WA |
| 16 | TG_Welcome | Telegram | ترحيب عبر TG |
| 17 | Dispatch_Goodbye | IF | توجيه الوداع |
| 18 | WA_Goodbye | HTTP Request | وداع عبر WA |
| 19 | TG_Goodbye | Telegram | وداع عبر TG |
| 20 | Dispatch_AutoTimeout | IF | توجيه انتهاء الجلسة |
| 21 | WA_AutoTimeout | HTTP Request | انتهاء جلسة WA |
| 22 | TG_AutoTimeout | Telegram | انتهاء جلسة TG |
| 23 | Admin_Unauthorized_Alert | Telegram | تنبيه وصول غير مصرح |
| 24 | AI_Agent | LangChain Agent | الذكاء الاصطناعي |
| 25 | Gemini_Model | Google Gemini | نموذج اللغة |
| 26 | Memory_Window | Buffer Memory | ذاكرة 10 رسائل |
| 27 | fetch_employee_database | HTTP Tool | جلب بيانات الموظفين |
| 28 | generate_word_link | HTTP Tool | توليد ملف Word |
| 29 | export_excel_tool | HTTP Tool | تصدير Excel |
| 30 | get_employee_stats | HTTP Tool | إحصاءات سريعة |
| 31 | Dispatch_AI_Response | IF | توجيه رد الذكاء |
| 32 | WA_AI_Output | HTTP Request | إرسال رد WA |
| 33 | TG_AI_Output | Telegram | إرسال رد TG |
| 34 | Log_Conversation | HTTP Request | تسجيل المحادثة |
| 35 | Call_Cleanup_API | HTTP Request | تنظيف الجلسات |
| 36 | Admin_Cleanup_Report | Telegram | تقرير التنظيف للمدير |
| 37 | Admin_Activation_Alert | HTTP Request | تنبيه المدير عند التفعيل |

---

*آخر تحديث: مارس 2026 — Sidawi AI Health V23 Multi-Channel Pro*
