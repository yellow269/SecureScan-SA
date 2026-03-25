import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendError } from '../utils/errors';

export const alertsRouter = Router();

alertsRouter.use(requireAuth);

alertsRouter.get('/', async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const alerts = await prisma.scanAlert.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        message: true,
        createdAt: true,
        readAt: true,
        scanId: true,
        websiteId: true
      }
    });
    res.json({ alerts });
  } catch (err) {
    sendError(res, err);
  }
});

alertsRouter.patch('/:alertId/read', async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const { alertId } = req.params;

    await prisma.scanAlert.updateMany({
      where: { id: alertId, userId: authUser.userId },
      data: { readAt: new Date() }
    });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
});

