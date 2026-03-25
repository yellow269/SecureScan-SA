import { Worker } from 'bullmq';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { runLightweightChecks } from './scanner/lightChecks';
import { computeSecurityScore } from './scoring';

type ScanJobData =
  | {
      kind: 'manual';
      scanId: string;
      websiteId: string;
    }
  | {
      kind: 'scheduled';
      scheduleId: string;
      websiteId: string;
      userId: string;
    };

export function startScanWorker() {
  const worker = new Worker<ScanJobData>(
    'scan',
    async job => {
      let scanId: string | null = null;
      let websiteId: string | null = null;
      let userId: string | null = null;
      let domain: string | null = null;
      try {
        if (job.data.kind === 'manual') {
          scanId = job.data.scanId;
          websiteId = job.data.websiteId;

          const scan = await prisma.scan.findUnique({
            where: { id: scanId },
            include: {
              website: { include: { user: true } }
            }
          });
          if (!scan) return;
          if (scan.websiteId !== websiteId) return;

          userId = scan.website.userId;
          domain = scan.website.domain;

          await prisma.scan.update({
            where: { id: scanId },
            data: { status: 'RUNNING', startedAt: new Date(), error: null }
          });
        } else {
          // scheduled tick: create a new scan row per run.
          const schedule = await prisma.scanSchedule.findUnique({
            where: { id: job.data.scheduleId },
            include: { website: true }
          });
          if (!schedule?.enabled) return;
          if (schedule.websiteId !== job.data.websiteId) return;

          const created = await prisma.scan.create({
            data: { websiteId: job.data.websiteId, status: 'QUEUED' }
          });

          scanId = created.id;
          websiteId = job.data.websiteId;
          userId = job.data.userId;
          domain = schedule.website.domain;

          await prisma.scan.update({
            where: { id: scanId },
            data: { status: 'RUNNING', startedAt: new Date(), error: null }
          });
        }

        if (!scanId || !websiteId || !userId || !domain) return;

        const { findings, report } = await runLightweightChecks(domain);
        const { score } = computeSecurityScore(findings.map(f => ({ severity: f.severity })));

        await prisma.scan.update({
          where: { id: scanId },
          data: {
            status: 'COMPLETED',
            score,
            rawReport: report as any,
            completedAt: new Date()
          }
        });

        if (findings.length) {
          await prisma.vulnerability.createMany({
            data: findings.map(f => ({
              scanId,
              issueType: f.issueType,
              severity: f.severity,
              explanation: f.explanation,
              recommendedFix: f.recommendedFix
            }))
          });
        }

        await prisma.website.update({
          where: { id: websiteId },
          data: { lastScannedAt: new Date() }
        });

        // Dashboard alerts for high/critical issues.
        const alerts = findings
          .filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL')
          .map(f => ({
            userId,
            scanId,
            websiteId,
            message: `${f.issueType} (${f.severity})`
          }));

        if (alerts.length) {
          await prisma.scanAlert.createMany({ data: alerts });
        }
      } catch (err: any) {
        if (scanId) {
          await prisma.scan.update({
            where: { id: scanId },
            data: {
              status: 'FAILED',
              error: err?.message ? String(err.message) : 'Scan failed',
              completedAt: new Date()
            }
          });
        }
      }
    },
    {
      connection: { url: env.REDIS_URL }
    }
  );

  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`Scan job failed`, job?.id, err);
  });

  // eslint-disable-next-line no-console
  console.log('Scan worker started. Waiting for jobs...');
}

