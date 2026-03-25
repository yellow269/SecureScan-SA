# SecureScan SA
Website Security Scanner SaaS for small businesses in South Africa.

## Tech Stack
- Frontend: Next.js + Tailwind (dark dashboard UI)
- Backend: Node.js + Express (REST API)
- Database: PostgreSQL
- Scanner Engine: OWASP ZAP integration (plus lightweight checks)
- Background jobs: BullMQ + Redis
- Payments: PayFast subscription billing for South African customers

## Repo Layout
- `frontend/` Next.js app (Vercel)
- `backend/` Express API + Postgres + Redis + PayFast webhook handling (Railway)
- `scanner-engine/` Worker that runs scans and stores results (Railway or separate worker)

## Local Development (recommended)
1. Install Docker (for OWASP ZAP + local infra).
2. Create `.env` at repo root (see `.env.example`).
3. Start dependencies:
   - `docker-compose up -d`
4. Backend:
   - `cd backend`
   - `npm i`
   - `npm run prisma:migrate`
   - `npm run dev`
5. Scanner worker:
   - `cd scanner-engine`
   - `npm i`
   - `npm run dev`
6. Frontend:
   - `cd frontend`
   - `npm i`
   - `npm run dev`

## PayFast (high-level)
- Users choose a plan in the UI.
- Backend creates a PayFast recurring payment session (redirect URL).
- PayFast sends a server-to-server webhook (`/api/webhooks/payfast`) to confirm subscription state.
- Backend updates the user’s subscription record and enables scheduled scans only for paid users.

## Security Notes
- Input validation and rate limiting are included in the backend.
- Secrets must be stored in environment variables (never hardcode in code, and never commit real `.env` files).

