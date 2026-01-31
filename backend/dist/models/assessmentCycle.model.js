"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentCycleModel = void 0;
const database_1 = require("../config/database");
class AssessmentCycleModel {
    // ============ 考核周期管理 ============
    // 获取所有考核周期
    static async findAll() {
        if (database_1.USE_MEMORY_DB) {
            return Array.from(database_1.memoryStore.assessmentCycles?.values() || [])
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
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
        const results = await (0, database_1.query)(sql);
        return results.map(this.formatCycle);
    }
    // 根据ID获取考核周期
    static async findById(id) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryStore.assessmentCycles?.get(id) || null;
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
        const results = await (0, database_1.query)(sql, [id]);
        return results.length > 0 ? this.formatCycle(results[0]) : null;
    }
    // 获取当前激活的考核周期
    static async findActive() {
        if (database_1.USE_MEMORY_DB) {
            const cycles = Array.from(database_1.memoryStore.assessmentCycles?.values() || []);
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
        const results = await (0, database_1.query)(sql);
        return results.length > 0 ? this.formatCycle(results[0]) : null;
    }
    // 根据年份和类型获取考核周期
    static async findByYearAndType(year, type) {
        if (database_1.USE_MEMORY_DB) {
            const cycles = Array.from(database_1.memoryStore.assessmentCycles?.values() || []);
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
        const results = await (0, database_1.query)(sql, [year, type]);
        return results.length > 0 ? this.formatCycle(results[0]) : null;
    }
    // 创建考核周期
    static async create(cycle) {
        const now = new Date().toISOString();
        const newCycle = { ...cycle, createdAt: now, updatedAt: now };
        if (database_1.USE_MEMORY_DB) {
            if (!database_1.memoryStore.assessmentCycles)
                database_1.memoryStore.assessmentCycles = new Map();
            database_1.memoryStore.assessmentCycles.set(cycle.id, newCycle);
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
        await (0, database_1.query)(sql, [
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
    static async update(id, updates) {
        if (database_1.USE_MEMORY_DB) {
            const existing = database_1.memoryStore.assessmentCycles?.get(id);
            if (!existing)
                return null;
            const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
            database_1.memoryStore.assessmentCycles?.set(id, updated);
            return updated;
        }
        const allowedFields = [
            'name', 'type', 'year', 'start_date', 'end_date',
            'self_assessment_deadline', 'manager_review_deadline',
            'hr_review_deadline', 'appeal_deadline', 'status',
            'reminder_days', 'auto_submit', 'exclude_holidays', 'description'
        ];
        const fields = [];
        const values = [];
        Object.entries(updates).forEach(([key, value]) => {
            const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (allowedFields.includes(dbField) && value !== undefined) {
                fields.push(`${dbField} = ?`);
                values.push(value);
            }
        });
        if (fields.length === 0)
            return this.findById(id);
        const sql = `UPDATE assessment_cycles SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        values.push(id);
        await (0, database_1.query)(sql, values);
        return this.findById(id);
    }
    // 删除考核周期
    static async delete(id) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryStore.assessmentCycles?.delete(id) || false;
        }
        const sql = 'DELETE FROM assessment_cycles WHERE id = ?';
        const result = await (0, database_1.query)(sql, [id]);
        return result.affectedRows > 0;
    }
    // ============ 节假日管理 ============
    // 获取所有节假日
    static async findAllHolidays(year) {
        if (database_1.USE_MEMORY_DB) {
            let holidays = Array.from(database_1.memoryStore.holidays?.values() || []);
            if (year) {
                holidays = holidays.filter(h => new Date(h.date).getFullYear() === year);
            }
            return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        let sql = `
      SELECT id, name, date, type
      FROM holidays
    `;
        const params = [];
        if (year) {
            sql += ' WHERE YEAR(date) = ?';
            params.push(year);
        }
        sql += ' ORDER BY date';
        return await (0, database_1.query)(sql, params);
    }
    // 创建节假日
    static async createHoliday(holiday) {
        if (database_1.USE_MEMORY_DB) {
            if (!database_1.memoryStore.holidays)
                database_1.memoryStore.holidays = new Map();
            database_1.memoryStore.holidays.set(holiday.id, holiday);
            return holiday;
        }
        const sql = 'INSERT INTO holidays (id, name, date, type) VALUES (?, ?, ?, ?)';
        await (0, database_1.query)(sql, [holiday.id, holiday.name, holiday.date, holiday.type]);
        return holiday;
    }
    // 删除节假日
    static async deleteHoliday(id) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryStore.holidays?.delete(id) || false;
        }
        const sql = 'DELETE FROM holidays WHERE id = ?';
        const result = await (0, database_1.query)(sql, [id]);
        return result.affectedRows > 0;
    }
    // ============ 辅助方法 ============
    static formatCycle(row) {
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
    static async generateMonthlyCycles(year) {
        const cycles = [];
        for (let month = 1; month <= 12; month++) {
            const monthStr = month.toString().padStart(2, '0');
            const startDate = `${year}-${monthStr}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];
            const cycle = {
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
exports.AssessmentCycleModel = AssessmentCycleModel;
//# sourceMappingURL=assessmentCycle.model.js.map