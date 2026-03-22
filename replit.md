# Employee HR Management System (نظام إدارة الموظفين)

## Overview

Full-stack Employee HR Management System designed for a Health Engineering Office (القسم الهندسي الصحي). Manages employee records including personal info, professional details, employment history, document uploads, and includes a multi-channel AI bot (WhatsApp + Telegram) integration via n8n. The application has a complete Arabic RTL interface.

The app runs on port 5000. Default admin credentials: `admin` / `123456`.

## User Preferences

Preferred communication style: Simple, everyday language (Arabic).

## System Architecture

### Overall Structure
Monorepo pattern with three main directories:
- **`client/`** — React 18 frontend (SPA)
- **`server/`** — Express.js v5 backend API
- **`shared/`** — Shared types, schemas, and route definitions

### Frontend (`client/src/`)
- **Framework:** React 18 with TypeScript, built with Vite
- **Routing:** Wouter
- **State/Data Fetching:** TanStack React Query v5
- **UI Components:** shadcn/ui (New York style) on Radix UI primitives
- **Styling:** Tailwind CSS with CSS variables, dark mode via `next-themes`
- **Forms:** React Hook Form + Zod via `@hookform/resolvers`
- **Charts:** Recharts for dashboard visualizations
- **Exports:** `xlsx` (Excel), `docx` + `file-saver` (Word)
- **Language/Direction:** Arabic (RTL), Tajawal font
- **Path aliases:** `@/` → `client/src/`, `@shared/` → `shared/`

### Backend (`server/`)
- **Framework:** Express.js v5 with TypeScript, run via `tsx`
- **Authentication:** Passport.js local strategy, passwords hashed with scrypt, sessions in PostgreSQL via `connect-pg-simple`
- **Authorization:** Role-based (`admin` / `employee`). Admin-only routes for user management, audit logs
- **File Uploads:** Multer, disk storage in `storage/uploads/`. Allowed: PDF, JPEG, PNG, DOCX, XLSX. Max 10MB
- **Rate Limiting:** `express-rate-limit` on login (5 attempts / 15 min)
- **API Pattern:** REST under `/api/` prefix. Bot API under `/api/v1/bot/` (machine API key required)
- **Build:** esbuild → `dist/index.cjs` (server), Vite → `dist/public/` (client)

### Database
- **PostgreSQL** via `DATABASE_URL` environment variable
- **ORM:** Drizzle ORM with `drizzle-zod`
- **Schema:** `shared/schema.ts`
- **Migrations:** `drizzle-kit push` (no migration files approach)

### Tables
- `users` — System users (UUID PKs), username/password, role, online status
- `employees` — Employee records with all fields, `documentPaths` (JSONB), soft-delete (`isDeleted`)
- `auditLogs` — All system operations, cascade delete on user delete
- `settings` — Key-value system settings
- `api_keys` — API keys (human/machine types), with expiry and active flag
- `bot_users` — Multi-channel bot users (WA + TG), activation/deactivation codes, `whatsappLid`, `telegramChatId`, `isBotActive`, `lastInteraction`, `autoDeactivationNotified`
- `sessions` — Express sessions stored by `connect-pg-simple`

## API Key System

### Two types:
- **`human`** — Browser login allowed + API header access
- **`machine`** — API header only, blocked from browser login (403). Used by n8n bot.

### Bootstrap mode:
When `api_keys` table is empty, login allowed without key. `GET /api/auth/setup-status` returns `{ apiKeyRequired: boolean }`.

### Security:
- Full key shown once at creation, masked in all list views
- Keys stored as plain hex in `key_value` (64 chars via `crypto.randomBytes(32)`)

## Multi-Channel Bot System (WhatsApp + Telegram)

### Flow:
1. n8n webhook/trigger receives message from WhatsApp or Telegram
2. Normalizes data into unified format: `{ from, content, source }` where `source = "whatsapp" | "telegram"`
3. Calls `POST /api/v1/bot/check-auth` with `{ phoneNumber, activationCode, source }` — **source field is critical for Telegram**
4. Server uses `source` to choose correct lookup: WA uses LID/phone match; Telegram uses `telegramChatId` match
5. Returns `action`: `activated` | `deactivated` | `auto_deactivated` | `message` | `unauthorized`
6. n8n routes to appropriate handler, sends response back via same channel

### Session management:
- WhatsApp sessions identified by LID (stored in `whatsappLid` field)
- Telegram sessions identified by `chat.id` (stored in `telegramChatId` field)
- Auto-deactivate after 5 min inactivity (`AUTO_TIMEOUT_MS = 5 * 60 * 1000`)
- Background cron job every 60s deactivates timed-out sessions
- n8n Memory key: `{from}_{source}` — keeps WA and TG conversations separate per user

### Session Hijacking Protection:
- WhatsApp: If request has different LID than stored `whatsappLid` → `unauthorized`
- Telegram: If request has different `chat.id` than stored `telegramChatId` → `unauthorized`
- Admin can reset each channel independently:
  - `PATCH /api/bot-users/:id` with `{ resetWhatsappLid: true }` — resets WA device
  - `PATCH /api/bot-users/:id` with `{ resetTelegramId: true }` — resets TG account
- UI: Users page shows WA badge 🟣 and TG badge 🔵 separately, each with its own reset button

### Bot API endpoints (all require `x-api-key` machine key):
- `POST /api/v1/bot/check-auth` — Auth + session management
- `POST /api/v1/bot/get-all-data` — Full employee data by phone
- `GET /api/v1/bot/master-query` — Full DB snapshot for AI (employees + docs)
- `GET /api/v1/bot/stats` — Quick statistics (totals, by status/category/gender)
- `GET /api/v1/bot/generate-word-link` — Generate Word card + download URL
- `GET /api/v1/bot/generate-excel-link` — Export all employees Excel + download URL (legacy)
- `GET /api/v1/bot/generate-custom-excel` — Export filtered/custom-column Excel + download URL
- `POST /api/v1/bot/log-conversation` — Log bot conversation to audit log
- `POST /api/v1/bot/cleanup-sessions` — Manually clean up timed-out bot sessions
- `POST /api/v1/bot/admin-notify` — **Send admin notification** (used by V23 workflow for alerts/reports). Reads `admin_notification_phone`, `whatsapp_gateway_url/token`, `telegram_bot_token`, `telegram_notification_chat_id` from settings. Body: `{ eventType, message }`. Sends to both WA+TG if configured.
- `GET /api/v1/files/:path` — Serve employee files protected by API key
- `GET /api/v1/bot/workflow-v22` — Download updated V22 workflow JSON (admin session required)
- `GET /api/v1/bot/workflow-v23` — Download updated V23 workflow JSON (admin session required)

## n8n Workflow

### Files:
- `docs/workflows/Sidawi_AI_Health_V22.json` — WhatsApp bot (3 AI tools)
- `docs/workflows/Sidawi_AI_Health_V23.json` — WhatsApp bot + Telegram (4 AI tools, dedicated stats tool)

### V22 AI tools: fetch_employee_database, generate_word_link, export_excel_tool
### V23 AI tools: fetch_employee_database, get_employee_stats, generate_word_link, export_excel_tool

### AI Agent strict rules (system prompt - both V22 & V23):
1. MUST call the appropriate tool before ANY response — no training-data fallback
2. Statistics: use `get_employee_stats` (V23) or `fetch_employee_database` (V22)
3. If employee not found: respond ONLY with: "لا يوجد موظف بهذا الاسم أو الرقم في قاعدة بيانات المديرية."
4. Documents only from `direct_url` field — never fabricate links
5. Word file: get `nationalId` from DB tool first, then call `generate_word_link`
6. Custom Excel: call `export_excel_tool` with optional filters (status, category, gender, employmentStatus, assignedWork, search) and optional columns param
7. Out of scope: "أنا متخصص في بيانات موظفي المديرية فقط."

### Admin Notifications — all cases:

**V22 (direct WA message from n8n → gateway):**
- `WA_Admin_Activation` — sends direct WhatsApp to admin phone (hardcoded in workflow node) on new activation. Must edit `number` field in the node to set admin's real phone number.

**V23 (via `/api/v1/bot/admin-notify` API):**
- `Admin_Error_Alert` — when the verification service fails (eventType: `error`)
- `Admin_Unauthorized_Alert` — when unauthorized access attempt (eventType: `unauthorized`)
- `Admin_Activation_Alert` — when new bot activation (eventType: `activation`)
- `Admin_Cleanup_Report` — hourly session cleanup report (eventType: `cleanup`)

**From app UI (admin manual action):**
- `send-notification` endpoint — admin sends custom message to specific bot user from Users page

Settings keys controlling notification delivery:
- `admin_notification_phone` — Admin's WhatsApp phone number (digits only, e.g. `9671XXXXXXXXX`)
- `whatsapp_gateway_url` — WA gateway base URL
- `whatsapp_gateway_token` — WA gateway Bearer token
- `telegram_bot_token` — Telegram bot token
- `telegram_notification_chat_id` — Telegram chat ID to receive alerts

### n8n Workflow URLs (production):
- Update workflow JSON domain after each deployment
- Current machine API key: stored in `api_keys` table, `key_type = 'machine'`, description `n8n`
- Download updated V23 workflow from Settings → Notification tab → "ورك فلو n8n المُحدَّث (V23)"

### User isolation:
- Each user gets independent conversation memory via `sessionKey = {from}_{source}` (e.g. `966501234567_whatsapp`, `123456789_telegram`)
- Separate memory even if same person uses both WA and TG
- n8n executes each webhook as a completely independent execution
- Backend is async — handles concurrent users with no interference

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `SESSION_SECRET` — Session encryption secret (auto-generated if missing)
- `NODE_ENV` — `development` or `production`
- `PORT` — Server port (default: 5000, set by .replit)
- `COOKIE_SECURE` — `true` in production, `false` locally

## Scripts
- `npm run dev` — Development server (tsx + Vite HMR)
- `npm run build` — Production build (esbuild + Vite)
- `npm start` — Run production build
- `npm run db:push` — Push schema to database
- `npm run check` — TypeScript type check

## Deployment
- Target: Replit Autoscale
- Build: `npm run build`
- Run: `node ./dist/index.cjs`
- Public dir: `dist/public`
- Port: 5000 (mapped to external port 80)
