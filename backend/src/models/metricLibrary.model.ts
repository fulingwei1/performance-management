import { query, memoryDB, USE_MEMORY_DB, memoryStore } from '../config/database';
import { PerformanceMetric, MetricTemplate, ScoringCriterion, EmployeeLevel } from '../types';

export class MetricLibraryModel {
  // ============ 指标管理 ============
  
  // 获取所有指标
  static async findAllMetrics(): Promise<PerformanceMetric[]> {
    if (USE_MEMORY_DB) {
      return Array.from(memoryStore.performanceMetrics?.values() || []) as PerformanceMetric[];
    }
    
    const sql = `
      SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT md.department_id) as departmentIds,
        GROUP_CONCAT(DISTINCT mp.position_id) as positionIds,
        GROUP_CONCAT(DISTINCT ml.level) as applicableLevels
      FROM performance_metrics m
      LEFT JOIN metric_departments md ON m.id = md.metric_id
      LEFT JOIN metric_positions mp ON m.id = mp.metric_id
      LEFT JOIN metric_levels ml ON m.id = ml.metric_id
      GROUP BY m.id
      ORDER BY m.category, m.name
    `;
    const results = await query(sql);
    return results.map(this.formatMetric);
  }
  
  // 根据ID获取指标
  static async findMetricById(id: string): Promise<PerformanceMetric | null> {
    if (USE_MEMORY_DB) {
      return memoryStore.performanceMetrics?.get(id) as PerformanceMetric || null;
    }
    
    const sql = `
      SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT md.department_id) as departmentIds,
        GROUP_CONCAT(DISTINCT mp.position_id) as positionIds,
        GROUP_CONCAT(DISTINCT ml.level) as applicableLevels
      FROM performance_metrics m
      LEFT JOIN metric_departments md ON m.id = md.metric_id
      LEFT JOIN metric_positions mp ON m.id = mp.metric_id
      LEFT JOIN metric_levels ml ON m.id = ml.metric_id
      WHERE m.id = ?
      GROUP BY m.id
    `;
    const results = await query(sql, [id]);
    return results.length > 0 ? this.formatMetric(results[0]) : null;
  }
  
  // 根据分类获取指标
  static async findMetricsByCategory(category: string): Promise<PerformanceMetric[]> {
    if (USE_MEMORY_DB) {
      return (Array.from(memoryStore.performanceMetrics?.values() || []) as PerformanceMetric[])
        .filter(m => m.category === category);
    }
    
    const sql = `
      SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT md.department_id) as departmentIds,
        GROUP_CONCAT(DISTINCT mp.position_id) as positionIds,
        GROUP_CONCAT(DISTINCT ml.level) as applicableLevels
      FROM performance_metrics m
      LEFT JOIN metric_departments md ON m.id = md.metric_id
      LEFT JOIN metric_positions mp ON m.id = mp.metric_id
      LEFT JOIN metric_levels ml ON m.id = ml.metric_id
      WHERE m.category = ?
      GROUP BY m.id
      ORDER BY m.name
    `;
    const results = await query(sql, [category]);
    return results.map(this.formatMetric);
  }
  
  // 创建指标
  static async createMetric(metric: Omit<PerformanceMetric, 'createdAt' | 'updatedAt'>): Promise<PerformanceMetric> {
    const now = new Date().toISOString();
    const newMetric: PerformanceMetric = { ...metric, createdAt: now, updatedAt: now };
    
    if (USE_MEMORY_DB) {
      if (!memoryStore.performanceMetrics) memoryStore.performanceMetrics = new Map();
      memoryStore.performanceMetrics.set(metric.id, newMetric);
      return newMetric;
    }
    
    const sql = `
      INSERT INTO performance_metrics (
        id, name, code, category, type, description, weight,
        formula, unit, target_value, min_value, max_value,
        data_source, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      metric.id, metric.name, metric.code, metric.category, metric.type,
      metric.description, metric.weight, metric.formula || null,
      metric.unit || null, metric.targetValue || null,
      metric.minValue, metric.maxValue, metric.dataSource || null,
      metric.status
    ]);
    
    // 插入评分标准
    if (metric.scoringCriteria && metric.scoringCriteria.length > 0) {
      for (const criterion of metric.scoringCriteria) {
        await query(
          'INSERT INTO scoring_criteria (id, metric_id, level, score, description) VALUES (?, ?, ?, ?, ?)',
          [`${metric.id}-${criterion.level}`, metric.id, criterion.level, criterion.score, criterion.description]
        );
      }
    }
    
    // 插入适用部门
    if (metric.departmentIds && metric.departmentIds.length > 0) {
      for (const deptId of metric.departmentIds) {
        await query(
          'INSERT INTO metric_departments (metric_id, department_id) VALUES (?, ?)',
          [metric.id, deptId]
        );
      }
    }
    
    // 插入适用岗位
    if (metric.positionIds && metric.positionIds.length > 0) {
      for (const posId of metric.positionIds) {
        await query(
          'INSERT INTO metric_positions (metric_id, position_id) VALUES (?, ?)',
          [metric.id, posId]
        );
      }
    }
    
    // 插入适用级别
    if (metric.applicableLevels && metric.applicableLevels.length > 0) {
      for (const level of metric.applicableLevels) {
        await query(
          'INSERT INTO metric_levels (metric_id, level) VALUES (?, ?)',
          [metric.id, level]
        );
      }
    }
    
    return newMetric;
  }
  
  // 更新指标
  static async updateMetric(id: string, updates: Partial<PerformanceMetric>): Promise<PerformanceMetric | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.performanceMetrics?.get(id) as PerformanceMetric;
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      memoryStore.performanceMetrics?.set(id, updated);
      return updated;
    }
    
    const allowedFields = [
      'name', 'code', 'category', 'type', 'description', 'weight',
      'formula', 'unit', 'target_value', 'min_value', 'max_value',
      'data_source', 'status'
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
    
    if (fields.length > 0) {
      const sql = `UPDATE performance_metrics SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      values.push(id);
      await query(sql, values);
    }
    
    // 更新关联表
    if (updates.departmentIds) {
      await query('DELETE FROM metric_departments WHERE metric_id = ?', [id]);
      for (const deptId of updates.departmentIds) {
        await query('INSERT INTO metric_departments (metric_id, department_id) VALUES (?, ?)', [id, deptId]);
      }
    }
    
    if (updates.positionIds) {
      await query('DELETE FROM metric_positions WHERE metric_id = ?', [id]);
      for (const posId of updates.positionIds) {
        await query('INSERT INTO metric_positions (metric_id, position_id) VALUES (?, ?)', [id, posId]);
      }
    }
    
    if (updates.applicableLevels) {
      await query('DELETE FROM metric_levels WHERE metric_id = ?', [id]);
      for (const level of updates.applicableLevels) {
        await query('INSERT INTO metric_levels (metric_id, level) VALUES (?, ?)', [id, level]);
      }
    }
    
    return this.findMetricById(id);
  }
  
  // 删除指标
  static async deleteMetric(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      return memoryStore.performanceMetrics?.delete(id) || false;
    }
    
    // 先删除关联表数据
    await query('DELETE FROM scoring_criteria WHERE metric_id = ?', [id]);
    await query('DELETE FROM metric_departments WHERE metric_id = ?', [id]);
    await query('DELETE FROM metric_positions WHERE metric_id = ?', [id]);
    await query('DELETE FROM metric_levels WHERE metric_id = ?', [id]);
    
    const sql = 'DELETE FROM performance_metrics WHERE id = ?';
    const result = await query(sql, [id]) as unknown as { affectedRows: number };
    return result.affectedRows > 0;
  }
  
  // ============ 指标模板管理 ============
  
  // 获取所有模板
  static async findAllTemplates(): Promise<MetricTemplate[]> {
    if (USE_MEMORY_DB) {
      return Array.from(memoryStore.metricTemplates?.values() || []) as MetricTemplate[];
    }
    
    const sql = `
      SELECT 
        t.*,
        p.name as positionName,
        STRING_AGG(CONCAT(tm.metric_id, ':', tm.weight, ':', tm.required), ',') as metrics
      FROM metric_templates t
      LEFT JOIN positions p ON t.position_id = p.id
      LEFT JOIN template_metrics tm ON t.id = tm.template_id
      GROUP BY t.id
      ORDER BY t.name
    `;
    const results = await query(sql);
    return results.map(this.formatTemplate);
  }
  
  // 根据岗位获取模板
  static async findTemplateByPosition(positionId: string): Promise<MetricTemplate | null> {
    if (USE_MEMORY_DB) {
      const templates = Array.from(memoryStore.metricTemplates?.values() || []) as MetricTemplate[];
      return templates.find(t => t.positionId === positionId) || null;
    }
    
    const sql = `
      SELECT 
        t.*,
        p.name as positionName,
        GROUP_CONCAT(CONCAT(tm.metric_id, ':', tm.weight, ':', tm.required)) as metrics
      FROM metric_templates t
      LEFT JOIN positions p ON t.position_id = p.id
      LEFT JOIN template_metrics tm ON t.id = tm.template_id
      WHERE t.position_id = ?
      GROUP BY t.id
    `;
    const results = await query(sql, [positionId]);
    return results.length > 0 ? this.formatTemplate(results[0]) : null;
  }
  
  // 创建模板
  static async createTemplate(template: Omit<MetricTemplate, 'createdAt' | 'updatedAt'>): Promise<MetricTemplate> {
    const now = new Date().toISOString();
    const newTemplate: MetricTemplate = { ...template, createdAt: now, updatedAt: now };
    
    if (USE_MEMORY_DB) {
      if (!memoryStore.metricTemplates) memoryStore.metricTemplates = new Map();
      memoryStore.metricTemplates.set(template.id, newTemplate);
      return newTemplate;
    }
    
    const sql = `
      INSERT INTO metric_templates (id, name, description, position_id, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    await query(sql, [
      template.id, template.name, template.description || null,
      template.positionId || null, template.status
    ]);
    
    // 插入模板指标
    if (template.metrics && template.metrics.length > 0) {
      for (const metric of template.metrics) {
        await query(
          'INSERT INTO template_metrics (template_id, metric_id, weight, required) VALUES (?, ?, ?, ?)',
          [template.id, metric.metricId, metric.weight, metric.required]
        );
      }
    }
    
    return newTemplate;
  }
  
  // ============ 辅助方法 ============
  
  private static formatMetric(row: any): PerformanceMetric {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      category: row.category,
      type: row.type,
      description: row.description,
      scoringCriteria: [], // 需要单独查询
      weight: row.weight,
      departmentIds: row.departmentIds ? row.departmentIds.split(',') : [],
      positionIds: row.positionIds ? row.positionIds.split(',') : [],
      applicableLevels: row.applicableLevels ? row.applicableLevels.split(',') : [],
      formula: row.formula,
      unit: row.unit,
      targetValue: row.target_value || row.targetValue,
      minValue: row.min_value || row.minValue,
      maxValue: row.max_value || row.maxValue,
      dataSource: row.data_source || row.dataSource,
      status: row.status,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }
  
  private static formatTemplate(row: any): MetricTemplate {
    const metrics: { metricId: string; weight: number; required: boolean }[] = [];
    if (row.metrics) {
      row.metrics.split(',').forEach((m: string) => {
        const [metricId, weight, required] = m.split(':');
        metrics.push({ metricId, weight: parseFloat(weight), required: required === '1' });
      });
    }
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      positionId: row.position_id || row.positionId,
      positionName: row.positionName || row.position_name,
      metrics,
      status: row.status,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }
  
  // 初始化默认指标
  static async initializeDefaultMetrics(): Promise<void> {
    const defaultMetrics: Omit<PerformanceMetric, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'metric-task-completion',
        name: '任务完成率',
        code: 'TASK_COMPLETION',
        category: 'performance',
        type: 'quantitative',
        description: '按时完成任务的质量和数量',
        scoringCriteria: [
          { level: 'L1', score: 0.5, description: '任务完成率低于60%' },
          { level: 'L2', score: 0.8, description: '任务完成率60%-80%' },
          { level: 'L3', score: 1.0, description: '任务完成率80%-100%' },
          { level: 'L4', score: 1.2, description: '任务完成率100%-120%' },
          { level: 'L5', score: 1.5, description: '任务完成率超过120%' }
        ],
        weight: 40,
        applicableLevels: ['senior', 'intermediate', 'junior', 'assistant'],
        minValue: 0,
        maxValue: 150,
        unit: '%',
        status: 'active'
      },
      {
        id: 'metric-initiative',
        name: '工作主动性',
        code: 'INITIATIVE',
        category: 'attitude',
        type: 'qualitative',
        description: '主动承担责任和解决问题的态度',
        scoringCriteria: [
          { level: 'L1', score: 0.5, description: '被动等待指示，需要频繁督促' },
          { level: 'L2', score: 0.8, description: '能够完成分配任务，但缺乏主动性' },
          { level: 'L3', score: 1.0, description: '主动完成本职工作' },
          { level: 'L4', score: 1.2, description: '主动发现问题并提出解决方案' },
          { level: 'L5', score: 1.5, description: '持续改进，带动团队积极性' }
        ],
        weight: 30,
        applicableLevels: ['senior', 'intermediate', 'junior', 'assistant'],
        minValue: 0.5,
        maxValue: 1.5,
        status: 'active'
      },
      {
        id: 'metric-quality',
        name: '工作质量',
        code: 'QUALITY',
        category: 'performance',
        type: 'qualitative',
        description: '工作成果的准确性和规范性',
        scoringCriteria: [
          { level: 'L1', score: 0.5, description: '工作质量差，需要大量返工' },
          { level: 'L2', score: 0.8, description: '工作质量一般，有改进空间' },
          { level: 'L3', score: 1.0, description: '工作质量达标' },
          { level: 'L4', score: 1.2, description: '工作质量良好，超出预期' },
          { level: 'L5', score: 1.5, description: '工作质量优秀，成为标杆' }
        ],
        weight: 30,
        applicableLevels: ['senior', 'intermediate', 'junior', 'assistant'],
        minValue: 0.5,
        maxValue: 1.5,
        status: 'active'
      }
    ];
    
    for (const metric of defaultMetrics) {
      const existing = await this.findMetricById(metric.id);
      if (!existing) {
        await this.createMetric(metric);
      }
    }
  }
}
