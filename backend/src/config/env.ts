import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').optional(),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  PORT: z.string().regex(/^\d+$/).optional().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  FRONTEND_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().url().optional(),
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).optional(),
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).optional(),
  LOGIN_RATE_LIMIT_MAX: z.string().regex(/^\d+$/).optional(),
  STRICT_LOGIN_RATE_LIMIT_MAX: z.string().regex(/^\d+$/).optional(),
  PRODUCTION_MODE: z.string().optional(),
  USE_MEMORY_DB: z.string().optional(),
  // 薪资系统推送集成（可选，仅在调用推送接口时需要）
  SALARY_SYSTEM_BASE_URL: z.string().optional(),
  SALARY_SYSTEM_PUSH_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    const messages = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, val]: [string, any]) => `  ${key}: ${val._errors?.join(', ')}`)
      .join('\n');
    console.error(`❌ Environment validation failed:\n${messages}`);
    process.exit(1);
  }
  return result.data;
}
