import { query, transaction, memoryDB, USE_MEMORY_DB, memoryStore } from '../config/database';
import { PerformanceRecord, RecordStatus } from '../types';
import { EmployeeModel } from './employee.model';
import {
  getPerformanceRankingConfig,
  getOrgUnitKey,
  isParticipatingRecord,
  matchMergeRankGroup,
  resolveGroupKey,
} from '../services/performanceRankingConfig.service';

export class PerformanceModel {
  // 根据ID查找记录
  static async findById(id: string): Promise<PerformanceRecord | null> {
    if (USE_MEMORY_DB) {
      const record = memoryDB.performanceRecords.findById(id);
      if (!record) return null;
      return this.enrichRecord(record);
    }
    
    const sql = `
      SELECT 
        r.*,
        e.name as "employeeName",
        e.department,
        e.sub_department as "subDepartment",
        e.level as "employeeLevel",
        m.name as "assessorName"
      FROM performance_records r
      JOIN employees e ON r.employee_id = e.id
      JOIN employees m ON r.assessor_id = m.id
      WHERE r.id = ?
    `;
    const results = await query(sql, [id]);
    return results.length > 0 ? this.formatRecord(results[0]) : null;
  }

  // 获取员工的所有绩效记录
  static async findByEmployeeId(employeeId: string): Promise<PerformanceRecord[]> {
    if (USE_MEMORY_DB) {
      const records = memoryDB.performanceRecords.findByEmployeeId(employeeId);
      return Promise.all(records.map((r: PerformanceRecord) => this.enrichRecord(r)));
    }
    
    const sql = `
      SELECT 
        r.*,
        e.name as "employeeName",
        e.department,
        e.sub_department as "subDepartment",
        e.level as "employeeLevel",
        m.name as "assessorName"
      FROM performance_records r
      JOIN employees e ON r.employee_id = e.id
      JOIN employees m ON r.assessor_id = m.id
      WHERE r.employee_id = ?
      ORDER BY r.month DESC
    `;
    const results = await query(sql, [employeeId]);
    return results.map(this.formatRecord);
  }

  // 获取经理的所有评分记录（下属）
  static async findByAssessorId(assessorId: string, month?: string): Promise<PerformanceRecord[]> {
    if (USE_MEMORY_DB) {
      // 获取经理的所有下属
      const subordinates = await EmployeeModel.findByManagerId(assessorId);
      const subordinateIds = subordinates.map(s => s.id);
      
      // 获取这些员工的绩效记录
      const allRecords = Array.from(memoryStore.performanceRecords.values()) as PerformanceRecord[];
      let records = allRecords.filter(r => subordinateIds.includes(r.employeeId));
      
      if (month) {
        records = records.filter(r => r.month === month);
      }
      
      return Promise.all(records.map(r => this.enrichRecord(r)));
    }
    
    let sql = `
      SELECT 
        r.*,
        e.name as "employeeName",
        e.department,
        e.sub_department as "subDepartment",
        e.level as "employeeLevel",
        m.name as "assessorName"
      FROM performance_records r
      JOIN employees e ON r.employee_id = e.id
      JOIN employees m ON r.assessor_id = m.id
      WHERE r.assessor_id = ?
        AND (e.status = 'active' OR e.status IS NULL)
    `;
    const params: any[] = [assessorId];
    
    if (month) {
      sql += ' AND r.month = ?';
      params.push(month);
    }
    
    sql += ' ORDER BY r.month DESC, r.created_at DESC';
    
    const results = await query(sql, params);
    return results.map(this.formatRecord);
  }

  // 获取某月份的所有记录
  static async findByMonth(month: string): Promise<PerformanceRecord[]> {
    if (USE_MEMORY_DB) {
      const records = memoryDB.performanceRecords.findByMonth(month);
      return Promise.all(records.map((r: PerformanceRecord) => this.enrichRecord(r)));
    }
    
    const sql = `
      SELECT 
        r.*,
        e.name as "employeeName",
        e.department,
        e.sub_department as "subDepartment",
        e.level as "employeeLevel",
        m.name as "assessorName"
      FROM performance_records r
      JOIN employees e ON r.employee_id = e.id
      JOIN employees m ON r.assessor_id = m.id
      WHERE r.month = ?
        AND (e.status = 'active' OR e.status IS NULL)
      ORDER BY r.total_score DESC
    `;
    const results = await query(sql, [month]);
    return results.map(this.formatRecord);
  }

  // 获取所有记录
  static async findAll(): Promise<PerformanceRecord[]> {
    if (USE_MEMORY_DB) {
      const allRecords = Array.from(memoryStore.performanceRecords.values()) as PerformanceRecord[];
      return Promise.all(allRecords.map(r => this.enrichRecord(r)));
    }
    
    const sql = `
      SELECT 
        r.*,
        e.name as "employeeName",
        e.department,
        e.sub_department as "subDepartment",
        e.level as "employeeLevel",
        m.name as "assessorName"
      FROM performance_records r
      JOIN employees e ON r.employee_id = e.id
      JOIN employees m ON r.assessor_id = m.id
      WHERE (e.status = 'active' OR e.status IS NULL)
      ORDER BY r.month DESC, r.total_score DESC
    `;
    const results = await query(sql, []);
    return results.map(this.formatRecord);
  }

  // 根据员工ID和月份查找记录
  static async findByEmployeeIdAndMonth(employeeId: string, month: string): Promise<PerformanceRecord | null> {
    if (USE_MEMORY_DB) {
      const record = memoryDB.performanceRecords.findAll().find(
        (r: PerformanceRecord) => r.employeeId === employeeId && r.month === month
      );
      return record ? this.enrichRecord(record) : null;
    }

    const sql = `
      SELECT
        r.*,
        e.name as "employeeName",
        e.department,
        e.sub_department as "subDepartment",
        e.level as "employeeLevel",
        m.name as "assessorName"
      FROM performance_records r
      JOIN employees e ON r.employee_id = e.id
      JOIN employees m ON r.assessor_id = m.id
      WHERE r.employee_id = ? AND r.month = ?
      LIMIT 1
    `;

    const results = await query(sql, [employeeId, month]);
    return results.length > 0 ? this.formatRecord(results[0]) : null;
  }

  // 更新记录（通用）
  static async update(id: string, data: Partial<PerformanceRecord>): Promise<PerformanceRecord | null> {
    if (USE_MEMORY_DB) {
      const updated = memoryDB.performanceRecords.update(id, {
        ...data,
        updatedAt: new Date()
      });
      return updated ? this.enrichRecord(updated) : null;
    }

    // 构建动态 SQL
    const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'createdAt' && k !== 'updatedAt');
    if (keys.length === 0) return this.findById(id);

    const snakeCaseKeys = keys.map(k => k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
    const setClause = snakeCaseKeys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => (data as any)[k]);
    
    // 注意：这里的 SQL 语法是 Postgres 的 ($1, $2...)，之前的是 ?
    // 如果之前的 query 函数处理了 ? -> $N 的转换，那这里也要保持一致。
    // 看之前的代码，用的是 ?。
    // 比如 `WHERE r.id = ?`
    // 所以这里应该用 ?
    
    const setClauseQuestion = snakeCaseKeys.map(k => `${k} = ?`).join(', ');

    const sql = `UPDATE performance_records SET ${setClauseQuestion}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await query(sql, [...values, id]);
    
    return this.findById(id);
  }

  // 创建或更新记录（员工提交工作总结）
  static async saveSummary(data: {
    id: string;
    employeeId: string;
    assessorId: string;
    month: string;
    selfSummary: string;
    nextMonthPlan: string;
    groupType: 'high' | 'low';
    deadline?: Date;
  }): Promise<PerformanceRecord> {
    // 根据内容判断状态：空总结为draft，有内容为submitted
    const status = data.selfSummary && data.selfSummary.length > 0 ? 'submitted' : 'draft';
    
    const record: PerformanceRecord = {
      id: data.id,
      employeeId: data.employeeId,
      assessorId: data.assessorId,
      month: data.month,
      selfSummary: data.selfSummary,
      nextMonthPlan: data.nextMonthPlan,
      taskCompletion: 1.0,
      initiative: 1.0,
      projectFeedback: 1.0,
      qualityImprovement: 1.0,
      totalScore: 0,
      managerComment: '',
      nextMonthWorkArrangement: '',
      groupType: data.groupType,
      groupRank: 0,
      crossDeptRank: 0,
      departmentRank: 0,
      companyRank: 0,
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (USE_MEMORY_DB) {
      memoryDB.performanceRecords.create(record);
      return this.enrichRecord(record);
    }
    
    const sql = `
      INSERT INTO performance_records (
        id, employee_id, assessor_id, month, self_summary, next_month_plan, 
        group_type, status, deadline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        self_summary = EXCLUDED.self_summary,
        next_month_plan = EXCLUDED.next_month_plan,
        status = EXCLUDED.status,
        deadline = COALESCE(performance_records.deadline, EXCLUDED.deadline),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await query(sql, [
      data.id,
      data.employeeId,
      data.assessorId,
      data.month,
      data.selfSummary,
      data.nextMonthPlan,
      data.groupType,
      status,
      data.deadline || null
    ]);
    
    return this.findById(data.id) as Promise<PerformanceRecord>;
  }

  // 经理评分
  static async submitScore(data: {
    id: string;
    taskCompletion: number;
    initiative: number;
    projectFeedback: number;
    qualityImprovement: number;
    totalScore: number;
    level?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
    managerComment: string;
    nextMonthWorkArrangement: string;
    normalizedScore?: number;
  }): Promise<PerformanceRecord | null> {
    if (USE_MEMORY_DB) {
      const record = memoryDB.performanceRecords.findById(data.id);
      if (!record) return null;
      
      const updated = memoryDB.performanceRecords.update(data.id, {
        ...data,
        status: 'completed',
        updatedAt: new Date()
      });
      
      if (updated) {
        await this.updateRanks(updated.month);
      }
      
      return updated ? this.enrichRecord(updated) : null;
    }
    
    const sql = `
      UPDATE performance_records SET
        task_completion = ?,
        initiative = ?,
        project_feedback = ?,
        quality_improvement = ?,
        total_score = ?,
        level = ?,
        manager_comment = ?,
        next_month_work_arrangement = ?,
        normalized_score = ?,
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await query(sql, [
      data.taskCompletion,
      data.initiative,
      data.projectFeedback,
      data.qualityImprovement,
      data.totalScore,
      data.level || 'L3',
      data.managerComment,
      data.nextMonthWorkArrangement,
      data.normalizedScore || data.totalScore,
      data.id
    ]);
    
    const record = await this.findById(data.id);
    if (record) {
      await this.updateRanks(record.month);
    }
    
    return record;
  }

  // 更新排名
  static async updateRanks(month: string): Promise<void> {
    const config = await getPerformanceRankingConfig();
    const records = await this.findByMonth(month);
    const completed = records.filter((r) => r.status === 'completed');

    // 仅参与部门纳入排名
    const participating = completed.filter((r) => isParticipatingRecord(r, config));

    const sortByScore = (a: PerformanceRecord, b: PerformanceRecord): number => {
      const scoreDiff = (b.totalScore || 0) - (a.totalScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return String(a.employeeId || a.id).localeCompare(String(b.employeeId || b.id));
    };

    // 公司排名
    const companySorted = [...participating].sort(sortByScore);
    const companyRankMap = new Map<string, number>();
    companySorted.forEach((r, idx) => companyRankMap.set(r.id, idx + 1));

    // 部门排名（按“组织单元”统计：优先 department/subDepartment）
    const unitGroups = new Map<string, PerformanceRecord[]>();
    for (const r of participating) {
      const unitKey = getOrgUnitKey(r);
      if (!unitGroups.has(unitKey)) unitGroups.set(unitKey, []);
      unitGroups.get(unitKey)!.push(r);
    }
    const departmentRankMap = new Map<string, number>();
    for (const groupRecords of unitGroups.values()) {
      groupRecords.sort(sortByScore).forEach((r, idx) => departmentRankMap.set(r.id, idx + 1));
    }

    // 组内排名（单位 + 可配置等级分组）
    const rankGroups = new Map<string, PerformanceRecord[]>();
    for (const r of participating) {
      const groupKey = resolveGroupKey(r, config);
      if (!rankGroups.has(groupKey)) rankGroups.set(groupKey, []);
      rankGroups.get(groupKey)!.push(r);
    }
    const groupRankMap = new Map<string, number>();
    for (const groupRecords of rankGroups.values()) {
      groupRecords.sort(sortByScore).forEach((r, idx) => groupRankMap.set(r.id, idx + 1));
    }

    // 合并排名（跨部门/等级可选）
    const mergeGroups = new Map<string, PerformanceRecord[]>();
    for (const r of participating) {
      const merge = matchMergeRankGroup(r, config);
      if (!merge) continue;
      if (!mergeGroups.has(merge.id)) mergeGroups.set(merge.id, []);
      mergeGroups.get(merge.id)!.push(r);
    }
    const crossDeptRankMap = new Map<string, number>();
    for (const groupRecords of mergeGroups.values()) {
      groupRecords.sort(sortByScore).forEach((r, idx) => crossDeptRankMap.set(r.id, idx + 1));
    }

    // 将排名结果写回（未参与部门/未命中合并分组 => rank=0）
    for (const r of completed) {
      const isIncluded = companyRankMap.has(r.id);
      await this.update(r.id, {
        companyRank: isIncluded ? (companyRankMap.get(r.id) || 0) : 0,
        departmentRank: isIncluded ? (departmentRankMap.get(r.id) || 0) : 0,
        groupRank: isIncluded ? (groupRankMap.get(r.id) || 0) : 0,
        crossDeptRank: isIncluded ? (crossDeptRankMap.get(r.id) || 0) : 0,
      });
    }
  }

  // 删除记录
  static async delete(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      return memoryDB.performanceRecords.delete(id);
    }
    
    const sql = 'DELETE FROM performance_records WHERE id = ?';
    const result = await query(sql, [id]) as unknown as { affectedRows: number };
    return result.affectedRows > 0;
  }

  // 按月份删除记录（返回删除数量）
  static async deleteByMonth(month: string): Promise<number> {
    if (USE_MEMORY_DB) {
      const idsToDelete: string[] = [];
      for (const [id, record] of memoryStore.performanceRecords.entries()) {
        if (record.month === month) idsToDelete.push(id);
      }
      idsToDelete.forEach((id) => memoryStore.performanceRecords.delete(id));
      return idsToDelete.length;
    }

    const sql = 'DELETE FROM performance_records WHERE month = ?';
    const result = await query(sql, [month]) as unknown as { affectedRows: number };
    return result.affectedRows || 0;
  }

  // 删除全部记录（返回删除数量）
  static async deleteAll(): Promise<number> {
    if (USE_MEMORY_DB) {
      const count = memoryStore.performanceRecords.size;
      memoryStore.performanceRecords.clear();
      return count;
    }

    const sql = 'DELETE FROM performance_records';
    const result = await query(sql, []) as unknown as { affectedRows: number };
    return result.affectedRows || 0;
  }

  // 丰富记录（添加员工信息）
  private static async enrichRecord(record: PerformanceRecord): Promise<PerformanceRecord> {
    const employee = await EmployeeModel.findById(record.employeeId);
    const assessor = await EmployeeModel.findById(record.assessorId);
    
    return {
      ...record,
      employeeName: employee?.name || '',
      department: employee?.department || '',
      subDepartment: employee?.subDepartment || '',
      employeeLevel: employee?.level,
      assessorName: assessor?.name || ''
    };
  }

  // 格式化记录（转换字段名）
  private static formatRecord(row: any): PerformanceRecord {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employeeName,
      department: row.department,
      subDepartment: row.subDepartment || row.sub_department,
      employeeLevel: row.employeeLevel || row.level,
      assessorId: row.assessor_id,
      assessorName: row.assessorName,
      month: row.month,
      selfSummary: row.self_summary,
      nextMonthPlan: row.next_month_plan,
      taskCompletion: parseFloat(row.task_completion),
      initiative: parseFloat(row.initiative),
      projectFeedback: parseFloat(row.project_feedback),
      qualityImprovement: parseFloat(row.quality_improvement),
      totalScore: parseFloat(row.total_score),
      level: row.level || undefined,
      normalizedScore: row.normalized_score ? parseFloat(row.normalized_score) : undefined,
      managerComment: row.manager_comment,
      nextMonthWorkArrangement: row.next_month_work_arrangement,
      groupType: row.group_type,
      groupRank: row.group_rank,
      crossDeptRank: row.cross_dept_rank,
      departmentRank: row.department_rank,
      companyRank: row.company_rank,
      status: row.status,
      frozen: row.frozen,
      deadline: row.deadline,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
