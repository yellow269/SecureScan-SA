import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';
import { ApiError, sendError } from '../utils/errors';

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);

// For MVP: return available plan tiers (safe to call without auth in real world; we keep auth for now).
paymentsRouter.get('/plans', async (_req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceZar: 'asc' },
      select: { id: true, name: true, priceZar: true, websitesLimit: true, interval: true }
    });
    res.json({ plans });
  } catch (err) {
    sendError(res, err);
  }
});

paymentsRouter.post('/payfast/recurring', apiRateLimit, async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const Body = z.object({
      planId: z.string().min(1)
    });
    const { planId } = Body.parse(req.body);

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new ApiError(404, 'Plan not found');

    // We create our row first, then redirect user to PayFast.
    const subscription = await prisma.subscription.create({
      data: {
        userId: authUser.userId,
        planId: plan.id,
        status: 'PENDING',
        payfastBillingReference: `securescan_sa_${authUser.userId}_${Date.now()}`
      }
    });

    // Store price in cents in DB (e.g. 9900 => R99.00).
    const recurringAmountStr = (plan.priceZar / 100).toFixed(2);

    const returnUrl = `${env.FRONTEND_URL}/payment/success?sub=${encodeURIComponent(
      subscription.id
    )}`;
    const cancelUrl = `${env.FRONTEND_URL}/payment/cancel?sub=${encodeURIComponent(
      subscription.id
    )}`;

    // PayFast requires an MD5 signature for subscription creation.
    // NOTE: PayFast parameter requirements differ between integrations; verify against
    // PayFast subscription docs for your account.
    const fields: Record<string, any> = {
      merchant_id: env.PAYFAST_MERCHANT_ID,
      merchant_key: env.PAYFAST_MERCHANT_KEY, // PayFast still expects it for convenience.
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: `${env.BACKEND_URL}/api/webhooks/payfast`,

      // Recurring parameters (common names; confirm in PayFast docs)
      m_payment_id: subscription.payfastBillingReference,
      item_name: plan.name,
      amount: recurringAmountStr,

      recurring_amount: recurringAmountStr,
      subscription_type: '1',
      // Best effort defaults; adjust per your PayFast config.
      billing_date: new Date().toISOString().slice(0, 10)
    };

    // Build a signature string that PayFast expects.
    // We generate signature on the backend, but return only fields for a form redirect.
    const { generatePayfastSignature } = await import('../services/payfast');
    const signature = generatePayfastSignature(fields);

    const payfastUrl = `${env.PAYFAST_BASE_URL}${env.PAYFAST_RECURRING_ENDPOINT}`;

    res.json({
      subscriptionId: subscription.id,
      payfast: {
        url: payfastUrl,
        method: 'POST',
        fields: { ...fields, signature }
      }
    });
  } catch (err) {
    sendError(res, err);
  }
});

