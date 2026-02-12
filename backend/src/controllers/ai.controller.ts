/**
 * AI控制器 - 处理AI辅助生成请求
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { generateAISuggestion, prompts, calculateCost } from '../services/ai.service';
import { asyncHandler } from '../middleware/errorHandler';
import { EmployeeModel } from '../models/employee.model';
import { ObjectiveModel } from '../models/objective.model';

/**
 * 生成员工自评总结
 */
export const generateSelfSummary = [
  body('employeeId').notEmpty().withMessage('员工ID不能为空'),
  body('month').optional().isString(),
  
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { employeeId, month } = req.body;
    const userId = (req as any).user?.userId;

    // 权限检查：只能为自己生成
    if (userId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: '只能为自己生成AI建议'
      });
    }

    // 获取员工信息
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      });
    }

    // 获取员工目标
    const year = month ? parseInt(month.split('-')[0]) : new Date().getFullYear();
    const objectives = await ObjectiveModel.findAll({ year, ownerId: employeeId });

    // 构建提示词
    const promptData = prompts.employeeSelfSummary({
      name: employee.name,
      level: employee.level || '员工',
      department: `${employee.department}/${employee.subDepartment}`,
      goals: objectives.map((obj: any) => ({
        name: obj.name,
        target: obj.targetValue ? `${obj.targetValue}${obj.unit || ''}` : undefined,
        actual: undefined // TODO: 从进度数据中获取
      })),
      projects: [], // TODO: 从项目数据中获取
      lastMonthComment: undefined // TODO: 从上月绩效中获取
    });

    // 调用AI
    const result = await generateAISuggestion(promptData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'AI生成失败'
      });
    }

    // 解析JSON响应
    let versions: string[] = [];
    try {
      const parsed = JSON.parse(result.content || '{}');
      versions = parsed.versions || [result.content || ''];
    } catch {
      versions = [result.content || ''];
    }

    return res.json({
      success: true,
      data: {
        versions,
        provider: result.provider,
        usage: result.usage
      }
    });
  })
];

/**
 * 生成下月工作计划
 */
export const generateNextMonthPlan = [
  body('employeeId').notEmpty().withMessage('员工ID不能为空'),
  body('currentSummary').optional().isString(),
  
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { employeeId, currentSummary } = req.body;
    const userId = (req as any).user?.userId;

    if (userId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: '只能为自己生成AI建议'
      });
    }

    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      });
    }

    const year = new Date().getFullYear();
    const objectives = await ObjectiveModel.findAll({ year, ownerId: employeeId });

    const promptData = prompts.employeeNextMonthPlan({
      name: employee.name,
      level: employee.level || '员工',
      department: `${employee.department}/${employee.subDepartment}`,
      goals: objectives.map((obj: any) => ({
        name: obj.name,
        description: obj.description
      })),
      currentSummary
    });

    const result = await generateAISuggestion(promptData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'AI生成失败'
      });
    }

    let versions: string[] = [];
    try {
      const parsed = JSON.parse(result.content || '{}');
      versions = parsed.versions || [result.content || ''];
    } catch {
      versions = [result.content || ''];
    }

    return res.json({
      success: true,
      data: {
        versions,
        provider: result.provider,
        usage: result.usage
      }
    });
  })
];

/**
 * 生成经理综合评价
 */
export const generateManagerComment = [
  body('employeeId').notEmpty().withMessage('员工ID不能为空'),
  body('selfSummary').notEmpty().withMessage('员工自评不能为空'),
  body('scores').isObject().withMessage('评分数据必须是对象'),
  
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { employeeId, selfSummary, scores } = req.body;
    const managerId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // 权限检查：必须是manager
    if (userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: '只有经理可以生成评价建议'
      });
    }

    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      });
    }

    // TODO: 检查是否是该员工的直属经理
    // if (employee.managerId !== managerId) { ... }

    const promptData = prompts.managerComment({
      employeeName: employee.name,
      employeeLevel: employee.level || '员工',
      department: `${employee.department}/${employee.subDepartment}`,
      selfSummary,
      scores: {
        taskCompletion: scores.taskCompletion || 1.0,
        initiative: scores.initiative || 1.0,
        projectFeedback: scores.projectFeedback || 1.0,
        qualityImprovement: scores.qualityImprovement || 1.0
      },
      // TODO: 添加历史数据、团队对比
      goalProgress: [],
      historyScores: [],
      teamAverage: undefined,
      rank: undefined
    });

    const result = await generateAISuggestion(promptData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'AI生成失败'
      });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(result.content || '{}');
    } catch {
      parsed = { comment: result.content || '' };
    }

    return res.json({
      success: true,
      data: {
        comment: parsed.comment || '',
        positiveKeywords: parsed.positiveKeywords || [],
        negativeKeywords: parsed.negativeKeywords || [],
        suggestions: parsed.suggestions || '',
        provider: result.provider,
        usage: result.usage
      }
    });
  })
];

/**
 * 生成下月工作安排
 */
export const generateWorkArrangement = [
  body('employeeId').notEmpty().withMessage('员工ID不能为空'),
  body('currentComment').optional().isString(),
  
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { employeeId, currentComment } = req.body;
    const userRole = (req as any).user?.role;

    if (userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: '只有经理可以生成工作安排建议'
      });
    }

    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      });
    }

    const promptData = prompts.managerWorkArrangement({
      employeeName: employee.name,
      employeeLevel: employee.level || '员工',
      department: `${employee.department}/${employee.subDepartment}`,
      currentComment
    });

    const result = await generateAISuggestion(promptData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'AI生成失败'
      });
    }

    let versions: string[] = [];
    try {
      const parsed = JSON.parse(result.content || '{}');
      versions = parsed.versions || [result.content || ''];
    } catch {
      versions = [result.content || ''];
    }

    return res.json({
      success: true,
      data: {
        versions,
        provider: result.provider,
        usage: result.usage
      }
    });
  })
];
