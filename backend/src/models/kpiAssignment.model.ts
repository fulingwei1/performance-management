import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { KpiAssignment } from '../types';

export class KpiAssignmentModel {
  static async findAll(filters?: { employeeId?: string; year?: number; status?: string }): Promise<KpiAssignment[]> {
    if (USE_MEMORY_DB) {
      let items = Array.from(memoryStore.kpiAssignments.values());
      if (filters?.employeeId) items = items.filter(i => i.employeeId === filters.employeeId);
      if (filters?.year) items = items.filter(i => i.year === filters.year);
      if (filters?.status) items = items.filter(i => i.status === filters.status);
      return items;
    }
    let sql = 'SELECT * FROM kpi_assignments WHERE 1=1';
    const params: any[] = [];
    if (filters?.employeeId) { sql += ' AND employee_id = ?'; params.push(filters.employeeId); }
    if (filters?.year) { sql += ' AND year = ?'; params.push(filters.year); }
    if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
    sql += ' ORDER BY created_at DESC';
    return (await query(sql, params)).map(this.format);
  }

  static async findById(id: string): Promise<KpiAssignment | null> {
    if (USE_MEMORY_DB) return memoryStore.kpiAssignments.get(id) || null;
    const rows = await query('SELECT * FROM kpi_assignments WHERE id = ?', [id]);
    return rows.length > 0 ? this.format(rows[0]) : null;
  }

  static async create(data: KpiAssignment): Promise<KpiAssignment> {
    if (USE_MEMORY_DB) {
      data.createdAt = new Date(); data.updatedAt = new Date();
      memoryStore.kpiAssignments.set(data.id, data);
      return data;
    }
    await query(
      'INSERT INTO kpi_assignments (id, employee_id, objective_id, key_result_id, kpi_name, target_value, actual_value, unit, weight, score, year, month, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.employeeId, data.objectiveId, data.keyResultId, data.kpiName, data.targetValue, data.actualValue || 0, data.unit, data.weight || 0, data.score, data.year, data.month, data.status || 'pending']
    );
    return (await this.findById(data.id))!;
  }

  static async update(id: string, data: Partial<KpiAssignment>): Promise<KpiAssignment | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.kpiAssignments.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.kpiAssignments.set(id, updated);
      return updated;
    }
    const map: Record<string, string> = {
      kpiName: 'kpi_name', targetValue: 'target_value', actualValue: 'actual_value',
      unit: 'unit', weight: 'weight', score: 'score', status: 'status', month: 'month'
    };
    const fields: string[] = []; const values: any[] = [];
    for (const [k, col] of Object.entries(map)) {
      if ((data as any)[k] !== undefined) { fields.push(`${col} = ?`); values.push((data as any)[k]); }
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await query(`UPDATE kpi_assignments SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    return this.findById(id);
  }

  private static format(row: any): KpiAssignment {
    return {
      id: row.id, employeeId: row.employee_id, objectiveId: row.objective_id,
      keyResultId: row.key_result_id, kpiName: row.kpi_name,
      targetValue: row.target_value ? parseFloat(row.target_value) : undefined,
      actualValue: parseFloat(row.actual_value || 0), unit: row.unit,
      weight: parseFloat(row.weight || 0), score: row.score ? parseFloat(row.score) : undefined,
      year: row.year, month: row.month, status: row.status,
      createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
}
