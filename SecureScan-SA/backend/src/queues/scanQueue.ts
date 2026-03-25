import { Queue } from 'bullmq';
import { env } from '../config/env';

export type ScanJobData =
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

export const scanQueue = new Queue<ScanJobData>('scan', {
  connection: { url: env.REDIS_URL }
});

export async function enqueueScanJob(data: ScanJobData) {
  // Keep job id stable-ish to avoid duplicates.
  await scanQueue.add('baseline', data, { removeOnComplete: true, removeOnFail: 200 });
}

export async function enqueueRepeatScanJob(options: {
  scheduleJobId: string;
  websiteId: string;
  userId: string;
  cron: string;
}) {
  // Repeat jobs call the worker periodically; the worker will create a new scan row per tick.
  await scanQueue.add(
    'baseline',
    {
      kind: 'scheduled',
      scheduleId: options.scheduleJobId,
      websiteId: options.websiteId,
      userId: options.userId
    },
    {
      jobId: options.scheduleJobId,
      repeat: { pattern: options.cron },
      removeOnComplete: true,
      removeOnFail: 200
    }
  );
}

