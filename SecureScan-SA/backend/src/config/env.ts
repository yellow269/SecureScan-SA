import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.string().optional().default('3001'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),

  FRONTEND_URL: z.string().min(1),
  BACKEND_URL: z.string().min(1),

  PAYFAST_MERCHANT_ID: z.string().min(1),
  PAYFAST_MERCHANT_KEY: z.string().min(1),
  PAYFAST_PASSPHRASE: z.string().min(1),
  PAYFAST_BASE_URL: z.string().url(),
  PAYFAST_RECURRING_ENDPOINT: z.string().optional().default('/eng/processRecurringPayment'),

  ZAP_URL: z.string().optional(),
  ZAP_API_KEY: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);

