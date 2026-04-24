import { Pool } from 'pg';
import dotenv from 'dotenv';
import { memoryDB, initMemoryDB } from './memory-db';
import logger from './logger';

dotenv.config();

// Only use in-memory store when explicitly set
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';

const isVercel = process.env.VERCEL === '1';

// 创建连接池
const createPool = () => {
  if (USE_MEMORY_DB) {
    logger.info('📦 Using In-Memory Database');
    return null;
  }

  // PostgreSQL 配置（本地开发默认使用 docker-compose 里的 PostgreSQL；也兼容云端 PostgreSQL）
  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL is missing!');
    // 即使缺少配置，也不要直接抛错导致 crash，而是让 testConnection 返回 false
    return null;
  }

  logger.info('🔌 Configuring PostgreSQL Pool...');
  
  // 检测是否为本地连接（localhost, 127.0.0.1, postgres等本地主机名）
  const isLocal = /localhost|127\.0\.0\.1|postgres|mysql/.test(process.env.DATABASE_URL);
  
  // 配置SSL：本地环境不需要，生产环境（Supabase等）需要
  const config: any = {
    connectionString: process.env.DATABASE_URL,
    // Vercel Serverless 优化配置
    max: 1, // 限制连接数
    idleTimeoutMillis: 3000,
    connectionTimeoutMillis: 10000, // 增加超时到10s
    keepAlive: true, // 开启 TCP KeepAlive
  };
  
  // 只有非本地连接才添加SSL配置
  if (!isLocal) {
    config.ssl = {
      rejectUnauthorized: false // 允许自签名证书
    };
  }

  return new Pool(config);
};

export const pool = createPool();

export const testConnection = async (): Promise<boolean> => {
  if (USE_MEMORY_DB) {
    logger.info('✅ 使用内存数据库（仅测试/演示）');
    initMemoryDB();
    return true;
  }

  if (!pool) {
    logger.error('❌ 未配置数据库连接池 (请设置 DATABASE_URL)');
    return false;
  }

  // 增加重试机制
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      logger.info('✅ PostgreSQL 数据库连接成功');
      client.release();
      return true;
    } catch (error: any) {
      logger.error(`❌ 数据库连接失败 (剩余重试: ${retries - 1}):`, error.message);
      retries--;
      if (retries === 0) return false;
      // 等待 1 秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
};

// Helper to convert MySQL ? placeholders to Postgres $n
const convertSql = (sql: string): string => {
  let i = 1;
  
  // Replace ? with $1, $2, etc. (skip ?'s inside string literals)
  let converted = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let j = 0; j < sql.length; j++) {
    const ch = sql[j];
    const prev = j > 0 ? sql[j - 1] : '';
    if (ch === "'" && prev !== '\\' && !inDoubleQuote) inSingleQuote = !inSingleQuote;
    if (ch === '"' && prev !== '\\' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
    if (ch === '?' && !inSingleQuote && !inDoubleQuote) {
      converted += `$${i++}`;
    } else {
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

export const query = async (sql: string, params?: any[]): Promise<any[]> => {
  if (USE_MEMORY_DB) {
    logger.info(`📦 Using memory database for query: ${sql}`);
    const { memoryQuery } = require('./memory-db');
    return memoryQuery(sql, params);
  }

  if (!pool) {
    throw new Error('Database connection not configured (missing DATABASE_URL)');
  }
  
  const convertedSql = convertSql(sql);
  
  try {
    const { rows, rowCount } = await pool.query(convertedSql, params);
    // Attach affectedRows to result array to support MySQL-style checks in models
    const result = rows;
    (result as any).affectedRows = rowCount;
    return result;
  } catch (error: any) {
    logger.error(`SQL Error: ${error.message}`);
    // logger.error(`Original SQL: ${sql}`); // Reduce log noise
    // logger.error(`Converted SQL: ${convertedSql}`);
    throw error;
  }
};

export const transaction = async <T>(callback: (connection: any) => Promise<T>): Promise<T> => {
  if (USE_MEMORY_DB) {
    const connectionProxy = {
      execute: async (sql: string, params?: any[]) => query(sql, params)
    };
    return callback(connectionProxy);
  }

  if (!pool) {
    throw new Error('Database connection not configured (missing DATABASE_URL)');
  }
  
  const client = await pool.connect();
  
  // Mocking the connection interface used in models
  const connectionProxy = {
    execute: async (sql: string, params?: any[]) => {
      const convertedSql = convertSql(sql);
      try {
        const { rows, rowCount } = await client.query(convertedSql, params);
        const result = rows;
        (result as any).affectedRows = rowCount;
        return result;
      } catch (err) {
        logger.error(`Transaction Query Error: ${err}`);
        throw err;
      }
    }
  };

  try {
    await client.query('BEGIN');
    const result = await callback(connectionProxy);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export { memoryDB, USE_MEMORY_DB };
export { memoryStore } from './memory-db';
