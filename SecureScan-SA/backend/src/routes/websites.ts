import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { normalizeDomain } from '../utils/validation';
import { requireAuth } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';
import { ApiError, sendError } from '../utils/errors';
import { enqueueScanJob } from '../queues/scanQueue';

export const websitesRouter = Router();

websitesRouter.use(requireAuth);

websitesRouter.post('/', apiRateLimit, async (req, res) => {
  try {
    const Body = z.object({ domain: z.string().min(3) });
    const authUser = (req as any).authUser as { userId: string };
    const { domain } = Body.parse(req.body);

    const normalized = normalizeDomain(domain);
    const website = await prisma.website.create({
      data: {
        userId: authUser.userId,
        domain: normalized
      }
    });

    res.status(201).json(website);
  } catch (err) {
    // Prisma unique constraint is not defined yet, so return generic message.
    sendError(res, err);
  }
});

websitesRouter.get('/', async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const websites = await prisma.website.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, domain: true, lastScannedAt: true }
    });
    res.json({ websites });
  } catch (err) {
    sendError(res, err);
  }
});

websitesRouter.post('/:websiteId/scan', apiRateLimit, async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const Body = z.object({ scheduleId: z.string().optional() }).optional();
    Body.parse(req.body);

    const { websiteId } = req.params;
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true, userId: true }
    });
    if (!website) throw new ApiError(404, 'Website not found');
    if (website.userId !== authUser.userId) throw new ApiError(403, 'Forbidden');

    const scan = await prisma.scan.create({
      data: { websiteId: website.id, status: 'QUEUED' }
    });

    await enqueueScanJob({ kind: 'manual', scanId: scan.id, websiteId: website.id });

    res.status(202).json({ scanId: scan.id });
  } catch (err) {
    sendError(res, err);
  }
});

