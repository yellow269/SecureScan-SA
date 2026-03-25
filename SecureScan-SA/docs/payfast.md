# PayFast Subscription Integration (SecureScan SA)

This doc explains how SecureScan SA wires PayFast recurring subscriptions into the backend.

## 1. Required PayFast values
From your PayFast merchant account, get:
- `merchant_id`
- `merchant_key`
- `passphrase`

## 2. Set environment variables
Create/update `SecureScan-SA/.env` (copy from `.env.example`) with:
- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE`
- `PAYFAST_BASE_URL`
  - Sandbox: `https://sandbox.payfast.co.za`
  - Live: `https://www.payfast.co.za`
- `BACKEND_URL`
  - Used to build the webhook URL: `BACKEND_URL/api/webhooks/payfast`
- `FRONTEND_URL`
  - Used for PayFast return/cancel URLs

## 3. Subscription creation flow (what happens)
1. User selects a plan on the frontend.
2. Frontend calls `POST /api/payments/payfast/recurring` on the backend with `planId`.
3. Backend creates a `Subscription` row in PostgreSQL with status `PENDING`.
4. Backend returns a PayFast redirect payload (URL + hidden POST fields).
5. Frontend auto-submits an HTML `<form>` to PayFast.
6. PayFast calls your webhook: `POST {BACKEND_URL}/api/webhooks/payfast`.
7. Backend verifies the webhook signature and marks the subscription `ACTIVE` (or `CANCELLED/EXPIRED`).
8. When subscriptions are not ACTIVE, the backend disables automated scan schedules.

## 4. Webhook signature verification
SecureScan SA verifies PayFast webhook requests using an MD5 signature:
- Uses your `PAYFAST_PASSPHRASE`
- Sorts parameters by key
- URL-encodes values
- Excludes empty/null/undefined fields

If your PayFast webhook integration uses a different signature field name/parameter set, update `backend/src/services/payfast.ts` and/or `backend/src/routes/webhooks.ts`.

## 5. Important note about PayFast field names
PayFast subscription integrations can vary by account configuration. This scaffold uses common fields:
- `merchant_id`, `merchant_key`
- `return_url`, `cancel_url`, `notify_url`
- `m_payment_id` (we generate a reference tied to your user)
- `item_name`, `amount`, `recurring_amount`
- `subscription_type = 1`

If PayFast rejects the request, compare the request fields with the PayFast docs for your recurring payment integration type and adjust:
- `backend/src/routes/payments.ts`
- `backend/src/services/payfast.ts`

## 6. Testing checklist (Sandbox)
- Use `PAYFAST_BASE_URL=https://sandbox.payfast.co.za`
- Ensure `BACKEND_URL` is publicly reachable by PayFast webhook callbacks (Railway domain or ngrok)
- Confirm webhook requests reach `/api/webhooks/payfast` (check backend logs)
- Confirm subscriptions become `ACTIVE` in the database and automated scans start running

