import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { Objective, KeyResult } from '../types';

export class ObjectiveModel {
  static async findAll(filters?: { year?: number; level?: string; ownerId?: string; department?: string }): Promise<Objective[]> {
    if (USE_MEMORY_DB) {
      let items = Array.from(memoryStore.objectives.values());
      if (filters?.year) items = items.filter(i => i.year === filters.year);
      if (filters?.level) items = items.filter(i => i.level === filters.level);
      if (filters?.ownerId) items = items.filter(i => i.ownerId === filters.ownerId);
      if (filters?.department) items = items.filter(i => i.department === filters.department);
      return items.map(o => ({ ...o, keyResults: this.getKeyResultsForObjective(o.id) }));
    }
    let sql = 'SELECT * FROM objectives WHERE 1=1';
    const params: any[] = [];
    if (filters?.year) { sql += ' AND year = ?'; params.push(filters.year); }
    if (filters?.level) { sql += ' AND level = ?'; params.push(filters.level); }
    if (filters?.ownerId) { sql += ' AND owner_id = ?'; params.push(filters.ownerId); }
    if (filters?.department) { sql += ' AND department = ?'; params.push(filters.department); }
    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql, params);
    return rows.map(this.format);
  }

  static async findById(id: string): Promise<Objective | null> {
    if (USE_MEMORY_DB) {
      const obj = memoryStore.objectives.get(id);
      if (!obj) return null;
      return { ...obj, keyResults: this.getKeyResultsForObjective(id) };
    }
    const rows = await query('SELECT * FROM objectives WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    const obj = this.format(rows[0]);
    const krs = await query('SELECT * FROM key_results WHERE objective_id = ?', [id]);
    obj.keyResults = krs.map(this.formatKR);
    return obj;
  }

  static async create(data: Objective): Promise<Objective> {
    if (USE_MEMORY_DB) {
      data.createdAt = new Date(); data.updatedAt = new Date();
      memoryStore.objectives.set(data.id, data);
      return data;
    }
    await query(
      `INSERT INTO objectives 
      (id, title, description, level, parent_id, strategic_objective_id, department, owner_id, 
       year, quarter, weight, progress, status, start_date, end_date, feedback_cycle,
       target_value, quarterly_targets, monthly_targets, employee_confirmed_at, employee_feedback) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id, data.title, data.description, data.level, data.parentId, data.strategicObjectiveId, 
        data.department, data.ownerId, data.year, data.quarter, data.weight || 100, data.progress || 0, 
        data.status || 'draft', data.startDate || null, data.endDate || null, data.feedbackCycle || 'monthly',
        data.targetValue || null,
        data.quarterlyTargets ? JSON.stringify(data.quarterlyTargets) : null,
        data.monthlyTargets ? JSON.stringify(data.monthlyTargets) : null,
        data.employeeConfirmedAt || null,
        data.employeeFeedback || null
      ]
    );
    return (await this.findById(data.id))!;
  }

  static async update(id: string, data: Partial<Objective>): Promise<Objective | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.objectives.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.objectives.set(id, updated);
      return { ...updated, keyResults: this.getKeyResultsForObjective(id) };
    }
    const map: Record<string, string> = {
      title: 'title', description: 'description', level: 'level', parentId: 'parent_id',
      strategicObjectiveId: 'strategic_objective_id', department: 'department', ownerId: 'owner_id',
      year: 'year', quarter: 'quarter', weight: 'weight', progress: 'progress', status: 'status',
      startDate: 'start_date', endDate: 'end_date', feedbackCycle: 'feedback_cycle',
      targetValue: 'target_value', employeeConfirmedAt: 'employee_confirmed_at', 
      employeeFeedback: 'employee_feedback'
    };
    const fields: string[] = []; const values: any[] = [];
    for (const [k, col] of Object.entries(map)) {
      if ((data as any)[k] !== undefined) { fields.push(`${col} = ?`); values.push((data as any)[k]); }
    }
    
    // Handle JSON fields separately
    if (data.quarterlyTargets !== undefined) {
      fields.push('quarterly_targets = ?');
      values.push(JSON.stringify(data.quarterlyTargets));
    }
    if (data.monthlyTargets !== undefined) {
      fields.push('monthly_targets = ?');
      values.push(JSON.stringify(data.monthlyTargets));
    }
    
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await query(`UPDATE objectives SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      // Delete associated key results
      for (const [krId, kr] of memoryStore.keyResults.entries()) {
        if (kr.objectiveId === id) memoryStore.keyResults.delete(krId);
      }
      return memoryStore.objectives.delete(id);
    }
    const result = await query('DELETE FROM objectives WHERE id = ?', [id]) as any;
    return result.affectedRows > 0;
  }

  static async getTree(year: number): Promise<Objective[]> {
    const all = await this.findAll({ year });
    const map = new Map<string, Objective>();
    all.forEach(o => map.set(o.id, { ...o, children: [] }));
    const roots: Objective[] = [];
    for (const o of map.values()) {
      if (o.parentId && map.has(o.parentId)) {
        map.get(o.parentId)!.children!.push(o);
      } else {
        roots.push(o);
      }
    }
    return roots;
  }

  static async updateProgress(id: string, progress: number): Promise<Objective | null> {
    return this.update(id, { progress });
  }

  // Key Results
  static async addKeyResult(data: KeyResult): Promise<KeyResult> {
    if (USE_MEMORY_DB) {
      data.createdAt = new Date(); data.updatedAt = new Date();
      memoryStore.keyResults.set(data.id, data);
      return data;
    }
    await query(
      'INSERT INTO key_results (id, objective_id, title, metric_type, target_value, current_value, unit, weight, progress, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.objectiveId, data.title, data.metricType || 'number', data.targetValue, data.currentValue || 0, data.unit, data.weight || 0, data.progress || 0, data.status || 'not_started', data.dueDate]
    );
    return data;
  }

  static async updateKeyResult(id: string, data: Partial<KeyResult>): Promise<KeyResult | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.keyResults.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      memoryStore.keyResults.set(id, updated);
      return updated;
    }
    const map: Record<string, string> = {
      title: 'title', metricType: 'metric_type', targetValue: 'target_value',
      currentValue: 'current_value', unit: 'unit', weight: 'weight',
      progress: 'progress', status: 'status', dueDate: 'due_date'
    };
    const fields: string[] = []; const values: any[] = [];
    for (const [k, col] of Object.entries(map)) {
      if ((data as any)[k] !== undefined) { fields.push(`${col} = ?`); values.push((data as any)[k]); }
    }
    if (fields.length === 0) return memoryStore.keyResults.get(id) || null;
    values.push(id);
    await query(`UPDATE key_results SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    const rows = await query('SELECT * FROM key_results WHERE id = ?', [id]);
    return rows.length > 0 ? this.formatKR(rows[0]) : null;
  }

  private static getKeyResultsForObjective(objectiveId: string): KeyResult[] {
    return Array.from(memoryStore.keyResults.values()).filter(kr => kr.objectiveId === objectiveId);
  }

  private static format(row: any): Objective {
    return {
      id: row.id, title: row.title, description: row.description, level: row.level,
      parentId: row.parent_id, strategicObjectiveId: row.strategic_objective_id,
      department: row.department, ownerId: row.owner_id, year: row.year, quarter: row.quarter,
      weight: parseFloat(row.weight), progress: parseFloat(row.progress), status: row.status,
      startDate: row.start_date, endDate: row.end_date, feedbackCycle: row.feedback_cycle,
      targetValue: row.target_value,
      quarterlyTargets: row.quarterly_targets ? (typeof row.quarterly_targets === 'string' ? JSON.parse(row.quarterly_targets) : row.quarterly_targets) : undefined,
      monthlyTargets: row.monthly_targets ? (typeof row.monthly_targets === 'string' ? JSON.parse(row.monthly_targets) : row.monthly_targets) : undefined,
      employeeConfirmedAt: row.employee_confirmed_at,
      employeeFeedback: row.employee_feedback,
      createdAt: row.created_at, updatedAt: row.updated_at
    };
  }

  private static formatKR(row: any): KeyResult {
    return {
      id: row.id, objectiveId: row.objective_id, title: row.title, metricType: row.metric_type,
      targetValue: row.target_value ? parseFloat(row.target_value) : undefined,
      currentValue: parseFloat(row.current_value || 0), unit: row.unit,
      weight: parseFloat(row.weight || 0), progress: parseFloat(row.progress || 0),
      status: row.status, dueDate: row.due_date, createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
}
