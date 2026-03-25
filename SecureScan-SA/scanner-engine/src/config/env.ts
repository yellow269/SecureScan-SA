import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  REDIS_URL: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  ZAP_URL: z.string().optional(),
  ZAP_API_KEY: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;
export const env = EnvSchema.parse(process.env);

