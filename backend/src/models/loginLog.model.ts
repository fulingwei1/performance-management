import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { LoginLog } from '../types';

export class LoginLogModel {
  // 创建登录日志
  static async create(data: {
    employeeId: string;
    employeeName: string;
    role: string;
    department: string;
    subDepartment: string;
    loginMethod: 'idCard' | 'password';
    loginIp: string;
    userAgent: string;
    success: boolean;
    failureReason?: string;
  }): Promise<LoginLog> {
    const log: LoginLog = {
      id: uuidv4(),
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      role: data.role as any,
      department: data.department,
      subDepartment: data.subDepartment,
      loginTime: new Date(),
      loginMethod: data.loginMethod,
      loginIp: data.loginIp,
      userAgent: data.userAgent,
      success: data.success,
      failureReason: data.failureReason,
    };

    if (USE_MEMORY_DB) {
      if (!memoryStore.loginLogs) {
        memoryStore.loginLogs = new Map();
      }
      memoryStore.loginLogs.set(log.id, log);
      return log;
    }

    const sql = `
      INSERT INTO login_logs (
        id, employee_id, employee_name, role, department, sub_department,
        login_time, login_method, login_ip, user_agent, success, failure_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    await query(sql, [
      log.id,
      log.employeeId,
      log.employeeName,
      log.role,
      log.department,
      log.subDepartment,
      log.loginTime,
      log.loginMethod,
      log.loginIp,
      log.userAgent,
      log.success,
      log.failureReason || null,
    ]);

    return log;
  }

  // 查询登录日志（支持分页和过滤）
  static async find(filters: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: LoginLog[]; total: number }> {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    if (USE_MEMORY_DB) {
      const logs = Array.from((memoryStore.loginLogs || new Map()).values()) as LoginLog[];
      let filtered = logs;

      if (filters.employeeId) {
        filtered = filtered.filter(l => l.employeeId === filters.employeeId);
      }
      if (filters.startDate) {
        filtered = filtered.filter(l => new Date(l.loginTime) >= new Date(filters.startDate!));
      }
      if (filters.endDate) {
        filtered = filtered.filter(l => new Date(l.loginTime) <= new Date(filters.endDate!));
      }
      if (filters.success !== undefined) {
        filtered = filtered.filter(l => l.success === filters.success);
      }

      const total = filtered.length;
      const sorted = filtered.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
      const paged = sorted.slice(offset, offset + limit);

      return { logs: paged, total };
    }

    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters.employeeId) {
      whereClauses.push(`employee_id = $${paramIndex}`);
      params.push(filters.employeeId);
      paramIndex++;
    }
    if (filters.startDate) {
      whereClauses.push(`login_time >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }
    if (filters.endDate) {
      whereClauses.push(`login_time <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }
    if (filters.success !== undefined) {
      whereClauses.push(`success = $${paramIndex}`);
      params.push(filters.success);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 查询总数
    const countSql = `SELECT COUNT(*) FROM login_logs ${whereSql}`;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult[0]?.count || '0', 10);

    // 查询数据
    const dataSql = `
      SELECT id, employee_id, employee_name, role, department, sub_department,
             login_time, login_method, login_ip, user_agent, success, failure_reason
      FROM login_logs ${whereSql}
      ORDER BY login_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await query(dataSql, params);
    const logs = rows.map((row: any) => this.formatLog(row));

    return { logs, total };
  }

  // 格式化数据库行
  private static formatLog(row: any): LoginLog {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      role: row.role,
      department: row.department,
      subDepartment: row.sub_department,
      loginTime: row.login_time,
      loginMethod: row.login_method,
      loginIp: row.login_ip,
      userAgent: row.user_agent,
      success: row.success,
      failureReason: row.failure_reason,
    };
  }
}
