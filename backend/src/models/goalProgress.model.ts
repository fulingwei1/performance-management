import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { GoalProgress } from '../types';

export class GoalProgressModel {
  static async findAll(filters?: {
    employeeId?: string;
    objectiveId?: string;
    year?: number;
    month?: number;
  }): Promise<GoalProgress[]> {
    if (USE_MEMORY_DB) {
      let items = Array.from(memoryStore.goalProgress?.values() || []);
      if (filters?.employeeId) items = items.filter(i => i.employeeId === filters.employeeId);
      if (filters?.objectiveId) items = items.filter(i => i.objectiveId === filters.objectiveId);
      if (filters?.year) items = items.filter(i => i.year === filters.year);
      if (filters?.month) items = items.filter(i => i.month === filters.month);
      return items;
    }

    let sql = 'SELECT * FROM goal_progress WHERE 1=1';
    const params: any[] = [];
    if (filters?.employeeId) {
      sql += ' AND employee_id = ?';
      params.push(filters.employeeId);
    }
    if (filters?.objectiveId) {
      sql += ' AND objective_id = ?';
      params.push(filters.objectiveId);
    }
    if (filters?.year) {
      sql += ' AND year = ?';
      params.push(filters.year);
    }
    if (filters?.month) {
      sql += ' AND month = ?';
      params.push(filters.month);
    }
    sql += ' ORDER BY year DESC, month DESC';
    return (await query(sql, params)).map(this.format);
  }

  static async findById(id: string): Promise<GoalProgress | null> {
    if (USE_MEMORY_DB) {
      return memoryStore.goalProgress?.get(id) || null;
    }
    const rows = await query('SELECT * FROM goal_progress WHERE id = ?', [id]);
    return rows.length > 0 ? this.format(rows[0]) : null;
  }

  static async findByObjectiveAndMonth(
    objectiveId: string,
    year: number,
    month: number
  ): Promise<GoalProgress | null> {
    if (USE_MEMORY_DB) {
      const items = Array.from(memoryStore.goalProgress?.values() || []);
      return items.find(i => i.objectiveId === objectiveId && i.year === year && i.month === month) || null;
    }
    const rows = await query(
      'SELECT * FROM goal_progress WHERE objective_id = ? AND year = ? AND month = ?',
      [objectiveId, year, month]
    );
    return rows.length > 0 ? this.format(rows[0]) : null;
  }

  static async create(data: GoalProgress): Promise<GoalProgress> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.goalProgress) memoryStore.goalProgress = new Map();
      data.createdAt = new Date();
      data.updatedAt = new Date();
      memoryStore.goalProgress.set(data.id, data);
      return data;
    }

    await query(
      `INSERT INTO goal_progress 
      (id, objective_id, employee_id, year, month, employee_completion_rate, employee_comment, 
       employee_submitted_at, manager_completion_rate, manager_comment, manager_reviewed_at, 
       manager_id, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.objectiveId,
        data.employeeId,
        data.year,
        data.month,
        data.employeeCompletionRate,
        data.employeeComment || null,
        data.employeeSubmittedAt || null,
        data.managerCompletionRate || null,
        data.managerComment || null,
        data.managerReviewedAt || null,
        data.managerId || null,
        data.status || 'draft',
      ]
    );
    return (await this.findById(data.id))!;
  }

  static async update(id: string, data: Partial<GoalProgress>): Promise<GoalProgress | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.goalProgress?.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.goalProgress!.set(id, updated);
      return updated;
    }

    const fields: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      employeeCompletionRate: 'employee_completion_rate',
      employeeComment: 'employee_comment',
      employeeSubmittedAt: 'employee_submitted_at',
      managerCompletionRate: 'manager_completion_rate',
      managerComment: 'manager_comment',
      managerReviewedAt: 'manager_reviewed_at',
      managerId: 'manager_id',
      status: 'status',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((data as any)[key] !== undefined) {
        fields.push(`${col} = ?`);
        values.push((data as any)[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await query(
      `UPDATE goal_progress SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      return memoryStore.goalProgress?.delete(id) || false;
    }
    const result = (await query('DELETE FROM goal_progress WHERE id = ?', [id])) as any;
    return result.affectedRows > 0;
  }

  private static format(row: any): GoalProgress {
    return {
      id: row.id,
      objectiveId: row.objective_id,
      employeeId: row.employee_id,
      year: row.year,
      month: row.month,
      employeeCompletionRate: parseFloat(row.employee_completion_rate || 0),
      employeeComment: row.employee_comment,
      employeeSubmittedAt: row.employee_submitted_at,
      managerCompletionRate: row.manager_completion_rate ? parseFloat(row.manager_completion_rate) : undefined,
      managerComment: row.manager_comment,
      managerReviewedAt: row.manager_reviewed_at,
      managerId: row.manager_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
