import { Pool } from 'pg';
import { memoryDB } from './memory-db';
declare const USE_MEMORY_DB: boolean;
export declare const pool: Pool | null;
export declare const testConnection: () => Promise<boolean>;
export declare const query: (sql: string, params?: any[]) => Promise<any[]>;
export declare const transaction: <T>(callback: (connection: any) => Promise<T>) => Promise<T>;
export { memoryDB, USE_MEMORY_DB };
export { memoryStore } from './memory-db';
//# sourceMappingURL=database.d.ts.map