import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface TemplateMetric {
  id: string;
  templateId: string;
  metricName: string;
  metricCode: string;
  category: string;
  weight: number;
  description?: string;
  evaluationType: 'quantitative' | 'qualitative';
  targetValue?: number;
  measurementUnit?: string;
  sortOrder: number;
  scoringCriteria?: ScoringCriterion[];
}

export interface ScoringCriterion {
  id: string;
  metricId: string;
  level: string;  // L1-L5
  score: number;  // 0.5-1.5
  description: string;
  minValue?: number;
  maxValue?: number;
}

export interface AssessmentTemplate {
  id: string;
  name: string;
  description?: string;
  departmentType: 'sales' | 'engineering' | 'manufacturing' | 'support' | 'management';
  isDefault: boolean;
  status: 'active' | 'archived';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  metrics?: TemplateMetric[];
}

export class AssessmentTemplateModel {
  // ==================== 模板管理 ====================
  
  /**
   * 获取所有模板
   */
  static async findAll(filters?: {
    departmentType?: string;
    status?: string;
    includeMetrics?: boolean;
  }): Promise<AssessmentTemplate[]> {
    try {
      // Memory DB support
      if (USE_MEMORY_DB) {
        let templates = Array.from(memoryStore.assessmentTemplates?.values() || []);
        
        if (filters?.departmentType) {
          templates = templates.filter(t => t.department_type === filters.departmentType);
        }
        
        if (filters?.status) {
          templates = templates.filter(t => t.status === filters.status);
        }
        
        templates.sort((a, b) => {
          if (a.department_type !== b.department_type) {
            return a.department_type.localeCompare(b.department_type);
          }
          if (a.is_default !== b.is_default) {
            return a.is_default ? -1 : 1;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        const result = templates.map(this.mapTemplate);
        
        if (filters?.includeMetrics) {
          for (const template of result) {
            template.metrics = await this.getTemplateMetrics(template.id);
          }
        }
        
        return result;
      }
      
      // PostgreSQL
      let sql = 'SELECT * FROM assessment_templates WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.departmentType) {
        sql += ' AND department_type = $' + (params.length + 1);
        params.push(filters.departmentType);
      }
      
      if (filters?.status) {
        sql += ' AND status = $' + (params.length + 1);
        params.push(filters.status);
      }
      
      sql += ' ORDER BY department_type, is_default DESC, created_at DESC';
      
      const templates = await query(sql, params);
      
      if (filters?.includeMetrics) {
        for (const template of templates) {
          template.metrics = await this.getTemplateMetrics(template.id);
        }
      }
      
      return templates.map(this.mapTemplate);
    } catch (error) {
      logger.error('Failed to find all templates: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 根据ID获取模板
   */
  static async findById(id: string, includeMetrics = true): Promise<AssessmentTemplate | null> {
    try {
      // Memory DB support
      if (USE_MEMORY_DB) {
        const templateData = memoryStore.assessmentTemplates?.get(id);
        if (!templateData) return null;
        
        const template = this.mapTemplate(templateData);
        
        if (includeMetrics) {
          template.metrics = await this.getTemplateMetrics(id);
        }
        
        return template;
      }
      
      // PostgreSQL
      const sql = 'SELECT * FROM assessment_templates WHERE id = $1';
      const results = await query(sql, [id]);
      
      if (results.length === 0) return null;
      
      const template = this.mapTemplate(results[0]);
      
      if (includeMetrics) {
        template.metrics = await this.getTemplateMetrics(id);
      }
      
      return template;
    } catch (error) {
      logger.error('Failed to find template by id: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 根据部门类型获取默认模板
   */
  static async getDefaultTemplate(departmentType: string): Promise<AssessmentTemplate | null> {
    try {
      // Memory DB support
      if (USE_MEMORY_DB) {
        const templates = Array.from(memoryStore.assessmentTemplates?.values() || []);
        const defaultTemplate = templates.find(
          t => t.department_type === departmentType && t.is_default === true && t.status === 'active'
        );
        
        if (!defaultTemplate) return null;
        
        const template = this.mapTemplate(defaultTemplate);
        template.metrics = await this.getTemplateMetrics(template.id);
        
        return template;
      }
      
      // PostgreSQL
      const sql = `
        SELECT * FROM assessment_templates 
        WHERE department_type = $1 AND is_default = true AND status = 'active'
        LIMIT 1
      `;
      const results = await query(sql, [departmentType]);
      
      if (results.length === 0) return null;
      
      const template = this.mapTemplate(results[0]);
      template.metrics = await this.getTemplateMetrics(template.id);
      
      return template;
    } catch (error) {
      logger.error('Failed to get default template: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 创建模板
   */
  static async create(data: Omit<AssessmentTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssessmentTemplate> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const sql = `
        INSERT INTO assessment_templates (
          id, name, description, department_type, is_default, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const results = await query(sql, [
        id,
        data.name,
        data.description || null,
        data.departmentType,
        data.isDefault || false,
        data.status || 'active',
        data.createdBy || null,
        now,
        now
      ]);
      
      return this.mapTemplate(results[0]);
    } catch (error) {
      logger.error('Failed to create template: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 更新模板
   */
  static async update(id: string, data: Partial<AssessmentTemplate>): Promise<AssessmentTemplate | null> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(data.name);
      }
      
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(data.description);
      }
      
      if (data.isDefault !== undefined) {
        updates.push(`is_default = $${paramIndex++}`);
        params.push(data.isDefault);
      }
      
      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        params.push(data.status);
      }
      
      if (updates.length === 0) return this.findById(id, false);
      
      updates.push(`updated_at = $${paramIndex++}`);
      params.push(new Date().toISOString());
      
      params.push(id);
      
      const sql = `
        UPDATE assessment_templates 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const results = await query(sql, params);
      return results.length > 0 ? this.mapTemplate(results[0]) : null;
    } catch (error) {
      logger.error('Failed to update template: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 删除模板
   */
  static async delete(id: string): Promise<boolean> {
    try {
      const sql = 'DELETE FROM assessment_templates WHERE id = $1';
      await query(sql, [id]);
      return true;
    } catch (error) {
      logger.error('Failed to delete template: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  // ==================== 指标管理 ====================
  
  /**
   * 获取模板的所有指标
   */
  static async getTemplateMetrics(templateId: string): Promise<TemplateMetric[]> {
    try {
      // Memory DB support
      if (USE_MEMORY_DB) {
        const allMetrics = Array.from(memoryStore.templateMetrics?.values() || []);
        const metrics = allMetrics
          .filter(m => m.template_id === templateId)
          .sort((a, b) => a.sort_order - b.sort_order);
        
        const result: TemplateMetric[] = [];
        for (const metric of metrics) {
          const mappedMetric = this.mapMetric(metric);
          mappedMetric.scoringCriteria = await this.getScoringCriteria(metric.id);
          result.push(mappedMetric);
        }
        
        return result;
      }
      
      // PostgreSQL
      const sql = `
        SELECT * FROM template_metrics 
        WHERE template_id = $1 
        ORDER BY sort_order ASC
      `;
      const metrics = await query(sql, [templateId]);
      
      const result: TemplateMetric[] = [];
      for (const metric of metrics) {
        const mappedMetric = this.mapMetric(metric);
        mappedMetric.scoringCriteria = await this.getScoringCriteria(metric.id);
        result.push(mappedMetric);
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to get template metrics: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 添加指标到模板
   */
  static async addMetric(data: Omit<TemplateMetric, 'id' | 'scoringCriteria'>): Promise<TemplateMetric> {
    try {
      const id = uuidv4();
      
      const sql = `
        INSERT INTO template_metrics (
          id, template_id, metric_name, metric_code, category, weight, 
          description, evaluation_type, target_value, measurement_unit, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const results = await query(sql, [
        id,
        data.templateId,
        data.metricName,
        data.metricCode,
        data.category,
        data.weight,
        data.description || null,
        data.evaluationType,
        data.targetValue || null,
        data.measurementUnit || null,
        data.sortOrder || 0
      ]);
      
      return this.mapMetric(results[0]);
    } catch (error) {
      logger.error('Failed to add metric: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 更新指标
   */
  static async updateMetric(id: string, data: Partial<TemplateMetric>): Promise<TemplateMetric | null> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (data.metricName !== undefined) {
        updates.push(`metric_name = $${paramIndex++}`);
        params.push(data.metricName);
      }
      
      if (data.weight !== undefined) {
        updates.push(`weight = $${paramIndex++}`);
        params.push(data.weight);
      }
      
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(data.description);
      }
      
      if (data.sortOrder !== undefined) {
        updates.push(`sort_order = $${paramIndex++}`);
        params.push(data.sortOrder);
      }
      
      if (updates.length === 0) return null;
      
      params.push(id);
      
      const sql = `
        UPDATE template_metrics 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const results = await query(sql, params);
      return results.length > 0 ? this.mapMetric(results[0]) : null;
    } catch (error) {
      logger.error('Failed to update metric: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 删除指标
   */
  static async deleteMetric(id: string): Promise<boolean> {
    try {
      const sql = 'DELETE FROM template_metrics WHERE id = $1';
      await query(sql, [id]);
      return true;
    } catch (error) {
      logger.error('Failed to delete metric: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  // ==================== 评分标准管理 ====================
  
  /**
   * 获取指标的评分标准
   */
  static async getScoringCriteria(metricId: string): Promise<ScoringCriterion[]> {
    try {
      const sql = `
        SELECT * FROM metric_scoring_criteria 
        WHERE metric_id = $1 
        ORDER BY score ASC
      `;
      const results = await query(sql, [metricId]);
      return results.map(this.mapScoringCriterion);
    } catch (error) {
      logger.error('Failed to get scoring criteria: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  /**
   * 批量添加评分标准
   */
  static async addScoringCriteria(metricId: string, criteria: Omit<ScoringCriterion, 'id' | 'metricId'>[]): Promise<ScoringCriterion[]> {
    try {
      const results: ScoringCriterion[] = [];
      
      for (const criterion of criteria) {
        const id = uuidv4();
        const sql = `
          INSERT INTO metric_scoring_criteria (
            id, metric_id, level, score, description, min_value, max_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const result = await query(sql, [
          id,
          metricId,
          criterion.level,
          criterion.score,
          criterion.description,
          criterion.minValue || null,
          criterion.maxValue || null
        ]);
        
        results.push(this.mapScoringCriterion(result[0]));
      }
      
      return results;
    } catch (error) {
      logger.error('Failed to add scoring criteria: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  // ==================== 辅助方法 ====================
  
  private static mapTemplate(row: any): AssessmentTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      departmentType: row.department_type,
      isDefault: row.is_default,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private static mapMetric(row: any): TemplateMetric {
    return {
      id: row.id,
      templateId: row.template_id,
      metricName: row.metric_name,
      metricCode: row.metric_code,
      category: row.category,
      weight: parseFloat(row.weight),
      description: row.description,
      evaluationType: row.evaluation_type,
      targetValue: row.target_value ? parseFloat(row.target_value) : undefined,
      measurementUnit: row.measurement_unit,
      sortOrder: row.sort_order
    };
  }
  
  private static mapScoringCriterion(row: any): ScoringCriterion {
    return {
      id: row.id,
      metricId: row.metric_id,
      level: row.level,
      score: parseFloat(row.score),
      description: row.description,
      minValue: row.min_value ? parseFloat(row.min_value) : undefined,
      maxValue: row.max_value ? parseFloat(row.max_value) : undefined
    };
  }
}
