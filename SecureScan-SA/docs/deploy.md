# Deploy SecureScan SA

## Overview
- Frontend (`frontend/`) deploy to **Vercel**
- Backend (`backend/`) deploy to **Railway**
- Scanner worker (`scanner-engine/`) deploy to **Railway** as a separate process (recommended)

## 1. Local development (sanity check)
1. Install Docker.
2. Copy `SecureScan-SA/.env.example` to `SecureScan-SA/.env` and fill required values.
3. Run:
   - `docker-compose up -d` (Postgres + Redis + ZAP)
4. Backend:
   - `cd backend`
   - `npm i`
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
   - `npm run prisma:seed` (creates Starter/Business/Agency plans)
   - `npm run dev`
5. Scanner worker:
   - `cd scanner-engine`
   - `npm i`
   - `npm run dev`
6. Frontend:
   - `cd frontend`
   - `npm i`
   - `npm run dev`

## 2. Deploy backend to Railway
Create a Railway project and add an environment per service:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `FRONTEND_URL` (your Vercel URL)
- `BACKEND_URL` (your Railway URL, must be HTTPS for PayFast)
- `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_BASE_URL`
- `ZAP_URL` (optional; if you run ZAP separately or via docker)

Then deploy the backend service:
- Build command: `npm install && npm run build`
- Start command: `npm run start`

Run migrations:
- Prefer a one-time command in Railway:
  - `npm run prisma:migrate:deploy`
- Ensure `prisma:generate` runs during build.

Seed plans (one-time):
- Run `npm run prisma:seed` after migrations.

## 3. Deploy scanner-engine to Railway
Create a second Railway service from `scanner-engine/`:
- Build command: `npm install && npm run build`
- Start command: `npm run start`

Use the same environment variables as backend for:
- `DATABASE_URL`
- `REDIS_URL`
- `ZAP_URL` (optional)

This process consumes BullMQ jobs and writes scan results + alerts to Postgres.

## 4. Deploy frontend to Vercel
1. Import/push your repo to GitHub and connect to Vercel.
2. Set Vercel environment variable:
   - `NEXT_PUBLIC_BACKEND_URL` = your Railway backend URL
3. Build command: `npm run build`
4. Output: Next.js default.

## 5. PayFast subscription wiring (production)
After deploying and setting env vars:
- Ensure PayFast webhook can reach:
  - `https://YOUR_RAILWAY_BACKEND/api/webhooks/payfast`
- Start with sandbox mode:
  - set `PAYFAST_BASE_URL=https://sandbox.payfast.co.za`
- Confirm webhook events update `subscriptions` and enable automated schedules.

## 6. Scaling notes (thousands of websites)
- BullMQ + separate worker scales horizontally (increase worker replicas)
- ZAP can be run as a dedicated service/container for consistent scanning
- Add caching/limits for outgoing scan requests per tenant

