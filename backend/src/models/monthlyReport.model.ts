import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { MonthlyReport } from '../types';

export class MonthlyReportModel {
  static async findAll(filters?: { employeeId?: string; year?: number; status?: string }): Promise<MonthlyReport[]> {
    if (USE_MEMORY_DB) {
      let items = Array.from(memoryStore.monthlyReports.values());
      if (filters?.employeeId) items = items.filter(i => i.employeeId === filters.employeeId);
      if (filters?.year) items = items.filter(i => i.year === filters.year);
      if (filters?.status) items = items.filter(i => i.status === filters.status);
      return items;
    }
    let sql = 'SELECT * FROM monthly_reports WHERE 1=1';
    const params: any[] = [];
    if (filters?.employeeId) { sql += ' AND employee_id = ?'; params.push(filters.employeeId); }
    if (filters?.year) { sql += ' AND year = ?'; params.push(filters.year); }
    if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
    sql += ' ORDER BY year DESC, month DESC';
    return (await query(sql, params)).map(this.format);
  }

  static async findById(id: string): Promise<MonthlyReport | null> {
    if (USE_MEMORY_DB) return memoryStore.monthlyReports.get(id) || null;
    const rows = await query('SELECT * FROM monthly_reports WHERE id = ?', [id]);
    return rows.length > 0 ? this.format(rows[0]) : null;
  }

  static async create(data: MonthlyReport): Promise<MonthlyReport> {
    if (USE_MEMORY_DB) {
      data.createdAt = new Date(); data.updatedAt = new Date();
      memoryStore.monthlyReports.set(data.id, data);
      return data;
    }
    await query(
      'INSERT INTO monthly_reports (id, employee_id, year, month, summary, achievements, issues, next_month_plan, attachments, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.employeeId, data.year, data.month, data.summary, data.achievements, data.issues, data.nextMonthPlan, JSON.stringify(data.attachments || []), data.status || 'draft']
    );
    return (await this.findById(data.id))!;
  }

  static async update(id: string, data: Partial<MonthlyReport>): Promise<MonthlyReport | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.monthlyReports.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.monthlyReports.set(id, updated);
      return updated;
    }
    const map: Record<string, string> = {
      summary: 'summary', achievements: 'achievements', issues: 'issues',
      nextMonthPlan: 'next_month_plan', attachments: 'attachments', status: 'status',
      managerComment: 'manager_comment', managerId: 'manager_id', commentedAt: 'commented_at'
    };
    const fields: string[] = []; const values: any[] = [];
    for (const [k, col] of Object.entries(map)) {
      if ((data as any)[k] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(k === 'attachments' ? JSON.stringify((data as any)[k]) : (data as any)[k]);
      }
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await query(`UPDATE monthly_reports SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    return this.findById(id);
  }

  static async addComment(id: string, managerId: string, comment: string): Promise<MonthlyReport | null> {
    return this.update(id, { managerComment: comment, managerId, commentedAt: new Date(), status: 'reviewed' });
  }

  private static format(row: any): MonthlyReport {
    return {
      id: row.id, employeeId: row.employee_id, year: row.year, month: row.month,
      summary: row.summary, achievements: row.achievements, issues: row.issues,
      nextMonthPlan: row.next_month_plan, attachments: row.attachments,
      managerComment: row.manager_comment, managerId: row.manager_id,
      commentedAt: row.commented_at, status: row.status,
      createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
}
