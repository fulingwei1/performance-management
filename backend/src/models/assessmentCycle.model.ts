import { query, memoryDB, USE_MEMORY_DB, memoryStore } from '../config/database';
import { AssessmentCycle, AssessmentCycleType, Holiday } from '../types';

export class AssessmentCycleModel {
  // ============ 考核周期管理 ============
  
  // 获取所有考核周期
  static async findAll(): Promise<AssessmentCycle[]> {
    if (USE_MEMORY_DB) {
      return Array.from(memoryStore.assessmentCycles?.values() || [])
        .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()) as AssessmentCycle[];
    }
    
    const sql = `
      SELECT 
        id, name, type, year,
        start_date as startDate, end_date as endDate,
        self_assessment_deadline as selfAssessmentDeadline,
        manager_review_deadline as managerReviewDeadline,
        hr_review_deadline as hrReviewDeadline,
        appeal_deadline as appealDeadline,
        status, reminder_days as reminderDays,
        auto_submit as autoSubmit,
        exclude_holidays as excludeHolidays,
        description,
        created_at as createdAt, updated_at as updatedAt
      FROM assessment_cycles
      ORDER BY start_date DESC
    `;
    const results = await query(sql);
    return results.map(this.formatCycle);
  }
  
  // 根据ID获取考核周期
  static async findById(id: string): Promise<AssessmentCycle | null> {
    if (USE_MEMORY_DB) {
      return memoryStore.assessmentCycles?.get(id) as AssessmentCycle || null;
    }
    
    const sql = `
      SELECT 
        id, name, type, year,
        start_date as startDate, end_date as endDate,
        self_assessment_deadline as selfAssessmentDeadline,
        manager_review_deadline as managerReviewDeadline,
        hr_review_deadline as hrReviewDeadline,
        appeal_deadline as appealDeadline,
        status, reminder_days as reminderDays,
        auto_submit as autoSubmit,
        exclude_holidays as excludeHolidays,
        description,
        created_at as createdAt, updated_at as updatedAt
      FROM assessment_cycles
      WHERE id = ?
    `;
    const results = await query(sql, [id]);
    return results.length > 0 ? this.formatCycle(results[0]) : null;
  }
  
  // 获取当前激活的考核周期
  static async findActive(): Promise<AssessmentCycle | null> {
    if (USE_MEMORY_DB) {
      const cycles = Array.from(memoryStore.assessmentCycles?.values() || []) as AssessmentCycle[];
      const now = new Date().toISOString();
      return cycles.find(c => c.status === 'active' && c.startDate <= now && c.endDate >= now) || null;
    }
    
    const sql = `
      SELECT 
        id, name, type, year,
        start_date as startDate, end_date as endDate,
        self_assessment_deadline as selfAssessmentDeadline,
        manager_review_deadline as managerReviewDeadline,
        hr_review_deadline as hrReviewDeadline,
        appeal_deadline as appealDeadline,
        status, reminder_days as reminderDays,
        auto_submit as autoSubmit,
        exclude_holidays as excludeHolidays,
        description,
        created_at as createdAt, updated_at as updatedAt
      FROM assessment_cycles
      WHERE status = 'active' 
        AND start_date <= CURRENT_DATE 
        AND end_date >= CURRENT_DATE
      ORDER BY start_date DESC
      LIMIT 1
    `;
    const results = await query(sql);
    return results.length > 0 ? this.formatCycle(results[0]) : null;
  }
  
  // 根据年份和类型获取考核周期
  static async findByYearAndType(year: number, type: AssessmentCycleType): Promise<AssessmentCycle | null> {
    if (USE_MEMORY_DB) {
      const cycles = Array.from(memoryStore.assessmentCycles?.values() || []) as AssessmentCycle[];
      return cycles.find(c => c.year === year && c.type === type) || null;
    }
    
    const sql = `
      SELECT 
        id, name, type, year,
        start_date as startDate, end_date as endDate,
        self_assessment_deadline as selfAssessmentDeadline,
        manager_review_deadline as managerReviewDeadline,
        hr_review_deadline as hrReviewDeadline,
        appeal_deadline as appealDeadline,
        status, reminder_days as reminderDays,
        auto_submit as autoSubmit,
        exclude_holidays as excludeHolidays,
        description,
        created_at as createdAt, updated_at as updatedAt
      FROM assessment_cycles
      WHERE year = ? AND type = ?
    `;
    const results = await query(sql, [year, type]);
    return results.length > 0 ? this.formatCycle(results[0]) : null;
  }
  
  // 创建考核周期
  static async create(cycle: Omit<AssessmentCycle, 'createdAt' | 'updatedAt'>): Promise<AssessmentCycle> {
    const now = new Date().toISOString();
    const newCycle: AssessmentCycle = { ...cycle, createdAt: now, updatedAt: now };
    
    if (USE_MEMORY_DB) {
      if (!memoryStore.assessmentCycles) memoryStore.assessmentCycles = new Map();
      memoryStore.assessmentCycles.set(cycle.id, newCycle);
      return newCycle;
    }
    
    const sql = `
      INSERT INTO assessment_cycles (
        id, name, type, year, start_date, end_date,
        self_assessment_deadline, manager_review_deadline,
        hr_review_deadline, appeal_deadline, status,
        reminder_days, auto_submit, exclude_holidays, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      cycle.id, cycle.name, cycle.type, cycle.year,
      cycle.startDate, cycle.endDate,
      cycle.selfAssessmentDeadline || null,
      cycle.managerReviewDeadline || null,
      cycle.hrReviewDeadline || null,
      cycle.appealDeadline || null,
      cycle.status, cycle.reminderDays, cycle.autoSubmit,
      cycle.excludeHolidays, cycle.description || null
    ]);
    
    return newCycle;
  }
  
  // 更新考核周期
  static async update(id: string, updates: Partial<AssessmentCycle>): Promise<AssessmentCycle | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.assessmentCycles?.get(id) as AssessmentCycle;
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      memoryStore.assessmentCycles?.set(id, updated);
      return updated;
    }
    
    const allowedFields = [
      'name', 'type', 'year', 'start_date', 'end_date',
      'self_assessment_deadline', 'manager_review_deadline',
      'hr_review_deadline', 'appeal_deadline', 'status',
      'reminder_days', 'auto_submit', 'exclude_holidays', 'description'
    ];
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbField) && value !== undefined) {
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return this.findById(id);
    
    const sql = `UPDATE assessment_cycles SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    values.push(id);
    
    await query(sql, values);
    return this.findById(id);
  }
  
  // 删除考核周期
  static async delete(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      return memoryStore.assessmentCycles?.delete(id) || false;
    }
    
    const sql = 'DELETE FROM assessment_cycles WHERE id = ?';
    const result = await query(sql, [id]) as unknown as { affectedRows: number };
    return result.affectedRows > 0;
  }
  
  // ============ 节假日管理 ============
  
  // 获取所有节假日
  static async findAllHolidays(year?: number): Promise<Holiday[]> {
    if (USE_MEMORY_DB) {
      let holidays = Array.from(memoryStore.holidays?.values() || []) as Holiday[];
      if (year) {
        holidays = holidays.filter(h => new Date(h.date).getFullYear() === year);
      }
      return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    let sql = `
      SELECT id, name, date, type
      FROM holidays
    `;
    const params: any[] = [];
    
    if (year) {
      sql += ' WHERE YEAR(date) = ?';
      params.push(year);
    }
    
    sql += ' ORDER BY date';
    return await query(sql, params) as Holiday[];
  }
  
  // 创建节假日
  static async createHoliday(holiday: Holiday): Promise<Holiday> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.holidays) memoryStore.holidays = new Map();
      memoryStore.holidays.set(holiday.id, holiday);
      return holiday;
    }
    
    const sql = 'INSERT INTO holidays (id, name, date, type) VALUES (?, ?, ?, ?)';
    await query(sql, [holiday.id, holiday.name, holiday.date, holiday.type]);
    return holiday;
  }
  
  // 删除节假日
  static async deleteHoliday(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      return memoryStore.holidays?.delete(id) || false;
    }
    
    const sql = 'DELETE FROM holidays WHERE id = ?';
    const result = await query(sql, [id]) as unknown as { affectedRows: number };
    return result.affectedRows > 0;
  }
  
  // ============ 辅助方法 ============
  
  private static formatCycle(row: any): AssessmentCycle {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      year: row.year,
      startDate: row.startDate || row.start_date,
      endDate: row.endDate || row.end_date,
      selfAssessmentDeadline: row.selfAssessmentDeadline || row.self_assessment_deadline,
      managerReviewDeadline: row.managerReviewDeadline || row.manager_review_deadline,
      hrReviewDeadline: row.hrReviewDeadline || row.hr_review_deadline,
      appealDeadline: row.appealDeadline || row.appeal_deadline,
      status: row.status,
      reminderDays: row.reminderDays || row.reminder_days || 3,
      autoSubmit: row.autoSubmit || row.auto_submit || false,
      excludeHolidays: row.excludeHolidays || row.exclude_holidays || true,
      description: row.description,
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at
    };
  }
  
  // 生成月度考核周期
  static async generateMonthlyCycles(year: number): Promise<AssessmentCycle[]> {
    const cycles: AssessmentCycle[] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, '0');
      const startDate = `${year}-${monthStr}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      const cycle: AssessmentCycle = {
        id: `cycle-${year}-${monthStr}`,
        name: `${year}年${month}月考核`,
        type: 'monthly',
        year,
        startDate,
        endDate,
        selfAssessmentDeadline: endDate,
        managerReviewDeadline: endDate,
        status: 'draft',
        reminderDays: 3,
        autoSubmit: false,
        excludeHolidays: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const existing = await this.findByYearAndType(year, 'monthly');
      if (!existing) {
        await this.create(cycle);
        cycles.push(cycle);
      }
    }
    
    return cycles;
  }
}
