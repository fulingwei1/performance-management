import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { PerformanceInterview } from '../types';

export class PerformanceInterviewModel {
  static async findAll(filters?: { employeeId?: string; interviewerId?: string; year?: number; status?: string }): Promise<PerformanceInterview[]> {
    if (USE_MEMORY_DB) {
      let items = Array.from(memoryStore.performanceInterviews.values());
      if (filters?.employeeId) items = items.filter(i => i.employeeId === filters.employeeId);
      if (filters?.interviewerId) items = items.filter(i => i.interviewerId === filters.interviewerId);
      if (filters?.year) items = items.filter(i => i.year === filters.year);
      if (filters?.status) items = items.filter(i => i.status === filters.status);
      return items;
    }
    let sql = 'SELECT * FROM performance_interviews WHERE 1=1';
    const params: any[] = [];
    if (filters?.employeeId) { sql += ' AND employee_id = ?'; params.push(filters.employeeId); }
    if (filters?.interviewerId) { sql += ' AND interviewer_id = ?'; params.push(filters.interviewerId); }
    if (filters?.year) { sql += ' AND year = ?'; params.push(filters.year); }
    if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
    sql += ' ORDER BY created_at DESC';
    return (await query(sql, params)).map(this.format);
  }

  static async findById(id: string): Promise<PerformanceInterview | null> {
    if (USE_MEMORY_DB) return memoryStore.performanceInterviews.get(id) || null;
    const rows = await query('SELECT * FROM performance_interviews WHERE id = ?', [id]);
    return rows.length > 0 ? this.format(rows[0]) : null;
  }

  static async create(data: PerformanceInterview): Promise<PerformanceInterview> {
    if (USE_MEMORY_DB) {
      data.createdAt = new Date(); data.updatedAt = new Date();
      memoryStore.performanceInterviews.set(data.id, data);
      return data;
    }
    await query(
      'INSERT INTO performance_interviews (id, employee_id, interviewer_id, year, interview_date, performance_summary, strengths, improvements, development_plan, employee_feedback, agreed_actions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.employeeId, data.interviewerId, data.year, data.interviewDate, data.performanceSummary, data.strengths, data.improvements, data.developmentPlan, data.employeeFeedback, JSON.stringify(data.agreedActions || []), data.status || 'scheduled']
    );
    return (await this.findById(data.id))!;
  }

  static async update(id: string, data: Partial<PerformanceInterview>): Promise<PerformanceInterview | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.performanceInterviews.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.performanceInterviews.set(id, updated);
      return updated;
    }
    const map: Record<string, string> = {
      interviewDate: 'interview_date', performanceSummary: 'performance_summary',
      strengths: 'strengths', improvements: 'improvements', developmentPlan: 'development_plan',
      employeeFeedback: 'employee_feedback', agreedActions: 'agreed_actions', status: 'status'
    };
    const fields: string[] = []; const values: any[] = [];
    for (const [k, col] of Object.entries(map)) {
      if ((data as any)[k] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(k === 'agreedActions' ? JSON.stringify((data as any)[k]) : (data as any)[k]);
      }
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await query(`UPDATE performance_interviews SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) return memoryStore.performanceInterviews.delete(id);
    const result = await query('DELETE FROM performance_interviews WHERE id = ?', [id]) as any;
    return result.affectedRows > 0;
  }

  private static format(row: any): PerformanceInterview {
    return {
      id: row.id, employeeId: row.employee_id, interviewerId: row.interviewer_id,
      year: row.year, interviewDate: row.interview_date, performanceSummary: row.performance_summary,
      strengths: row.strengths, improvements: row.improvements, developmentPlan: row.development_plan,
      employeeFeedback: row.employee_feedback, agreedActions: row.agreed_actions,
      status: row.status, createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
}
