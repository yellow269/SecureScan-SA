import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { apiRateLimit } from '../middleware/rateLimit';
import { sendError, ApiError } from '../utils/errors';
import { enqueueRepeatScanJob } from '../queues/scanQueue';

export const automationRouter = Router();

function cadenceToCron(cadence: 'daily' | 'weekly' | 'monthly') {
  // Basic default schedule at 02:00 server time.
  if (cadence === 'daily') return '0 2 * * *';
  if (cadence === 'weekly') return '0 2 * * 1';
  return '0 2 1 * *'; // monthly on 1st
}

automationRouter.use(requireAuth);

automationRouter.post('/schedules', apiRateLimit, async (req, res) => {
  try {
    const Body = z.object({
      websiteId: z.string().min(1),
      cadence: z.enum(['daily', 'weekly', 'monthly'])
    });
    const authUser = (req as any).authUser as { userId: string; role: string };
    const { websiteId, cadence } = Body.parse(req.body);

    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website) throw new ApiError(404, 'Website not found');
    if (website.userId !== authUser.userId) throw new ApiError(403, 'Forbidden');

    // Paid users only.
    const subscription = await prisma.subscription.findFirst({
      where: { userId: authUser.userId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });
    if (!subscription) throw new ApiError(403, 'Activate a subscription to use automated scans');

    const websitesCount = await prisma.website.count({ where: { userId: authUser.userId } });
    if (websitesCount > subscription.plan.websitesLimit) {
      throw new ApiError(
        403,
        `Plan limit exceeded (${subscription.plan.websitesLimit} websites). Upgrade your plan.`
      );
    }

    // Upsert schedule
    const schedule = await prisma.scanSchedule.upsert({
      where: {
        userId_websiteId_cadence: {
          userId: authUser.userId,
          websiteId,
          cadence
        }
      },
      update: { enabled: true },
      create: {
        userId: authUser.userId,
        websiteId,
        cadence,
        enabled: true
      }
    });

    await enqueueRepeatScanJob({
      scheduleJobId: schedule.id,
      websiteId,
      userId: authUser.userId,
      cron: cadenceToCron(cadence)
    });

    res.status(201).json({ schedule });
  } catch (err) {
    sendError(res, err);
  }
});

automationRouter.delete('/schedules/:scheduleId', apiRateLimit, async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const { scheduleId } = req.params;
    const schedule = await prisma.scanSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) return res.status(404).json({ error: 'Not found' });
    if (schedule.userId !== authUser.userId) throw new ApiError(403, 'Forbidden');
    await prisma.scanSchedule.update({ where: { id: scheduleId }, data: { enabled: false } });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
});

automationRouter.get('/schedules', async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const schedules = await prisma.scanSchedule.findMany({
      where: { userId: authUser.userId },
      include: { website: { select: { domain: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ schedules });
  } catch (err) {
    sendError(res, err);
  }
});

