import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { AssessmentTemplateModel } from '../models/assessmentTemplate.model';

function normalizeMetric(row: any) {
  return {
    id: row.id,
    templateId: row.template_id || row.templateId,
    templateName: row.template_name || row.templateName,
    departmentType: row.department_type || row.departmentType,
    metricName: row.metric_name || row.metricName,
    metricCode: row.metric_code || row.metricCode,
    category: row.category,
    weight: Number(row.weight || 0),
    description: row.description,
    evaluationType: row.evaluation_type || row.evaluationType,
    targetValue: row.target_value || row.targetValue,
    measurementUnit: row.measurement_unit || row.measurementUnit,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
  };
}

export const metricsController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const departmentType = String(req.query.departmentType || '').trim();
    const templateId = String(req.query.templateId || '').trim();

    if (USE_MEMORY_DB) {
      const templates = Array.from(memoryStore.assessmentTemplates?.values() || []) as any[];
      const rows: any[] = [];
      for (const template of templates) {
        const mappedTemplate = {
          id: template.id,
          name: template.name,
          departmentType: template.department_type || template.departmentType,
          status: template.status || 'active',
        };
        if (mappedTemplate.status !== 'active') continue;
        if (departmentType && mappedTemplate.departmentType !== departmentType) continue;
        if (templateId && mappedTemplate.id !== templateId) continue;
        const metrics = await AssessmentTemplateModel.getTemplateMetrics(mappedTemplate.id);
        rows.push(...metrics.map((metric: any) => normalizeMetric({
          ...metric,
          template_name: mappedTemplate.name,
          department_type: mappedTemplate.departmentType,
        })));
      }
      return res.json({ success: true, data: rows });
    }

    const params: any[] = [];
    const clauses = ["t.status = 'active'"];
    if (departmentType) {
      params.push(departmentType);
      clauses.push(`t.department_type = $${params.length}`);
    }
    if (templateId) {
      params.push(templateId);
      clauses.push(`t.id = $${params.length}`);
    }

    const rows = await query(`
      SELECT
        m.*,
        t.name AS template_name,
        t.department_type
      FROM template_metrics m
      INNER JOIN assessment_templates t ON t.id = m.template_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY t.department_type, t.name, m.sort_order, m.metric_name
    `, params);

    res.json({ success: true, data: rows.map(normalizeMetric) });
  }),
};
