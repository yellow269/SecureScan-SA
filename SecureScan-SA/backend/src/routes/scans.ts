import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendError } from '../utils/errors';

export const scansRouter = Router();

scansRouter.use(requireAuth);

scansRouter.get('/history', async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const scans = await prisma.scan.findMany({
      where: { website: { userId: authUser.userId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        score: true,
        createdAt: true,
        website: { select: { domain: true } }
      }
    });

    res.json({ scans });
  } catch (err) {
    sendError(res, err);
  }
});

scansRouter.get('/:scanId', async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const { scanId } = req.params;

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        website: { select: { domain: true, userId: true } },
        findings: true
      }
    });

    if (!scan) return res.status(404).json({ error: 'Not found' });
    if (scan.website.userId !== authUser.userId) return res.status(403).json({ error: 'Forbidden' });

    res.json({
      scan: {
        id: scan.id,
        status: scan.status,
        score: scan.score,
        createdAt: scan.createdAt,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        domain: scan.website.domain,
        vulnerabilities: scan.findings.map(f => ({
          issueType: f.issueType,
          severity: f.severity,
          explanation: f.explanation,
          recommendedFix: f.recommendedFix
        })),
        rawReport: scan.rawReport
      }
    });
  } catch (err) {
    sendError(res, err);
  }
});

