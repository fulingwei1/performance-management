/**
 * Optional in-memory read cache. Enabled via ENABLE_CACHE=true.
 * Use for read-through: get from cache first, then MySQL, then set cache.
 * Invalidate on create/update/delete.
 */
export declare const cache: {
    isEnabled: () => boolean;
    get<T>(key: string): T | undefined;
    set(key: string, value: unknown): void;
    del(key: string): void;
    /** Invalidate all keys starting with prefix (e.g. "employee:", "department:") */
    invalidateByPrefix(prefix: string): void;
};
export declare const CACHE_KEYS: {
    employee: (id: string) => string;
    employeeByName: (name: string) => string;
};
//# sourceMappingURL=cache.d.ts.map