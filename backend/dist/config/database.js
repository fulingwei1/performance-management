"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStore = exports.USE_MEMORY_DB = exports.memoryDB = exports.transaction = exports.query = exports.testConnection = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const memory_db_1 = require("./memory-db");
Object.defineProperty(exports, "memoryDB", { enumerable: true, get: function () { return memory_db_1.memoryDB; } });
dotenv_1.default.config();
// Only use in-memory store when explicitly set
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';
exports.USE_MEMORY_DB = USE_MEMORY_DB;
const isVercel = process.env.VERCEL === '1';
// 创建连接池
const createPool = () => {
    if (USE_MEMORY_DB) {
        console.log('📦 Using In-Memory Database');
        return null;
    }
    // Supabase/PostgreSQL 配置
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing!');
        // 即使缺少配置，也不要直接抛错导致 crash，而是让 testConnection 返回 false
        return null;
    }
    console.log('🔌 Configuring PostgreSQL Pool...');
    // 强制添加 SSL 配置，解决 Vercel 连接 Supabase 的常见问题
    // 即使连接串里已经有了，这里显式配置更保险
    const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // 允许自签名证书
        },
        // Vercel Serverless 优化配置
        max: 1, // 限制连接数
        idleTimeoutMillis: 3000,
        connectionTimeoutMillis: 10000, // 增加超时到10s
        keepAlive: true, // 开启 TCP KeepAlive
    };
    return new pg_1.Pool(config);
};
exports.pool = createPool();
const testConnection = async () => {
    if (USE_MEMORY_DB) {
        console.log('✅ 使用内存数据库（仅测试/演示）');
        (0, memory_db_1.initMemoryDB)();
        return true;
    }
    if (!exports.pool) {
        console.error('❌ 未配置数据库连接池 (请设置 DATABASE_URL)');
        return false;
    }
    // 增加重试机制
    let retries = 3;
    while (retries > 0) {
        try {
            const client = await exports.pool.connect();
            console.log('✅ Supabase Postgres 数据库连接成功');
            client.release();
            return true;
        }
        catch (error) {
            console.error(`❌ 数据库连接失败 (剩余重试: ${retries - 1}):`, error.message);
            retries--;
            if (retries === 0)
                return false;
            // 等待 1 秒后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return false;
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
    if (USE_MEMORY_DB) {
        console.log('📦 Using memory database for query:', sql);
        const { memoryQuery } = require('./memory-db');
        return memoryQuery(sql, params);
    }
    if (!exports.pool) {
        throw new Error('Database connection not configured (missing DATABASE_URL)');
    }
    const convertedSql = convertSql(sql);
    try {
        const { rows, rowCount } = await exports.pool.query(convertedSql, params);
        // Attach affectedRows to result array to support MySQL-style checks in models
        const result = rows;
        result.affectedRows = rowCount;
        return result;
    }
    catch (error) {
        console.error('SQL Error:', error.message);
        // console.error('Original SQL:', sql); // Reduce log noise
        // console.error('Converted SQL:', convertedSql);
        throw error;
    }
};
exports.query = query;
const transaction = async (callback) => {
    if (USE_MEMORY_DB) {
        const connectionProxy = {
            execute: async (sql, params) => (0, exports.query)(sql, params)
        };
        return callback(connectionProxy);
    }
    if (!exports.pool) {
        throw new Error('Database connection not configured (missing DATABASE_URL)');
    }
    const client = await exports.pool.connect();
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