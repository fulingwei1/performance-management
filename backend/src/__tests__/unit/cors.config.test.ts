import { buildAllowedOrigins, resolveRateLimitConfig } from '../../config/cors';

describe('CORS and rate-limit configuration', () => {
  it('keeps production origins fully environment-driven', () => {
    const origins = buildAllowedOrigins({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://performance.example.com',
      CORS_ORIGINS: 'https://hr.example.com, https://admin.example.com',
    });

    expect(origins).toEqual(expect.arrayContaining([
      'https://performance.example.com',
      'https://hr.example.com',
      'https://admin.example.com',
    ]));
    expect(origins.some((origin) => origin.includes('8.138.230.46'))).toBe(false);
    expect(origins.some((origin) => origin.includes('localhost'))).toBe(false);
  });

  it('expands loopback origins for local development only', () => {
    const origins = buildAllowedOrigins({
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:5173',
    });

    expect(origins).toEqual(expect.arrayContaining([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://[::1]:5173',
    ]));
  });

  it('allows rate limits to be tuned by environment variables', () => {
    expect(resolveRateLimitConfig({
      RATE_LIMIT_WINDOW_MS: '30000',
      RATE_LIMIT_MAX: '60',
      LOGIN_RATE_LIMIT_MAX: '8',
      STRICT_LOGIN_RATE_LIMIT_MAX: '3',
    })).toEqual({
      windowMs: 30000,
      max: 60,
      loginMax: 8,
      strictLoginMax: 3,
    });
  });
});
