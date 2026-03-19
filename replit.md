# Employee HR Management System (نظام إدارة الموظفين)

## Overview

Full-stack Employee HR Management System designed for a Health Engineering Office (القسم الهندسي الصحي). Manages employee records including personal info, professional details, employment history, document uploads, and includes a WhatsApp AI bot integration via n8n. The application has a complete Arabic RTL interface.

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
- `bot_users` — WhatsApp bot users, activation/deactivation codes, `whatsappLid`, `isBotActive`, `lastInteraction`, `autoDeactivationNotified`
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

## WhatsApp Bot System

### Flow:
1. n8n webhook receives WhatsApp message
2. Calls `POST /api/v1/bot/check-auth` with `phoneNumber` (LID or phone) and `activationCode` (message content)
3. Returns `action`: `activated` | `deactivated` | `auto_deactivated` | `message` | `unauthorized`
4. n8n routes to appropriate handler (welcome message, goodbye, timeout, or AI agent)

### Session management:
- Sessions identified by WhatsApp LID (stored in `whatsappLid` field)
- Auto-deactivate after 5 min inactivity (`AUTO_TIMEOUT_MS = 5 * 60 * 1000`)
- Background cron job every 60s deactivates timed-out sessions

### Session Hijacking Protection (added March 2026):
- If a `@lid` format request tries to activate using an employee's code BUT that employee already has a different LID registered → **rejected with `unauthorized`**
- Prevents one person from stealing another's active bot session
- Admin can reset LID via `PATCH /api/bot-users/:id` with `{ resetLid: true }`

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
- `GET /api/v1/files/:path` — Serve employee files protected by API key

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

### n8n Workflow URLs (production):
- Update workflow JSON domain after each deployment
- Current machine API key: stored in `api_keys` table, `key_type = 'machine'`, description `n8n`

### User isolation:
- Each user gets independent conversation memory via `sessionKey = phone`
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
