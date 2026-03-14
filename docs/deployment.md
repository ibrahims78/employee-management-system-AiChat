# دليل النشر العام | General Deployment Guide

<div dir="rtl">

## الطرق المتاحة للنشر

| الطريقة | البيئة | الصعوبة | الموصى به |
|---------|--------|---------|----------|
| Docker (setup.bat) | ويندوز 10 محلي | ⭐ سهل | ✅ نعم |
| Docker (يدوي) | ويندوز / Linux / macOS | ⭐⭐ متوسط | ✅ نعم |
| Replit | سحابي | ⭐ سهل | ✅ للتطوير |

---

## 1. النشر على ويندوز 10 (Docker)

راجع الدليل التفصيلي: [docker-windows-setup.md](docker-windows-setup.md)

**الملخص السريع:**
```powershell
# طريقة تلقائية
تشغيل setup.bat كمسؤول

# طريقة يدوية
git clone https://github.com/ibrahims78/employee-management-system.git
cd employee-management-system
docker compose up -d --build
```

---

## 2. النشر على Linux (Docker)

```bash
# تثبيت Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# تنزيل المشروع
git clone https://github.com/ibrahims78/employee-management-system.git
cd employee-management-system

# تشغيل الحاويات
docker compose up -d --build

# التحقق
docker ps
```

---

## 3. النشر على Replit (للتطوير)

1. افتح مشروعك على Replit
2. تأكد من وجود متغير `DATABASE_URL` في الـ Secrets
3. شغّل سكريبت إنشاء المدير: `npx tsx script/seed-admin.ts`
4. شغّل Workflow: `npm run dev`

---

## إعداد المتغيرات البيئية

انسخ `.env.example` إلى `.env` وعدّل القيم:

```bash
cp .env.example .env
```

| المتغير | الوصف | مثال |
|--------|-------|------|
| `DATABASE_URL` | رابط قاعدة البيانات | `postgres://user:pass@host:5432/db` |
| `SESSION_SECRET` | مفتاح تشفير الجلسات (32+ حرف) | سلسلة عشوائية طويلة |
| `PORT` | منفذ الخادم | `5001` |
| `NODE_ENV` | بيئة التشغيل | `production` أو `development` |
| `COOKIE_SECURE` | تأمين الكوكيز (HTTPS) | `false` للـ HTTP المحلي |

---

## أوامر مفيدة بعد التشغيل

```bash
# عرض الحاويات العاملة
docker ps

# سجلات التطبيق
docker logs staff-health-app -f

# إعادة بناء بعد تحديث الكود
docker compose down && docker compose up -d --build

# نسخ احتياطي لقاعدة البيانات
docker exec staff-health-db pg_dump -U hruser hr_db > backup_$(date +%Y%m%d).sql

# استعادة من نسخة احتياطية
docker exec -i staff-health-db psql -U hruser hr_db < backup.sql
```

---

## ملاحظات هامة للإنتاج

- ✅ غيّر `SESSION_SECRET` إلى قيمة عشوائية قوية (استخدم `openssl rand -hex 32`)
- ✅ غيّر كلمة مرور المدير (`admin / 123456`) فوراً بعد أول دخول
- ✅ غيّر كلمة مرور قاعدة البيانات في `docker-compose.yml`
- ✅ فعّل `COOKIE_SECURE=true` إذا كنت تستخدم HTTPS
- ✅ احتفظ بنسخ احتياطية دورية من مجلد `storage/` وقاعدة البيانات

</div>
