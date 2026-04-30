import { Request, Response } from 'express';
import { LevelTemplateRuleModel } from '../models/levelTemplateRule.model';
import { asyncHandler } from '../middleware/errorHandler';

const getRouteParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

/**
 * 设置/更新规则
 * POST /api/level-template-rules
 * Body: { departmentType, level, templateId }
 */
export const setRule = asyncHandler(async (req: Request, res: Response) => {
  const { departmentType, level, templateId } = req.body;
  if (!departmentType || !level || !templateId) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数：departmentType, level, templateId'
    });
  }

  const rule = await LevelTemplateRuleModel.upsert({
    departmentType,
    level,
    templateId,
    setBy: req.user!.id
  });

  res.json({ success: true, data: rule, message: '规则设置成功' });
});

/**
 * 批量设置规则
 * POST /api/level-template-rules/batch
 * Body: { rules: [{ departmentType, level, templateId }] }
 */
export const batchSetRules = asyncHandler(async (req: Request, res: Response) => {
  const { rules } = req.body;
  if (!Array.isArray(rules) || rules.length === 0) {
    return res.status(400).json({
      success: false,
      message: '缺少规则列表'
    });
  }

  const results = await LevelTemplateRuleModel.batchUpsert(rules, req.user!.id);
  res.json({ success: true, data: results, message: `成功设置 ${results.length} 条规则` });
});

/**
 * 获取所有规则
 * GET /api/level-template-rules
 */
export const getAllRules = asyncHandler(async (_req: Request, res: Response) => {
  const rules = await LevelTemplateRuleModel.getAll();
  res.json({ success: true, data: rules });
});

/**
 * 获取某部门类型规则
 * GET /api/level-template-rules/:departmentType
 */
export const getByDepartmentType = asyncHandler(async (req: Request, res: Response) => {
  const rules = await LevelTemplateRuleModel.getByDepartmentType(getRouteParam(req.params.departmentType));
  res.json({ success: true, data: rules });
});

/**
 * 删除规则
 * DELETE /api/level-template-rules/:departmentType/:level
 */
export const deleteRule = asyncHandler(async (req: Request, res: Response) => {
  await LevelTemplateRuleModel.delete(getRouteParam(req.params.departmentType), getRouteParam(req.params.level));
  res.json({ success: true, message: '规则已删除' });
});

/**
 * 解析员工最终模板
 * GET /api/level-template-rules/resolve/:employeeId
 */
export const resolveTemplate = asyncHandler(async (req: Request, res: Response) => {
  const result = await LevelTemplateRuleModel.resolveTemplate(getRouteParam(req.params.employeeId));
  res.json({ success: true, data: result });
});

/**
 * 覆盖统计
 * GET /api/level-template-rules/stats/coverage
 */
export const getCoverageStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await LevelTemplateRuleModel.getCoverageStats();
  res.json({ success: true, data: stats });
});
