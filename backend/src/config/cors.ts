type EnvLike = Record<string, string | undefined>;

const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

function parseOriginList(value?: string): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
}

function expandLoopbackOrigins(origins: Array<string | undefined>): string[] {
  const expanded = new Set<string>();
  const loopbackHosts = ['localhost', '127.0.0.1', '[::1]'];

  for (const origin of origins.filter(Boolean) as string[]) {
    const normalizedOrigin = normalizeOrigin(origin);
    expanded.add(normalizedOrigin);

    try {
      const url = new URL(normalizedOrigin);
      if (loopbackHosts.includes(url.hostname)) {
        for (const host of loopbackHosts) {
          const variant = new URL(normalizedOrigin);
          variant.hostname = host;
          expanded.add(variant.origin);
        }
      }
    } catch {
      expanded.add(normalizedOrigin);
    }
  }

  return Array.from(expanded);
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildAllowedOrigins(env: EnvLike = process.env): string[] {
  const configuredOrigins = [
    env.CORS_ORIGIN,
    env.FRONTEND_URL,
    ...parseOriginList(env.CORS_ORIGINS),
  ];

  const defaultOrigins = env.NODE_ENV === 'production' ? [] : LOCAL_DEV_ORIGINS;
  return expandLoopbackOrigins([
    ...defaultOrigins,
    ...configuredOrigins,
  ]);
}

export function resolveRateLimitConfig(env: EnvLike = process.env) {
  return {
    windowMs: positiveInteger(env.RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: positiveInteger(env.RATE_LIMIT_MAX, 100),
    loginMax: positiveInteger(env.LOGIN_RATE_LIMIT_MAX, 50),
    strictLoginMax: positiveInteger(env.STRICT_LOGIN_RATE_LIMIT_MAX, 5),
  };
}
