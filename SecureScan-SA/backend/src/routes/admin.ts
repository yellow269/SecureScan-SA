import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendError } from '../utils/errors';
import { apiRateLimit } from '../middleware/rateLimit';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get('/users', apiRateLimit, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, email: true, role: true, createdAt: true }
    });
    res.json({ users });
  } catch (err) {
    sendError(res, err);
  }
});

adminRouter.get('/subscriptions', apiRateLimit, async (_req, res) => {
  try {
    const subs = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { plan: true, user: { select: { email: true } } }
    });
    res.json({ subscriptions: subs });
  } catch (err) {
    sendError(res, err);
  }
});

adminRouter.get('/stats', apiRateLimit, async (_req, res) => {
  try {
    const totalScans = await prisma.scan.count();
    const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const scans30d = await prisma.scan.findMany({
      where: { createdAt: { gte: last30 } },
      select: { score: true }
    });
    const avgScore =
      scans30d.length === 0 ? null : Math.round(scans30d.reduce((s, x) => s + (x.score ?? 0), 0) / scans30d.length);

    res.json({ totalScans, avgScore, scans30dCount: scans30d.length });
  } catch (err) {
    sendError(res, err);
  }
});

