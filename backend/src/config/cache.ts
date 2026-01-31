/**
 * Optional in-memory read cache. Enabled via ENABLE_CACHE=true.
 * Use for read-through: get from cache first, then MySQL, then set cache.
 * Invalidate on create/update/delete.
 */

const ENABLE_CACHE = process.env.ENABLE_CACHE === 'true';

const store = new Map<string, { value: unknown; at: number }>();
const TTL_MS = parseInt(process.env.CACHE_TTL_MS || '300000', 10); // default 5 min

function isExpired(entry: { value: unknown; at: number }): boolean {
  return Date.now() - entry.at > TTL_MS;
}

export const cache = {
  isEnabled: (): boolean => ENABLE_CACHE,

  get<T>(key: string): T | undefined {
    if (!ENABLE_CACHE) return undefined;
    const entry = store.get(key);
    if (!entry || isExpired(entry)) {
      if (entry) store.delete(key);
      return undefined;
    }
    return entry.value as T;
  },

  set(key: string, value: unknown): void {
    if (!ENABLE_CACHE) return;
    store.set(key, { value, at: Date.now() });
  },

  del(key: string): void {
    store.delete(key);
  },

  /** Invalidate all keys starting with prefix (e.g. "employee:", "department:") */
  invalidateByPrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};

export const CACHE_KEYS = {
  employee: (id: string) => `employee:${id}`,
  employeeByName: (name: string) => `employee:name:${name}`,
};
