import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import logger from '../config/logger';

export interface Appeal {
  id: string;
  performanceRecordId: string;
  employeeId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  hrComment?: string;
  hrId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AppealModel {
  // 格式化数据库字段
  static format(row: any): Appeal {
    return {
      id: row.id,
      performanceRecordId: row.performance_record_id || row.performanceRecordId,
      employeeId: row.employee_id || row.employeeId,
      reason: row.reason,
      status: row.status,
      hrComment: row.hr_comment || row.hrComment,
      hrId: row.hr_id || row.hrId,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }

  // 创建申诉
  static async create(data: Omit<Appeal, 'createdAt' | 'updatedAt'>): Promise<Appeal> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        memoryStore.appeals = new Map();
      }
      const appeal: Appeal = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.appeals.set(data.id, appeal);
      logger.info(`创建申诉到内存数据库: ${data.id}`);
      return appeal;
    }

    const sql = `
      INSERT INTO appeals (
        id, performance_record_id, employee_id, reason, status
      ) VALUES (?, ?, ?, ?, ?)
    `;

    await query(sql, [
      data.id,
      data.performanceRecordId,
      data.employeeId,
      data.reason,
      data.status || 'pending'
    ]);

    return (await this.findById(data.id))!;
  }

  // 根据ID查找申诉
  static async findById(id: string): Promise<Appeal | null> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        memoryStore.appeals = new Map();
      }
      return memoryStore.appeals.get(id) || null;
    }

    const sql = 'SELECT * FROM appeals WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows.length > 0 ? this.format(rows[0]) : null;
  }

  // 查询申诉列表（支持筛选）
  static async findAll(filters?: {
    employeeId?: string;
    status?: string;
    hrId?: string;
  }): Promise<Appeal[]> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        memoryStore.appeals = new Map();
      }
      let items = Array.from(memoryStore.appeals.values());
      if (filters?.employeeId) {
        items = items.filter(i => i.employeeId === filters.employeeId);
      }
      if (filters?.status) {
        items = items.filter(i => i.status === filters.status);
      }
      if (filters?.hrId) {
        items = items.filter(i => i.hrId === filters.hrId);
      }
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    let sql = 'SELECT * FROM appeals WHERE 1=1';
    const params: any[] = [];

    if (filters?.employeeId) {
      sql += ' AND employee_id = ?';
      params.push(filters.employeeId);
    }
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.hrId) {
      sql += ' AND hr_id = ?';
      params.push(filters.hrId);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await query(sql, params);
    return rows.map(this.format);
  }

  // 更新申诉（HR处理）
  static async update(id: string, data: Partial<Appeal>): Promise<Appeal | null> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        memoryStore.appeals = new Map();
      }
      const existing = memoryStore.appeals.get(id);
      if (!existing) {
        return null;
      }
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date()
      };
      memoryStore.appeals.set(id, updated);
      return updated;
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (data.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(data.status);
    }
    if (data.hrComment !== undefined) {
      updateFields.push('hr_comment = ?');
      updateValues.push(data.hrComment);
    }
    if (data.hrId !== undefined) {
      updateFields.push('hr_id = ?');
      updateValues.push(data.hrId);
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    updateValues.push(id);

    const sql = `
      UPDATE appeals
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await query(sql, updateValues);
    return await this.findById(id);
  }

  // 删除申诉
  static async delete(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        memoryStore.appeals = new Map();
      }
      return memoryStore.appeals.delete(id);
    }

    const sql = 'DELETE FROM appeals WHERE id = ?';
    await query(sql, [id]);
    return true;
  }
}
