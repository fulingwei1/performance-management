import { Request, Response } from 'express';
import { AssessmentTemplateModel } from '../models/assessmentTemplate.model';
import { asyncHandler } from '../middleware/errorHandler';

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
  const template = await AssessmentTemplateModel.create(req.body);
  res.status(201).json({ success: true, data: template });
});

/**
 * 更新模板
 */
export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
  const template = await AssessmentTemplateModel.update(id, req.body);
  
  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }
  
  res.json({ success: true, data: template });
});

/**
 * 删除模板
 */
export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
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
  
  const metric = await AssessmentTemplateModel.updateMetric(metricId, req.body);
  
  if (!metric) {
    return res.status(404).json({ success: false, message: 'Metric not found' });
  }
  
  res.json({ success: true, data: metric });
});

/**
 * 删除指标
 */
export const deleteMetric = asyncHandler(async (req: Request, res: Response) => {
  const metricId = req.params.metricId as string;
  
  await AssessmentTemplateModel.deleteMetric(metricId);
  res.json({ success: true, message: 'Metric deleted successfully' });
});

/**
 * 添加评分标准
 */
export const addScoringCriteria = asyncHandler(async (req: Request, res: Response) => {
  const metricId = req.params.metricId as string;
  const { criteria } = req.body;
  
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
