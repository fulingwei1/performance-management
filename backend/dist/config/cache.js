"use strict";
/**
 * Optional in-memory read cache. Enabled via ENABLE_CACHE=true.
 * Use for read-through: get from cache first, then MySQL, then set cache.
 * Invalidate on create/update/delete.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_KEYS = exports.cache = void 0;
const ENABLE_CACHE = process.env.ENABLE_CACHE === 'true';
const store = new Map();
const TTL_MS = parseInt(process.env.CACHE_TTL_MS || '300000', 10); // default 5 min
function isExpired(entry) {
    return Date.now() - entry.at > TTL_MS;
}
exports.cache = {
    isEnabled: () => ENABLE_CACHE,
    get(key) {
        if (!ENABLE_CACHE)
            return undefined;
        const entry = store.get(key);
        if (!entry || isExpired(entry)) {
            if (entry)
                store.delete(key);
            return undefined;
        }
        return entry.value;
    },
    set(key, value) {
        if (!ENABLE_CACHE)
            return;
        store.set(key, { value, at: Date.now() });
    },
    del(key) {
        store.delete(key);
    },
    /** Invalidate all keys starting with prefix (e.g. "employee:", "department:") */
    invalidateByPrefix(prefix) {
        for (const key of store.keys()) {
            if (key.startsWith(prefix))
                store.delete(key);
        }
    },
};
exports.CACHE_KEYS = {
    employee: (id) => `employee:${id}`,
    employeeByName: (name) => `employee:name:${name}`,
};
//# sourceMappingURL=cache.js.map