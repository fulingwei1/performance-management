"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStore = exports.USE_MEMORY_DB = exports.memoryDB = exports.transaction = exports.query = exports.testConnection = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const memory_db_1 = require("./memory-db");
Object.defineProperty(exports, "memoryDB", { enumerable: true, get: function () { return memory_db_1.memoryDB; } });
dotenv_1.default.config();
// Only use in-memory store when explicitly set
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';
exports.USE_MEMORY_DB = USE_MEMORY_DB;
let pool = null;
if (!USE_MEMORY_DB) {
    // Check for DATABASE_URL (Standard Postgres/Supabase)
    if (process.env.DATABASE_URL) {
        pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false } // Required for Supabase connection pooling
        });
    }
    else {
        // Fallback to separate env vars if DATABASE_URL not set (backward compatibility attempt)
        // But mostly we expect DATABASE_URL for Supabase
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'postgres',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
        };
        // Only initialize if host is set (avoid crashing if env missing)
        if (process.env.DB_HOST) {
            pool = new pg_1.Pool(dbConfig);
        }
    }
}
const testConnection = async () => {
    if (USE_MEMORY_DB) {
        console.log('✅ 使用内存数据库（仅测试/演示）');
        (0, memory_db_1.initMemoryDB)();
        return true;
    }
    if (!pool) {
        console.error('❌ 未配置数据库连接池 (请设置 DATABASE_URL)');
        return false;
    }
    try {
        const client = await pool.connect();
        console.log('✅ Supabase Postgres 数据库连接成功');
        client.release();
        return true;
    }
    catch (error) {
        console.error('❌ 数据库连接失败:', error);
        return false;
    }
};
exports.testConnection = testConnection;
// Helper to convert MySQL ? placeholders to Postgres $n
const convertSql = (sql) => {
    let i = 1;
    // Replace ? with $1, $2, etc.
    let converted = sql.replace(/\?/g, () => `$${i++}`);
    // Remove backticks (MySQL identifiers)
    converted = converted.replace(/`/g, '');
    // Replace YEAR(date) -> EXTRACT(YEAR FROM date)
    // Need to handle different spacings
    converted = converted.replace(/YEAR\s*\(([^)]+)\)/gi, 'EXTRACT(YEAR FROM $1)');
    return converted;
};
const query = async (sql, params) => {
    if (USE_MEMORY_DB || !pool) {
        return [];
    }
    const convertedSql = convertSql(sql);
    try {
        const { rows, rowCount } = await pool.query(convertedSql, params);
        // Attach affectedRows to the result array to support MySQL-style checks in models
        const result = rows;
        result.affectedRows = rowCount;
        return result;
    }
    catch (error) {
        console.error('SQL Error:', error);
        console.error('Original SQL:', sql);
        console.error('Converted SQL:', convertedSql);
        throw error;
    }
};
exports.query = query;
const transaction = async (callback) => {
    if (USE_MEMORY_DB || !pool) {
        throw new Error('事务仅支持数据库模式');
    }
    const client = await pool.connect();
    // Mocking the connection interface used in models
    const connectionProxy = {
        execute: async (sql, params) => {
            const convertedSql = convertSql(sql);
            try {
                const { rows, rowCount } = await client.query(convertedSql, params);
                const result = rows;
                result.affectedRows = rowCount;
                return result;
            }
            catch (err) {
                console.error('Transaction Query Error:', err);
                throw err;
            }
        }
    };
    try {
        await client.query('BEGIN');
        const result = await callback(connectionProxy);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.transaction = transaction;
var memory_db_2 = require("./memory-db");
Object.defineProperty(exports, "memoryStore", { enumerable: true, get: function () { return memory_db_2.memoryStore; } });
//# sourceMappingURL=database.js.map