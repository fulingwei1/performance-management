import { query, USE_MEMORY_DB } from '../config/database';

export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
export type AuditResult = 'SUCCESS' | 'FAILED' | 'UNAUTHORIZED';

export interface AuditLog {
  id?: number;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  action: AuditAction;
  module: string;
  target_type?: string;
  target_id?: string;
  description?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  result?: AuditResult;
  error_message?: string;
  created_at?: Date;
}

export interface AuditLogFilter {
  user_id?: string;
  action?: AuditAction;
  module?: string;
  target_type?: string;
  result?: AuditResult;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byModule: Record<string, number>;
  byResult: Record<string, number>;
  recentLogs: AuditLog[];
}

export class AuditLogModel {
  /**
   * 创建审计日志（异步写入，不影响主流程）
   */
  static async create(log: AuditLog): Promise<void> {
    try {
      if (USE_MEMORY_DB) {
        // 内存模式下暂不记录审计日志（可选实现）
        console.log('[AuditLog Memory]', log);
        return;
      }

      const sql = `
        INSERT INTO audit_logs (
          user_id, user_name, user_role,
          action, module, target_type, target_id,
          description, changes,
          ip_address, user_agent, request_method, request_url,
          result, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;

      await query(sql, [
        log.user_id,
        log.user_name,
        log.user_role,
        log.action,
        log.module,
        log.target_type,
        log.target_id,
        log.description,
        log.changes ? JSON.stringify(log.changes) : null,
        log.ip_address,
        log.user_agent,
        log.request_method,
        log.request_url,
        log.result || 'SUCCESS',
        log.error_message,
      ]);
    } catch (error) {
      // 审计日志失败不应该影响主流程，仅记录错误
      console.error('[AuditLog Error]', error);
    }
  }

  /**
   * 查询所有日志（支持过滤）
   */
  static async findAll(filters: AuditLogFilter = {}): Promise<{ logs: AuditLog[]; total: number }> {
    if (USE_MEMORY_DB) {
      return { logs: [], total: 0 };
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.user_id) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(filters.user_id);
    }

    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters.module) {
      conditions.push(`module = $${paramIndex++}`);
      params.push(filters.module);
    }

    if (filters.target_type) {
      conditions.push(`target_type = $${paramIndex++}`);
      params.push(filters.target_type);
    }

    if (filters.result) {
      conditions.push(`result = $${paramIndex++}`);
      params.push(filters.result);
    }

    if (filters.start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 统计总数
    const countSql = `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`;
    const countResult = (await query(countSql, params)) as { count: string }[];
    const total = parseInt(countResult[0]?.count || '0');

    // 分页查询
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT 
        id, user_id, user_name, user_role,
        action, module, target_type, target_id,
        description, changes,
        ip_address, user_agent, request_method, request_url,
        result, error_message, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const logs = (await query(sql, [...params, limit, offset])) as AuditLog[];

    // 解析 JSONB 字段
    logs.forEach(log => {
      if (typeof log.changes === 'string') {
        try {
          log.changes = JSON.parse(log.changes as string);
        } catch {
          log.changes = {};
        }
      }
    });

    return { logs, total };
  }

  /**
   * 查询某用户的操作历史
   */
  static async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    if (USE_MEMORY_DB) {
      return [];
    }

    const sql = `
      SELECT 
        id, user_id, user_name, user_role,
        action, module, target_type, target_id,
        description, changes,
        ip_address, user_agent, request_method, request_url,
        result, error_message, created_at
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const logs = (await query(sql, [userId, limit])) as AuditLog[];

    logs.forEach(log => {
      if (typeof log.changes === 'string') {
        try {
          log.changes = JSON.parse(log.changes as string);
        } catch {
          log.changes = {};
        }
      }
    });

    return logs;
  }

  /**
   * 查询某对象的操作历史
   */
  static async findByTarget(type: string, id: string): Promise<AuditLog[]> {
    if (USE_MEMORY_DB) {
      return [];
    }

    const sql = `
      SELECT 
        id, user_id, user_name, user_role,
        action, module, target_type, target_id,
        description, changes,
        ip_address, user_agent, request_method, request_url,
        result, error_message, created_at
      FROM audit_logs
      WHERE target_type = $1 AND target_id = $2
      ORDER BY created_at DESC
    `;

    const logs = (await query(sql, [type, id])) as AuditLog[];

    logs.forEach(log => {
      if (typeof log.changes === 'string') {
        try {
          log.changes = JSON.parse(log.changes as string);
        } catch {
          log.changes = {};
        }
      }
    });

    return logs;
  }

  /**
   * 获取统计信息
   */
  static async getStats(): Promise<AuditStats> {
    if (USE_MEMORY_DB) {
      return {
        totalLogs: 0,
        byAction: {},
        byModule: {},
        byResult: {},
        recentLogs: [],
      };
    }

    // 总数
    const countSql = `SELECT COUNT(*) as count FROM audit_logs`;
    const countResult = (await query(countSql, [])) as { count: string }[];
    const totalLogs = parseInt(countResult[0]?.count || '0');

    // 按操作统计
    const actionSql = `
      SELECT action, COUNT(*) as count 
      FROM audit_logs 
      GROUP BY action
    `;
    const actionResults = (await query(actionSql, [])) as { action: string; count: string }[];
    const byAction: Record<string, number> = {};
    actionResults.forEach(row => {
      byAction[row.action] = parseInt(row.count);
    });

    // 按模块统计
    const moduleSql = `
      SELECT module, COUNT(*) as count 
      FROM audit_logs 
      GROUP BY module
    `;
    const moduleResults = (await query(moduleSql, [])) as { module: string; count: string }[];
    const byModule: Record<string, number> = {};
    moduleResults.forEach(row => {
      byModule[row.module] = parseInt(row.count);
    });

    // 按结果统计
    const resultSql = `
      SELECT result, COUNT(*) as count 
      FROM audit_logs 
      GROUP BY result
    `;
    const resultResults = (await query(resultSql, [])) as { result: string; count: string }[];
    const byResult: Record<string, number> = {};
    resultResults.forEach(row => {
      byResult[row.result] = parseInt(row.count);
    });

    // 最近日志
    const recentSql = `
      SELECT 
        id, user_id, user_name, user_role,
        action, module, target_type, target_id,
        description, changes,
        ip_address, user_agent, request_method, request_url,
        result, error_message, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const recentLogs = (await query(recentSql, [])) as AuditLog[];

    recentLogs.forEach(log => {
      if (typeof log.changes === 'string') {
        try {
          log.changes = JSON.parse(log.changes as string);
        } catch {
          log.changes = {};
        }
      }
    });

    return {
      totalLogs,
      byAction,
      byModule,
      byResult,
      recentLogs,
    };
  }
}
