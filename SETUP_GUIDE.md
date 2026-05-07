# 🎓 LMS Academy — Multi-tenant Setup Guide

## ما الذي تم تعديله في هذا المشروع

| الملف | التعديل |
|-------|---------|
| `lib/db/src/schema/tenants.ts` | **جديد** — جدول الـ tenants الرئيسي |
| `lib/db/src/schema/settings.ts` | أضفنا `tenant_id` |
| `lib/db/src/schema/courses.ts` | أضفنا `tenant_id` |
| `lib/db/src/schema/students.ts` | أضفنا `tenant_id` |
| `lib/db/src/schema/categories.ts` | أضفنا `tenant_id` |
| `artifacts/api-server/src/middlewares/tenant.ts` | **جديد** — Tenant Middleware |
| `artifacts/api-server/src/routes/tenant.ts` | **جديد** — Tenant API Route |
| `artifacts/api-server/src/app.ts` | ربطنا الـ middleware |
| `artifacts/api-server/src/routes/index.ts` | أضفنا tenant routes |
| `artifacts/lms-platform/src/hooks/useTenant.ts` | **جديد** — React Hook |
| `artifacts/lms-platform/src/hooks/usePixels.ts` | يقرأ من useTenant |
| `artifacts/lms-platform/src/App.tsx` | TenantProvider يلف التطبيق |
| `pnpm-workspace.yaml` | أزلنا إعدادات Replit |
| `artifacts/lms-platform/vite.config.ts` | أزلنا plugins Replit |

---

## ⚡ خطوات تشغيل المشروع على Windows

### المتطلبات المسبقة
1. **Node.js 20+** — حمّله من https://nodejs.org
2. **pnpm** — شغّل في PowerShell:
   ```powershell
   npm install -g pnpm
   ```
3. **Git** (اختياري) — من https://git-scm.com

---

### الخطوة 1 — فك الضغط والإعداد

```powershell
# فك الـ zip في مكان مناسب مثل:
# C:\Projects\lmsAcademy

# افتح PowerShell داخل مجلد المشروع
cd C:\Projects\lmsAcademy
```

### الخطوة 2 — إعداد ملف البيئة

```powershell
# انسخ ملف المثال
copy .env.example .env
```

افتح `.env` وعدّل القيم:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
PORT=3000
SESSION_SECRET="اكتب هنا نص عشوائي طويل"
ALLOWED_ORIGIN="http://localhost:5173"
BASE_DOMAIN=""
```

> **قاعدة البيانات:** يمكنك استخدام Supabase (مجاني) أو Neon.tech أو PostgreSQL محلي.

### الخطوة 3 — تثبيت الـ packages

```powershell
pnpm install
```

### الخطوة 4 — تشغيل Migration قاعدة البيانات

**هذه الخطوة مهمة جداً** — شغّل الـ SQL التالي على قاعدة بياناتك:

```powershell
# الطريقة 1: عبر psql (إذا مثبت)
psql "%DATABASE_URL%" -f lib\db\drizzle\add_multitenancy.sql

# الطريقة 2: عبر Supabase Dashboard
# افتح SQL Editor وانسخ محتوى الملف lib/db/drizzle/add_multitenancy.sql
```

### الخطوة 5 — تشغيل الـ Backend

```powershell
# في PowerShell window أولى
cd artifacts\api-server
pnpm dev:watch
```

ستشوف في الـ terminal:
```
Server listening {"port": 3000}
```

### الخطوة 6 — تشغيل الـ Frontend

```powershell
# في PowerShell window ثانية
cd artifacts\lms-platform
pnpm dev
```

افتح المتصفح على: **http://localhost:5173**

---

## ✅ اختبار الـ Features

### Test 1 — Tenant يتحل بشكل صحيح

```powershell
# اختبر الـ tenant theme endpoint
curl http://localhost:3000/api/tenant/theme?slug=default
```

المتوقع:
```json
{
  "tenantId": 1,
  "theme": {
    "academyName": "My Academy",
    "logoUrl": null,
    "metaPixelId": null,
    ...
  }
}
```

### Test 2 — إنشاء Tenant جديد

أولاً سجّل دخول كـ Admin واحصل على token:
```powershell
curl -X POST http://localhost:3000/api/admin-auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@example.com","password":"yourpassword"}'
```

ثم أنشئ tenant جديد:
```powershell
curl -X POST http://localhost:3000/api/tenant `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d '{"slug":"ahmed","name":"أكاديمية أحمد"}'
```

### Test 3 — Suspend Tenant

```powershell
curl -X PATCH http://localhost:3000/api/tenant/1/status `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d '{"status":"suspended"}'
```

الآن أي request على الـ tenant المعلق سيرجع:
```json
{"error": "Academy suspended", "message": "..."}
```

### Test 4 — Status Check يعمل

```powershell
# بعد الـ suspend
curl http://localhost:3000/api/courses `
  -H "Host: ahmed.yourdomain.com"
# يجب أن يرجع 403
```

---

## ⚠️ ما الناقص في المشروع (للإنتاج)

### 🔴 ضروري قبل Launch

| الناقص | السبب | الحل |
|--------|-------|------|
| **Storefront Pages** | لا يوجد صفحات للطلاب (Home, Course List, Checkout) | أنشئ `src/pages/storefront/` |
| **tenant_id في باقي الجداول** | `enrollments`, `payments`, `quizzes`, `coupons`, `instructors`, `activity`, `certificates` لا تزال بدون `tenant_id` | شغّل ALTER TABLE مشابه للـ migration |
| **Queries Backend محدثة** | routes الكورسات والطلاب لا تزال لا تفلتر بـ `tenant_id` | أضف `eq(coursesTable.tenantId, req.tenantId)` في كل query |
| **رفع الصور (File Upload)** | حالياً يحفظ محلياً، لا يفصل بين tenants | استخدم Cloudinary أو S3 مع مجلد `tenants/{id}/` |
| **HTTPS / SSL** | مطلوب لـ production | Vercel يعمل تلقائياً، VPS يحتاج Certbot |

### 🟡 مهم (قبل نهاية الشهر الأول)

| الناقص | الحل |
|--------|------|
| **Payment Gateway** | أضف Stripe أو Moyasar (للسوق العربي) |
| **Email System** | أضف Resend أو Mailgun لإرسال confirmations |
| **Rate Limiting** | استخدم `express-rate-limit` لحماية الـ API |
| **Tenant Onboarding Flow** | صفحة تسجيل للمدربين الجدد |

### 🟢 تحسينات لاحقاً

| الناقص | الحل |
|--------|------|
| **Super Admin Dashboard** | واجهة لإدارة كل الـ tenants |
| **Custom Domain Verification** | تحقق أن الدومين يشير للسيرفر قبل الحفظ |
| **Usage Analytics** | تتبع عدد الطلاب والكورسات لكل tenant |
| **Billing System** | ربط خطط الاشتراك بـ Stripe Billing |

---

## 🚀 النشر على Vercel

### الـ Frontend على Vercel

1. ادفع الكود على GitHub
2. افتح https://vercel.com → New Project
3. اختر الـ repo
4. في **Root Directory**: `artifacts/lms-platform`
5. في **Environment Variables** أضف:
   ```
   VITE_BASE_DOMAIN=yourdomain.com
   VITE_DEV_TENANT_SLUG=default
   ```
6. أضف Wildcard Domain: في Vercel → Settings → Domains → أضف `*.yourdomain.com`

### الـ Backend على Railway أو Render

> Vercel لا تدعم Express servers بشكل مستقر للـ long-running processes.

**Railway (الأفضل للـ Backend):**
1. افتح https://railway.app → New Project
2. اختر "Deploy from GitHub"
3. Root Directory: `artifacts/api-server`
4. أضف Environment Variables من `.env`
5. احصل على الـ URL (مثل `api.yourdomain.com`)

**Render (بديل مجاني):**
1. افتح https://render.com → New Web Service
2. Root Directory: `artifacts/api-server`
3. Build Command: `pnpm install && pnpm build`
4. Start Command: `pnpm start`

---

## 📊 مقارنة منصات الاستضافة

| المنصة | النوع | السعر | الأفضل لـ |
|--------|-------|-------|-----------|
| **Vercel** | Frontend | مجاني / 20$ | React فقط |
| **Railway** | Full-stack | 5$/شهر | Backend + DB |
| **Render** | Full-stack | مجاني (بطيء) / 7$ | مشاريع صغيرة |
| **DigitalOcean App Platform** | Full-stack | 12$/شهر | مشاريع متوسطة |
| **Hetzner VPS** | VPS | 4-6€/شهر | **الأفضل سعراً** |
| **Supabase** | Database فقط | مجاني / 25$ | PostgreSQL + Auth |

**التوصية للبداية:**
- Frontend: **Vercel** (مجاني)
- Backend: **Railway** (5$/شهر)
- Database: **Supabase** (مجاني حتى 500MB)

---

## 🔧 أوامر مفيدة

```powershell
# تشغيل كل شيء مرة واحدة (من root المشروع)
pnpm install

# Backend
cd artifacts\api-server && pnpm dev:watch

# Frontend (terminal جديد)
cd artifacts\lms-platform && pnpm dev

# توليد migration جديد بعد تعديل الـ schema
cd lib\db && npx drizzle-kit generate

# تطبيق الـ migration
cd lib\db && npx drizzle-kit migrate
```
