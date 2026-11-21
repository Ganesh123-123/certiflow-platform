import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
  CERTIFICATE_BASE_URL: z.string().default('http://localhost:3001'),
  PUBLIC_VERIFY_URL: z.string().default('http://localhost:5173/verify'),
  MAX_FILE_SIZE: z.string().default('10485760').transform(Number),
  BCRYPT_ROUNDS: z.string().default('10').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  OVERDUE_THRESHOLD_HOURS: z.string().default('24').transform(Number),
  QUALITY_REVIEW_THRESHOLD: z.string().default('50').transform(Number),
  WHATSAPP_SUCCESS_RATE: z.string().default('0.7').transform(Number),
  WHATSAPP_MAX_RETRIES: z.string().default('5').transform(Number),
});

// Load .env file in non-test environments
if (process.env.NODE_ENV !== 'test') {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv optional
  }
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
