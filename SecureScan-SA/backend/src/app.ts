import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { apiRateLimit } from './middleware/rateLimit';
import { sendError } from './utils/errors';

import { authRouter } from './routes/auth';
import { websitesRouter } from './routes/websites';
import { paymentsRouter } from './routes/payments';
import { webhooksRouter } from './routes/webhooks';
import { scansRouter } from './routes/scans';
import { alertsRouter } from './routes/alerts';
import { automationRouter } from './routes/automation';
import { adminRouter } from './routes/admin';

export const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRateLimit);

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'SecureScan SA' }));

app.use('/api/auth', authRouter);
app.use('/api/websites', websitesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/scans', scansRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/automation', automationRouter);
app.use('/api/admin', adminRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendError(res, err);
});

