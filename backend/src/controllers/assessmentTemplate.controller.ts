import { Request, Response } from 'express';
import { AssessmentTemplateModel } from '../models/assessmentTemplate.model';
import { asyncHandler } from '../middleware/errorHandler';

const DEFAULT_SCORING_CRITERIA = [
  { level: 'L1', score: 0.5, description: '不合格：结果明显低于要求，影响工作交付，需要重点辅导和限期改进' },
  { level: 'L2', score: 0.8, description: '待改进：部分达到要求，但质量、进度或主动性存在明显不足' },
  { level: 'L3', score: 1.0, description: '合格：基本达到岗位要求和本月目标，工作结果稳定可接受' },
  { level: 'L4', score: 1.2, description: '良好：超过岗位要求，能主动推动问题解决，交付质量较高' },
  { level: 'L5', score: 1.5, description: '优秀：显著超出预期，形成标杆成果或可复用经验，对团队有明显贡献' },
];

async function assertManagerOwnTemplateAccess(req: Request, templateId: string) {
  if (req.user?.role !== 'manager') return null;

  const template = await AssessmentTemplateModel.findById(templateId, false);
  if (!template) return null;

  const isOwner = template.createdBy === req.user.userId;
  if (!isOwner || template.isDefault) {
    const error = new Error('经理只能编辑自己创建的非默认模板');
    (error as any).statusCode = 403;
    throw error;
  }

  return template;
}

function normalizeScoringCriteria(metric: any) {
  const incoming = Array.isArray(metric.scoringCriteria) ? metric.scoringCriteria : [];
  const incomingByLevel = new Map(
    incoming
      .filter((criterion: any) => criterion?.level)
      .map((criterion: any) => [String(criterion.level).toUpperCase(), criterion])
  );

  return DEFAULT_SCORING_CRITERIA.map((defaultCriterion) => {
    const custom = incomingByLevel.get(defaultCriterion.level) as any;
    return {
      level: defaultCriterion.level,
      score: Number(custom?.score ?? defaultCriterion.score),
      description: String(custom?.description || defaultCriterion.description).trim(),
      minValue: custom?.minValue,
      maxValue: custom?.maxValue,
    };
  });
}

async function syncTemplateMetrics(templateId: string, metrics: any[] = []) {
  const existingMetrics = await AssessmentTemplateModel.getTemplateMetrics(templateId);
  const incomingMetrics = Array.isArray(metrics) ? metrics : [];
  const incomingIds = new Set(incomingMetrics.map((metric) => metric.id).filter(Boolean));

  for (const metric of incomingMetrics) {
    const payload = {
      metricName: metric.metricName,
      metricCode: metric.metricCode,
      category: metric.category,
      weight: metric.weight,
      description: metric.description,
      evaluationType: metric.evaluationType,
      targetValue: metric.targetValue,
      measurementUnit: metric.measurementUnit,
      sortOrder: metric.sortOrder ?? 0,
    };

    let savedMetric;

    if (metric.id) {
      savedMetric = await AssessmentTemplateModel.updateMetric(metric.id, payload);
      if (!savedMetric) savedMetric = await AssessmentTemplateModel.findMetricById(metric.id);
    } else {
      savedMetric = await AssessmentTemplateModel.addMetric({
        templateId,
        ...payload,
      });
    }

    if (savedMetric) {
      await AssessmentTemplateModel.replaceScoringCriteria(savedMetric.id, normalizeScoringCriteria(metric));
    }
  }

  const toDelete = existingMetrics.filter((metric) => !incomingIds.has(metric.id));
  await Promise.all(toDelete.map((metric) => AssessmentTemplateModel.deleteMetric(metric.id)));
}

/**
 * 获取所有模板
 */
export const getAllTemplates = asyncHandler(async (req: Request, res: Response) => {
  const { departmentType, status, includeMetrics } = req.query;
  
  const templates = await AssessmentTemplateModel.findAll({
    departmentType: departmentType as string,
    status: status as string,
    includeMetrics: includeMetrics === 'true'
  });
  
  res.json({ success: true, data: templates });
});

/**
 * 根据ID获取模板
 */
export const getTemplateById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const includeMetrics = req.query.includeMetrics !== 'false';
  
  const template = await AssessmentTemplateModel.findById(id, includeMetrics);
  
  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }
  
  res.json({ success: true, data: template });
});

/**
 * 获取部门类型的默认模板
 */
export const getDefaultTemplate = asyncHandler(async (req: Request, res: Response) => {
  const departmentType = req.params.departmentType as string;
  
  const template = await AssessmentTemplateModel.getDefaultTemplate(departmentType);
  
  if (!template) {
    return res.status(404).json({ 
      success: false, 
      message: `No default template found for department type: ${departmentType}` 
    });
  }
  
  res.json({ success: true, data: template });
});

/**
 * 创建模板
 */
export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const metrics = Array.isArray(req.body.metrics) ? req.body.metrics : [];
  const payload = {
    ...req.body,
    createdBy: req.user?.userId || req.body.createdBy,
    isDefault: req.user?.role === 'manager' ? false : Boolean(req.body.isDefault),
  };

  const template = await AssessmentTemplateModel.create(payload);
  await syncTemplateMetrics(template.id, metrics);
  const fullTemplate = await AssessmentTemplateModel.findById(template.id, true);
  res.status(201).json({ success: true, data: fullTemplate || template });
});

/**
 * 更新模板
 */
export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await assertManagerOwnTemplateAccess(req, id);

  const metrics = Array.isArray(req.body.metrics) ? req.body.metrics : undefined;
  const payload = { ...req.body };
  if (req.user?.role === 'manager') {
    payload.isDefault = false;
  }

  const template = await AssessmentTemplateModel.update(id, payload);
  
  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }

  if (metrics) {
    await syncTemplateMetrics(id, metrics);
  }
  
  const fullTemplate = await AssessmentTemplateModel.findById(id, true);
  res.json({ success: true, data: fullTemplate || template });
});

/**
 * 删除模板
 */
export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await assertManagerOwnTemplateAccess(req, id);
  
  await AssessmentTemplateModel.delete(id);
  res.json({ success: true, message: 'Template deleted successfully' });
});

/**
 * 获取模板指标
 */
export const getTemplateMetrics = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
  const metrics = await AssessmentTemplateModel.getTemplateMetrics(id);
  res.json({ success: true, data: metrics });
});

/**
 * 添加指标到模板
 */
export const addMetric = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await assertManagerOwnTemplateAccess(req, id);
  
  const metric = await AssessmentTemplateModel.addMetric({
    ...req.body,
    templateId: id
  });
  
  res.status(201).json({ success: true, data: metric });
});

/**
 * 更新指标
 */
export const updateMetric = asyncHandler(async (req: Request, res: Response) => {
  const metricId = req.params.metricId as string;
  const metric = await AssessmentTemplateModel.findMetricById(metricId);
  if (!metric) {
    return res.status(404).json({ success: false, message: 'Metric not found' });
  }
  await assertManagerOwnTemplateAccess(req, metric.templateId);
  
  const updatedMetric = await AssessmentTemplateModel.updateMetric(metricId, req.body);
  
  if (!updatedMetric) {
    return res.status(404).json({ success: false, message: 'Metric not found' });
  }
  
  res.json({ success: true, data: updatedMetric });
});

/**
 * 删除指标
 */
export const deleteMetric = asyncHandler(async (req: Request, res: Response) => {
  const metricId = req.params.metricId as string;
  const metric = await AssessmentTemplateModel.findMetricById(metricId);
  if (!metric) {
    return res.status(404).json({ success: false, message: 'Metric not found' });
  }
  await assertManagerOwnTemplateAccess(req, metric.templateId);
  
  await AssessmentTemplateModel.deleteMetric(metricId);
  res.json({ success: true, message: 'Metric deleted successfully' });
});

/**
 * 添加评分标准
 */
export const addScoringCriteria = asyncHandler(async (req: Request, res: Response) => {
  const metricId = req.params.metricId as string;
  const { criteria } = req.body;
  const metric = await AssessmentTemplateModel.findMetricById(metricId);
  if (!metric) {
    return res.status(404).json({ success: false, message: 'Metric not found' });
  }
  await assertManagerOwnTemplateAccess(req, metric.templateId);
  
  const result = await AssessmentTemplateModel.addScoringCriteria(metricId, criteria);
  res.status(201).json({ success: true, data: result });
});

/**
 * 模板匹配：根据员工信息找到最佳模板
 */
export const matchTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { role, level, position, department } = req.query;
  
  const template = await AssessmentTemplateModel.findMatchingTemplate({
    role: role as string,
    level: level as string,
    position: position as string,
    department: department as string
  });
  
  if (!template) {
    return res.status(404).json({ 
      success: false, 
      message: '未找到匹配的模板，请检查模板配置' 
    });
  }
  
  res.json({ success: true, data: template });
});

/**
 * 模板分配预览：显示所有员工将被分配哪个模板
 */
export const previewTemplateAssignments = asyncHandler(async (req: Request, res: Response) => {
  const { employeeIds } = req.body;
  
  const { EmployeeModel } = await import('../models/employee.model');
  const { LevelTemplateRuleModel } = await import('../models/levelTemplateRule.model');
  
  let employees: any[];
  if (employeeIds && employeeIds.length > 0) {
    employees = await Promise.all(
      employeeIds.map((id: string) => EmployeeModel.findById(id))
    ).then(results => results.filter(Boolean));
  } else {
    const all = await EmployeeModel.findAll();
    employees = all.filter((e: any) => e.status !== 'inactive' && e.status !== 'disabled');
  }

  const sourceReasonMap: Record<string, string> = {
    personal_binding: '员工单独指定模板',
    unit_config: '参与部门指定模板',
    level_rule: '部门类型 + 层级规则',
    auto_match: '按模板适用范围自动匹配',
    default: '默认模板兜底',
  };

  const assignments = await Promise.all(
    employees.map(async (employee: any) => {
      try {
        const resolved = await LevelTemplateRuleModel.resolveTemplate(employee.id);
        return {
          employee: {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            level: employee.level,
            position: employee.position,
            department: employee.department,
          },
          template: {
            id: resolved.templateId,
            name: resolved.templateName,
            departmentType: resolved.departmentType,
          },
          matchScore: 100,
          matchReason: sourceReasonMap[resolved.source] || resolved.source,
        };
      } catch (_error) {
        return {
          employee: {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            level: employee.level,
            position: employee.position,
            department: employee.department,
          },
          template: null,
          matchScore: 0,
          matchReason: '无可用模板',
        };
      }
    })
  );
  
  res.json({ success: true, data: assignments });
});
