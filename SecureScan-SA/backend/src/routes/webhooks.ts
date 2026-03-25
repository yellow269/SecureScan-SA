import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError, sendError } from '../utils/errors';
import { verifyPayfastWebhookSignature } from '../services/payfast';
import { z } from 'zod';

export const webhooksRouter = Router();

// PayFast server-to-server webhook (IPN).
webhooksRouter.post('/payfast', async (req, res) => {
  try {
    const body = req.body as Record<string, any>;

    const isValid = verifyPayfastWebhookSignature(body);
    if (!isValid) throw new ApiError(400, 'Invalid PayFast signature');

    // Common PayFast recurring reference keys vary by integration.
    const reference =
      body.billing_reference ??
      body['m_payment_id'] ??
      body['mpf_payment_id'] ??
      body['recurring_payment_id'] ??
      body['m_payment_id'];

    if (!reference) throw new ApiError(400, 'Missing payment reference');

    const statusRaw =
      String(body.payment_status ?? body.recurring_payment_status ?? body.paymentStatus ?? '')
        .toUpperCase()
        .trim() || '';

    const nextStatus =
      statusRaw.includes('COMPLETE') ||
      statusRaw.includes('SUCCESS') ||
      statusRaw.includes('ACTIVE') ||
      statusRaw.includes('PAID')
        ? 'ACTIVE'
        : statusRaw.includes('CANCEL')
          ? 'CANCELLED'
          : 'EXPIRED';

    const subscription = await prisma.subscription.findUnique({
      where: { payfastBillingReference: String(reference) }
    });

    if (!subscription) {
      // Unknown subscription; respond 200 to avoid repeated retries.
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: nextStatus as any,
        currentPeriodEnd: body['subscription_end_date']
          ? new Date(String(body['subscription_end_date']))
          : null
      }
    });

    if (nextStatus !== 'ACTIVE') {
      await prisma.scanSchedule.updateMany({
        where: { userId: subscription.userId, enabled: true },
        data: { enabled: false }
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

