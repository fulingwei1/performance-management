import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { PerformanceContract } from '../types';

export class PerformanceContractModel {
  static async findAll(filters?: { employeeId?: string; year?: number; status?: string }): Promise<PerformanceContract[]> {
    if (USE_MEMORY_DB) {
      let items = Array.from(memoryStore.performanceContracts.values());
      if (filters?.employeeId) items = items.filter(i => i.employeeId === filters.employeeId);
      if (filters?.year) items = items.filter(i => i.year === filters.year);
      if (filters?.status) items = items.filter(i => i.status === filters.status);
      return items;
    }
    let sql = 'SELECT * FROM performance_contracts WHERE 1=1';
    const params: any[] = [];
    if (filters?.employeeId) { sql += ' AND employee_id = ?'; params.push(filters.employeeId); }
    if (filters?.year) { sql += ' AND year = ?'; params.push(filters.year); }
    if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
    sql += ' ORDER BY created_at DESC';
    return (await query(sql, params)).map(this.format);
  }

  static async findById(id: string): Promise<PerformanceContract | null> {
    if (USE_MEMORY_DB) return memoryStore.performanceContracts.get(id) || null;
    const rows = await query('SELECT * FROM performance_contracts WHERE id = ?', [id]);
    return rows.length > 0 ? this.format(rows[0]) : null;
  }

  static async create(data: PerformanceContract): Promise<PerformanceContract> {
    if (USE_MEMORY_DB) {
      data.createdAt = new Date(); data.updatedAt = new Date();
      memoryStore.performanceContracts.set(data.id, data);
      return data;
    }
    await query(
      'INSERT INTO performance_contracts (id, employee_id, manager_id, year, objectives_snapshot, kpi_snapshot, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.employeeId, data.managerId, data.year, JSON.stringify(data.objectivesSnapshot), JSON.stringify(data.kpiSnapshot), data.status || 'draft']
    );
    return (await this.findById(data.id))!;
  }

  static async update(id: string, data: Partial<PerformanceContract>): Promise<PerformanceContract | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.performanceContracts.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.performanceContracts.set(id, updated);
      return updated;
    }
    const map: Record<string, string> = {
      objectivesSnapshot: 'objectives_snapshot', kpiSnapshot: 'kpi_snapshot', status: 'status',
      employeeSignedAt: 'employee_signed_at', managerSignedAt: 'manager_signed_at'
    };
    const fields: string[] = []; const values: any[] = [];
    for (const [k, col] of Object.entries(map)) {
      if ((data as any)[k] !== undefined) {
        fields.push(`${col} = ?`);
        const val = (data as any)[k];
        values.push((k === 'objectivesSnapshot' || k === 'kpiSnapshot') ? JSON.stringify(val) : val);
      }
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await query(`UPDATE performance_contracts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    return this.findById(id);
  }

  static async sign(id: string, role: 'employee' | 'manager'): Promise<PerformanceContract | null> {
    const contract = USE_MEMORY_DB ? memoryStore.performanceContracts.get(id) : await this.findById(id);
    if (!contract) return null;
    const now = new Date();
    if (role === 'employee') {
      return this.update(id, { employeeSignedAt: now, status: 'pending_manager' });
    } else {
      const newStatus = contract.employeeSignedAt ? 'signed' : 'pending_employee';
      return this.update(id, { managerSignedAt: now, status: newStatus });
    }
  }

  private static format(row: any): PerformanceContract {
    return {
      id: row.id, employeeId: row.employee_id, managerId: row.manager_id, year: row.year,
      objectivesSnapshot: row.objectives_snapshot, kpiSnapshot: row.kpi_snapshot,
      employeeSignedAt: row.employee_signed_at, managerSignedAt: row.manager_signed_at,
      status: row.status, createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
}
