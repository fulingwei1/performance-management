import { pool } from '../config/database';
import { memoryStore } from '../config/memory-db';

const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';

// 内存数据库ID计数器
let aiUsageLogIdCounter = 1;

export interface AIUsageLog {
  id: number;
  user_id: number;
  user_name: string;
  feature_type: 'self-summary' | 'next-month-plan' | 'manager-comment' | 'work-arrangement';
  tokens_used: number;
  cost_yuan: number;
  success: boolean;
  error_message?: string;
  created_at: Date;
}

export interface AIUsageStats {
  user_id: number;
  user_name: string;
  total_calls: number;
  successful_calls: number;
  total_tokens: number;
  total_cost: number;
  last_used_at: Date | null;
}

export interface CreateAIUsageLogParams {
  user_id: number;
  user_name: string;
  feature_type: AIUsageLog['feature_type'];
  tokens_used: number;
  cost_yuan: number;
  success: boolean;
  error_message?: string;
}

/**
 * 记录 AI 使用日志
 */
export async function createAIUsageLog(params: CreateAIUsageLogParams): Promise<AIUsageLog> {
  const {
    user_id,
    user_name,
    feature_type,
    tokens_used,
    cost_yuan,
    success,
    error_message
  } = params;

  if (USE_MEMORY_DB) {
    const log: AIUsageLog = {
      id: aiUsageLogIdCounter++,
      user_id,
      user_name,
      feature_type,
      tokens_used,
      cost_yuan,
      success,
      error_message,
      created_at: new Date()
    };
    memoryStore.aiUsageLogs.set(log.id.toString(), log);
    return log;
  }

  const result = await pool!.query(
    `INSERT INTO ai_usage_logs 
     (user_id, user_name, feature_type, tokens_used, cost_yuan, success, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [user_id, user_name, feature_type, tokens_used, cost_yuan, success, error_message]
  );

  return result.rows[0];
}

/**
 * 获取用户的 AI 使用统计
 */
export async function getAIUsageStatsByUser(userId: number): Promise<AIUsageStats | null> {
  if (USE_MEMORY_DB) {
    const logs = Array.from(memoryStore.aiUsageLogs.values()).filter(log => log.user_id === userId);
    
    if (logs.length === 0) {
      return null;
    }

    const totalCalls = logs.length;
    const successfulCalls = logs.filter(log => log.success).length;
    const totalTokens = logs.reduce((sum, log) => sum + log.tokens_used, 0);
    const totalCost = logs.reduce((sum, log) => sum + log.cost_yuan, 0);
    const lastUsedAt = logs.length > 0 ? new Date(Math.max(...logs.map(log => log.created_at.getTime()))) : null;

    return {
      user_id: userId,
      user_name: logs[0].user_name,
      total_calls: totalCalls,
      successful_calls: successfulCalls,
      total_tokens: totalTokens,
      total_cost: totalCost,
      last_used_at: lastUsedAt
    };
  }

  const result = await pool!.query(
    `SELECT * FROM ai_usage_stats WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * 获取所有用户的 AI 使用统计
 */
export async function getAllAIUsageStats(): Promise<AIUsageStats[]> {
  if (USE_MEMORY_DB) {
    const logs = Array.from(memoryStore.aiUsageLogs.values());
    const userStatsMap = new Map<number, AIUsageStats>();

    logs.forEach(log => {
      if (!userStatsMap.has(log.user_id)) {
        userStatsMap.set(log.user_id, {
          user_id: log.user_id,
          user_name: log.user_name,
          total_calls: 0,
          successful_calls: 0,
          total_tokens: 0,
          total_cost: 0,
          last_used_at: null
        });
      }

      const stats = userStatsMap.get(log.user_id)!;
      stats.total_calls++;
      if (log.success) stats.successful_calls++;
      stats.total_tokens += log.tokens_used;
      stats.total_cost += log.cost_yuan;
      
      if (!stats.last_used_at || log.created_at > stats.last_used_at) {
        stats.last_used_at = log.created_at;
      }
    });

    return Array.from(userStatsMap.values()).sort((a, b) => b.total_calls - a.total_calls);
  }

  const result = await pool!.query(
    `SELECT * FROM ai_usage_stats 
     ORDER BY total_calls DESC`
  );

  return result.rows;
}

/**
 * 获取指定时间范围内的 AI 使用日志
 */
export async function getAIUsageLogsByDateRange(
  startDate: Date,
  endDate: Date,
  userId?: number
): Promise<AIUsageLog[]> {
  if (USE_MEMORY_DB) {
    let logs = Array.from(memoryStore.aiUsageLogs.values());
    
    logs = logs.filter(log => 
      log.created_at >= startDate && log.created_at <= endDate
    );

    if (userId) {
      logs = logs.filter(log => log.user_id === userId);
    }

    return logs.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  let query = `
    SELECT * FROM ai_usage_logs 
    WHERE created_at >= $1 AND created_at <= $2
  `;
  const params: any[] = [startDate, endDate];

  if (userId) {
    query += ` AND user_id = $3`;
    params.push(userId);
  }

  query += ` ORDER BY created_at DESC`;

  const result = await pool!.query(query, params);
  return result.rows;
}

/**
 * 获取总体统计
 */
export async function getOverallAIUsageStats(): Promise<{
  total_users: number;
  total_calls: number;
  successful_calls: number;
  total_tokens: number;
  total_cost: number;
}> {
  if (USE_MEMORY_DB) {
    const logs = Array.from(memoryStore.aiUsageLogs.values());
    const uniqueUsers = new Set(logs.map(log => log.user_id));

    return {
      total_users: uniqueUsers.size,
      total_calls: logs.length,
      successful_calls: logs.filter(log => log.success).length,
      total_tokens: logs.reduce((sum, log) => sum + log.tokens_used, 0),
      total_cost: logs.reduce((sum, log) => sum + log.cost_yuan, 0)
    };
  }

  const result = await pool!.query(`
    SELECT 
      COUNT(DISTINCT user_id) as total_users,
      COUNT(*) as total_calls,
      SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
      SUM(tokens_used) as total_tokens,
      SUM(cost_yuan) as total_cost
    FROM ai_usage_logs
  `);

  return result.rows[0];
}

/**
 * 按功能类型统计
 */
export async function getAIUsageByFeatureType(): Promise<{
  feature_type: string;
  total_calls: number;
  total_cost: number;
}[]> {
  if (USE_MEMORY_DB) {
    const logs = Array.from(memoryStore.aiUsageLogs.values()).filter(log => log.success);
    const featureStatsMap = new Map<string, { total_calls: number; total_cost: number }>();

    logs.forEach(log => {
      if (!featureStatsMap.has(log.feature_type)) {
        featureStatsMap.set(log.feature_type, { total_calls: 0, total_cost: 0 });
      }

      const stats = featureStatsMap.get(log.feature_type)!;
      stats.total_calls++;
      stats.total_cost += log.cost_yuan;
    });

    return Array.from(featureStatsMap.entries())
      .map(([feature_type, stats]) => ({
        feature_type,
        total_calls: stats.total_calls,
        total_cost: stats.total_cost
      }))
      .sort((a, b) => b.total_calls - a.total_calls);
  }

  const result = await pool!.query(`
    SELECT 
      feature_type,
      COUNT(*) as total_calls,
      SUM(cost_yuan) as total_cost
    FROM ai_usage_logs
    WHERE success = true
    GROUP BY feature_type
    ORDER BY total_calls DESC
  `);

  return result.rows;
}
