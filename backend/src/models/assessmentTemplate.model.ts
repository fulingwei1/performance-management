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
  // 模板适用规则：岗位/层级/角色
  applicableRoles?: string[];      // ['employee', 'manager', 'gm']
  applicableLevels?: string[];     // ['senior', 'intermediate', 'junior', 'assistant']
  applicablePositions?: string[];  // 具体岗位名称列表
  priority?: number;               // 匹配优先级，数值越大优先级越高
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

      const result = templates.map(this.mapTemplate);

      if (filters?.includeMetrics) {
        for (const template of result) {
          template.metrics = await this.getTemplateMetrics(template.id);
        }
      }

      return result;
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

      if (data.departmentType !== undefined) {
        updates.push(`department_type = $${paramIndex++}`);
        params.push(data.departmentType);
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

      if (data.metricCode !== undefined) {
        updates.push(`metric_code = $${paramIndex++}`);
        params.push(data.metricCode);
      }

      if (data.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        params.push(data.category);
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

      if (data.evaluationType !== undefined) {
        updates.push(`evaluation_type = $${paramIndex++}`);
        params.push(data.evaluationType);
      }

      if (data.targetValue !== undefined) {
        updates.push(`target_value = $${paramIndex++}`);
        params.push(data.targetValue);
      }

      if (data.measurementUnit !== undefined) {
        updates.push(`measurement_unit = $${paramIndex++}`);
        params.push(data.measurementUnit);
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

  static async findMetricById(id: string): Promise<TemplateMetric | null> {
    try {
      if (USE_MEMORY_DB) {
        const metric = memoryStore.templateMetrics?.get(id);
        return metric ? this.mapMetric(metric) : null;
      }

      const sql = 'SELECT * FROM template_metrics WHERE id = $1';
      const results = await query(sql, [id]);
      return results.length > 0 ? this.mapMetric(results[0]) : null;
    } catch (error) {
      logger.error('Failed to find metric by id: ' + (error instanceof Error ? error.message : String(error)));
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
    const base = {
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
    // 解析新增字段（JSON 字符串或原生数组）
    const parseArray = (v: any) => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return undefined; }
      }
      return undefined;
    };
    return {
      ...base,
      applicableRoles: parseArray(row.applicable_roles),
      applicableLevels: parseArray(row.applicable_levels),
      applicablePositions: parseArray(row.applicable_positions),
      priority: row.priority != null ? Number(row.priority) : undefined
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

  // ==================== 模板匹配 ====================

  /**
   * 根据员工信息匹配最佳模板
   * 匹配优先级：岗位+层级(100) > 岗位(80) > 层级(60) > 角色(40) > 部门类型(20)
   */
  static async findMatchingTemplate(employee: {
    role?: string;
    level?: string;
    position?: string;
    department?: string;
  }): Promise<AssessmentTemplate | null> {
    try {
      const templates = await this.findAll({ status: 'active', includeMetrics: false });
      if (!templates.length) return null;

      const scored = templates
        .map(t => {
          let score = 0;
          const roles = t.applicableRoles || [];
          const levels = t.applicableLevels || [];
          const positions = t.applicablePositions || [];

          // 岗位精确匹配
          if (employee.position && positions.length > 0) {
            if (positions.includes(employee.position)) {
              score += 80;
              // 岗位 + 层级同时匹配
              if (employee.level && levels.includes(employee.level)) {
                score += 20;
              }
            }
          } else if (employee.level && levels.length > 0) {
            // 仅层级匹配
            if (levels.includes(employee.level)) {
              score += 60;
            }
          }

          // 角色匹配
          if (employee.role && roles.length > 0 && roles.includes(employee.role)) {
            score += 40;
          }

          // 部门类型兜底
          if (score === 0 && this.getDepartmentType(employee.department) === t.departmentType) {
            score = 20;
          }

          // 默认模板额外加分
          if (t.isDefault && score > 0) score += 5;

          // 自定义优先级
          if (t.priority) score += t.priority;

          return { template: t, score };
        })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

      return scored.length > 0 ? scored[0].template : null;
    } catch (error) {
      logger.error('Failed to find matching template: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 获取所有员工的模板分配方案
   */
  static async getTemplateAssignments(employees: Array<{
    id: string;
    name: string;
    role?: string;
    level?: string;
    position?: string;
    department?: string;
  }>): Promise<Array<{
    employee: typeof employees[0];
    template: AssessmentTemplate | null;
    matchScore: number;
    matchReason: string;
  }>> {
    const templates = await this.findAll({ status: 'active', includeMetrics: false });

    return employees.map(emp => {
      const scored = templates
        .map(t => {
          let score = 0;
          let reasons: string[] = [];
          const roles = t.applicableRoles || [];
          const levels = t.applicableLevels || [];
          const positions = t.applicablePositions || [];

          if (emp.position && positions.includes(emp.position)) {
            score += 80;
            reasons.push(`岗位匹配: ${emp.position}`);
            if (emp.level && levels.includes(emp.level)) {
              score += 20;
              reasons.push(`层级匹配: ${emp.level}`);
            }
          } else if (emp.level && levels.includes(emp.level)) {
            score += 60;
            reasons.push(`层级匹配: ${emp.level}`);
          }

          if (emp.role && roles.includes(emp.role)) {
            score += 40;
            reasons.push(`角色匹配: ${emp.role}`);
          }

          if (score === 0 && this.getDepartmentType(emp.department) === t.departmentType) {
            score = 20;
            reasons.push(`部门类型兜底: ${t.departmentType}`);
          }

          if (t.isDefault && score > 0) {
            score += 5;
            reasons.push('默认模板');
          }

          if (t.priority) {
            score += t.priority;
            reasons.push(`优先级+${t.priority}`);
          }

          return { template: t, score, reasons };
        })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      return {
        employee: emp,
        template: best ? best.template : null,
        matchScore: best ? best.score : 0,
        matchReason: best ? best.reasons.join(', ') : '无匹配模板'
      };
    });
  }

  private static getDepartmentType(department?: string): string {
    if (!department) return 'support';
    const name = department.toLowerCase();
    if (name.includes('营销') || name.includes('销售')) return 'sales';
    if (name.includes('工程') || name.includes('技术') || name.includes('研发')) return 'engineering';
    if (name.includes('制造') || name.includes('生产') || name.includes('品质')) return 'manufacturing';
    if (name.includes('总') || name.includes('管理')) return 'management';
    return 'support';
  }
}
