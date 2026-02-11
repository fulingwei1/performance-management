import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').optional(),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  PORT: z.string().regex(/^\d+$/).optional().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  FRONTEND_URL: z.string().url().optional(),
  USE_MEMORY_DB: z.string().optional(),
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
