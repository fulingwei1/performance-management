import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { StrategicObjective } from '../types';

export class StrategicObjectiveModel {
  static async findAll(year?: number): Promise<StrategicObjective[]> {
    if (USE_MEMORY_DB) {
      let items = Array.from(memoryStore.strategicObjectives.values());
      if (year) items = items.filter(i => i.year === year);
      return items;
    }
    let sql = 'SELECT * FROM strategic_objectives';
    const params: any[] = [];
    if (year) { sql += ' WHERE year = ?'; params.push(year); }
    sql += ' ORDER BY created_at DESC';
    return (await query(sql, params)).map(this.format);
  }

  static async findById(id: string): Promise<StrategicObjective | null> {
    if (USE_MEMORY_DB) {
      return memoryStore.strategicObjectives.get(id) || null;
    }
    const rows = await query('SELECT * FROM strategic_objectives WHERE id = ?', [id]);
    return rows.length > 0 ? this.format(rows[0]) : null;
  }

  static async create(data: StrategicObjective): Promise<StrategicObjective> {
    if (USE_MEMORY_DB) {
      data.createdAt = new Date();
      data.updatedAt = new Date();
      memoryStore.strategicObjectives.set(data.id, data);
      return data;
    }
    await query(
      'INSERT INTO strategic_objectives (id, title, description, year, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [data.id, data.title, data.description, data.year, data.status || 'draft', data.createdBy]
    );
    return (await this.findById(data.id))!;
  }

  static async update(id: string, data: Partial<StrategicObjective>): Promise<StrategicObjective | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.strategicObjectives.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.strategicObjectives.set(id, updated);
      return updated;
    }
    const fields: string[] = [];
    const values: any[] = [];
    const map: Record<string, string> = { title: 'title', description: 'description', year: 'year', status: 'status' };
    for (const [k, col] of Object.entries(map)) {
      if ((data as any)[k] !== undefined) { fields.push(`${col} = ?`); values.push((data as any)[k]); }
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await query(`UPDATE strategic_objectives SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) return memoryStore.strategicObjectives.delete(id);
    const result = await query('DELETE FROM strategic_objectives WHERE id = ?', [id]) as any;
    return result.affectedRows > 0;
  }

  private static format(row: any): StrategicObjective {
    return {
      id: row.id, title: row.title, description: row.description, year: row.year,
      status: row.status, type: row.type, department: row.department,
      createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
}
