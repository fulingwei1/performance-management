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
const logger_1 = __importDefault(require("./logger"));
dotenv_1.default.config();
// Only use in-memory store when explicitly set
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';
exports.USE_MEMORY_DB = USE_MEMORY_DB;
const isVercel = process.env.VERCEL === '1';
// 创建连接池
const createPool = () => {
    if (USE_MEMORY_DB) {
        logger_1.default.info('📦 Using In-Memory Database');
        return null;
    }
    // Supabase/PostgreSQL 配置
    if (!process.env.DATABASE_URL) {
        logger_1.default.error('❌ DATABASE_URL is missing!');
        // 即使缺少配置，也不要直接抛错导致 crash，而是让 testConnection 返回 false
        return null;
    }
    logger_1.default.info('🔌 Configuring PostgreSQL Pool...');
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
        logger_1.default.info('✅ 使用内存数据库（仅测试/演示）');
        (0, memory_db_1.initMemoryDB)();
        return true;
    }
    if (!exports.pool) {
        logger_1.default.error('❌ 未配置数据库连接池 (请设置 DATABASE_URL)');
        return false;
    }
    // 增加重试机制
    let retries = 3;
    while (retries > 0) {
        try {
            const client = await exports.pool.connect();
            logger_1.default.info('✅ Supabase Postgres 数据库连接成功');
            client.release();
            return true;
        }
        catch (error) {
            logger_1.default.error(`❌ 数据库连接失败 (剩余重试: ${retries - 1}):`, error.message);
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
    // Replace ? with $1, $2, etc. (skip ?'s inside string literals)
    let converted = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    for (let j = 0; j < sql.length; j++) {
        const ch = sql[j];
        const prev = j > 0 ? sql[j - 1] : '';
        if (ch === "'" && prev !== '\\' && !inDoubleQuote)
            inSingleQuote = !inSingleQuote;
        if (ch === '"' && prev !== '\\' && !inSingleQuote)
            inDoubleQuote = !inDoubleQuote;
        if (ch === '?' && !inSingleQuote && !inDoubleQuote) {
            converted += `$${i++}`;
        }
        else {
            converted += ch;
        }
    }
    // Remove backticks (MySQL identifiers)
    converted = converted.replace(/`/g, '');
    // Replace MySQL date functions with Postgres equivalents
    converted = converted.replace(/YEAR\s*\(([^)]+)\)/gi, 'EXTRACT(YEAR FROM $1)');
    converted = converted.replace(/MONTH\s*\(([^)]+)\)/gi, 'EXTRACT(MONTH FROM $1)');
    converted = converted.replace(/DAY\s*\(([^)]+)\)/gi, 'EXTRACT(DAY FROM $1)');
    // Replace IFNULL -> COALESCE
    converted = converted.replace(/IFNULL\s*\(/gi, 'COALESCE(');
    // Replace LIMIT ?, ? -> LIMIT $n OFFSET $m (already handled by ? replacement)
    return converted;
};
const query = async (sql, params) => {
    if (USE_MEMORY_DB) {
        logger_1.default.info(`📦 Using memory database for query: ${sql}`);
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
        logger_1.default.error(`SQL Error: ${error.message}`);
        // logger.error(`Original SQL: ${sql}`); // Reduce log noise
        // logger.error(`Converted SQL: ${convertedSql}`);
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
                logger_1.default.error(`Transaction Query Error: ${err}`);
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