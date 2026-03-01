import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface MonthlyAssessmentScore {
  metricName: string;
  metricCode: string;
  weight: number;
  level: string;
  score: number;
  comment?: string;
}

export interface MonthlyAssessment {
  id: string;
  employeeId: string;
  employeeName?: string;
  month: string;  // YYYY-MM
  templateId: string;
  templateName: string;
  departmentType: string;
  scores: MonthlyAssessmentScore[];
  totalScore: number;
  evaluatorId: string;
  evaluatorName: string;
  createdAt: string;
  updatedAt: string;
}

export class MonthlyAssessmentModel {
  /**
   * 创建月度评分
   */
  static async create(data: Omit<MonthlyAssessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<MonthlyAssessment> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const assessment: MonthlyAssessment = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };
      
      if (USE_MEMORY_DB) {
        if (!memoryStore.monthlyAssessments) {
          (memoryStore as any).monthlyAssessments = new Map();
        }
        memoryStore.monthlyAssessments!.set(id, assessment);
        return assessment;
      }
      
      const sql = `
        INSERT INTO monthly_assessments (
          id, employee_id, month, template_id, template_name, 
          department_type, scores, total_score, evaluator_id, 
          evaluator_name, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const results = await query(sql, [
        id,
        data.employeeId,
        data.month,
        data.templateId,
        data.templateName,
        data.departmentType,
        JSON.stringify(data.scores),
        data.totalScore,
        data.evaluatorId,
        data.evaluatorName,
        now,
        now
      ]);
      
      return this.mapAssessment(results[0]);
    } catch (error) {
      logger.error('Failed to create monthly assessment: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 根据员工和月份查询
   */
  static async findByEmployeeAndMonth(employeeId: string, month: string): Promise<MonthlyAssessment | null> {
    try {
      if (USE_MEMORY_DB) {
        if (!memoryStore.monthlyAssessments) return null;
        
        const assessments = Array.from(memoryStore.monthlyAssessments.values());
        const found = assessments.find(
          (a: any) => a.employeeId === employeeId && a.month === month
        );
        return found || null;
      }
      
      const sql = `
        SELECT * FROM monthly_assessments 
        WHERE employee_id = $1 AND month = $2
        LIMIT 1
      `;
      
      const results = await query(sql, [employeeId, month]);
      return results.length > 0 ? this.mapAssessment(results[0]) : null;
    } catch (error) {
      logger.error('Failed to find assessment: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 更新评分
   */
  static async update(id: string, data: Partial<MonthlyAssessment>): Promise<MonthlyAssessment | null> {
    try {
      const now = new Date().toISOString();
      
      if (USE_MEMORY_DB) {
        if (!memoryStore.monthlyAssessments) return null;
        
        const existing = memoryStore.monthlyAssessments.get(id);
        if (!existing) return null;
        
        const updated = { ...existing, ...data, updatedAt: now };
        memoryStore.monthlyAssessments.set(id, updated);
        return updated;
      }
      
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (data.scores !== undefined) {
        updates.push(`scores = $${paramIndex++}`);
        params.push(JSON.stringify(data.scores));
      }
      
      if (data.totalScore !== undefined) {
        updates.push(`total_score = $${paramIndex++}`);
        params.push(data.totalScore);
      }
      
      if (updates.length === 0) return null;
      
      updates.push(`updated_at = $${paramIndex++}`);
      params.push(now);
      
      params.push(id);
      
      const sql = `
        UPDATE monthly_assessments 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const results = await query(sql, params);
      return results.length > 0 ? this.mapAssessment(results[0]) : null;
    } catch (error) {
      logger.error('Failed to update assessment: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 获取员工的所有评分记录
   */
  static async findByEmployee(employeeId: string): Promise<MonthlyAssessment[]> {
    try {
      if (USE_MEMORY_DB) {
        if (!memoryStore.monthlyAssessments) return [];
        
        const assessments = Array.from(memoryStore.monthlyAssessments.values());
        return assessments.filter((a: any) => a.employeeId === employeeId);
      }
      
      const sql = `
        SELECT * FROM monthly_assessments 
        WHERE employee_id = $1
        ORDER BY month DESC
      `;
      
      const results = await query(sql, [employeeId]);
      return results.map(this.mapAssessment);
    } catch (error) {
      logger.error('Failed to find assessments: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  private static mapAssessment(row: any): MonthlyAssessment {
    return {
      id: row.id,
      employeeId: row.employee_id || row.employeeId,
      employeeName: row.employee_name || row.employeeName,
      month: row.month,
      templateId: row.template_id || row.templateId,
      templateName: row.template_name || row.templateName,
      departmentType: row.department_type || row.departmentType,
      scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores,
      totalScore: parseFloat(row.total_score || row.totalScore),
      evaluatorId: row.evaluator_id || row.evaluatorId,
      evaluatorName: row.evaluator_name || row.evaluatorName,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }
}
