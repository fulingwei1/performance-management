import { Pool } from 'pg';
import dotenv from 'dotenv';
import { memoryDB, initMemoryDB } from './memory-db';

dotenv.config();

// Only use in-memory store when explicitly set
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';

let pool: Pool | null = null;

if (!USE_MEMORY_DB) {
  // Check for DATABASE_URL (Standard Postgres/Supabase)
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Required for Supabase connection pooling
    });
  } else {
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
      pool = new Pool(dbConfig);
    }
  }
}

export const testConnection = async (): Promise<boolean> => {
  if (USE_MEMORY_DB) {
    console.log('✅ 使用内存数据库（仅测试/演示）');
    initMemoryDB();
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
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
};

// Helper to convert MySQL ? placeholders to Postgres $n
const convertSql = (sql: string): string => {
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

export const query = async (sql: string, params?: any[]): Promise<any[]> => {
  if (USE_MEMORY_DB || !pool) {
    return [];
  }
  
  const convertedSql = convertSql(sql);
  
  try {
    const { rows, rowCount } = await pool.query(convertedSql, params);
    // Attach affectedRows to the result array to support MySQL-style checks in models
    const result = rows;
    (result as any).affectedRows = rowCount;
    return result;
  } catch (error) {
    console.error('SQL Error:', error);
    console.error('Original SQL:', sql);
    console.error('Converted SQL:', convertedSql);
    throw error;
  }
};

export const transaction = async <T>(callback: (connection: any) => Promise<T>): Promise<T> => {
  if (USE_MEMORY_DB || !pool) {
    throw new Error('事务仅支持数据库模式');
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
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export { memoryDB, USE_MEMORY_DB };
export { memoryStore } from './memory-db';
