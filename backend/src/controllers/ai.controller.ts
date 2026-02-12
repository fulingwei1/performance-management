/**
 * AI控制器 - 处理AI辅助生成请求
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { generateAISuggestion, prompts, calculateCost } from '../services/ai.service';
import { asyncHandler } from '../middleware/errorHandler';
import { EmployeeModel } from '../models/employee.model';
import { ObjectiveModel } from '../models/objective.model';
import { createAIUsageLog, getAIUsageStatsByUser, getAllAIUsageStats } from '../models/aiUsageLog.model';

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

    // 记录使用日志
    const tokensUsed = result.usage?.totalTokens || 0;
    const costYuan = result.usage ? calculateCost({
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    }) : 0;

    await createAIUsageLog({
      user_id: employeeId,
      user_name: employee.name,
      feature_type: 'self-summary',
      tokens_used: tokensUsed,
      cost_yuan: costYuan,
      success: result.success,
      error_message: result.error
    });

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

    // 记录使用日志
    const tokensUsed = result.usage?.totalTokens || 0;
    const costYuan = result.usage ? calculateCost({
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    }) : 0;

    await createAIUsageLog({
      user_id: employeeId,
      user_name: employee.name,
      feature_type: 'next-month-plan',
      tokens_used: tokensUsed,
      cost_yuan: costYuan,
      success: result.success,
      error_message: result.error
    });

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

    // 记录使用日志（记录到经理账号）
    const manager = await EmployeeModel.findById(managerId);
    const tokensUsed = result.usage?.totalTokens || 0;
    const costYuan = result.usage ? calculateCost({
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    }) : 0;

    await createAIUsageLog({
      user_id: managerId,
      user_name: manager?.name || '未知经理',
      feature_type: 'manager-comment',
      tokens_used: tokensUsed,
      cost_yuan: costYuan,
      success: result.success,
      error_message: result.error
    });

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

    // 记录使用日志（记录到经理账号）
    const managerId = (req as any).user?.userId;
    const manager = await EmployeeModel.findById(managerId);
    const tokensUsed = result.usage?.totalTokens || 0;
    const costYuan = result.usage ? calculateCost({
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    }) : 0;

    await createAIUsageLog({
      user_id: managerId,
      user_name: manager?.name || '未知经理',
      feature_type: 'work-arrangement',
      tokens_used: tokensUsed,
      cost_yuan: costYuan,
      success: result.success,
      error_message: result.error
    });

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
 * 查询用户AI使用统计
 */
export const getMyAIUsage = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: '未授权'
    });
  }

  const stats = await getAIUsageStatsByUser(userId);

  return res.json({
    success: true,
    data: stats || {
      user_id: userId,
      total_calls: 0,
      successful_calls: 0,
      total_tokens: 0,
      total_cost: 0,
      last_used_at: null
    }
  });
});

/**
 * 查询所有用户AI使用统计（管理员功能）
 */
export const getAllUsersAIUsage = asyncHandler(async (req: Request, res: Response) => {
  const userRole = (req as any).user?.role;

  // 权限检查：只有admin可以查看所有人的统计
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '只有管理员可以查看所有人的使用统计'
    });
  }

  const stats = await getAllAIUsageStats();

  return res.json({
    success: true,
    data: stats
  });
});

/**
 * 生成目标拆解建议
 */
export const generateGoalDecomposition = [
  body('userId').notEmpty().withMessage('用户ID不能为空'),
  
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { userId, companyStrategy, companyKeyWorks, departmentKeyWorks } = req.body;
    const currentUserId = (req as any).user?.userId;

    // 权限检查：只能为自己生成
    if (currentUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只能为自己生成目标建议'
      });
    }

    const employee = await EmployeeModel.findById(userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 构建提示词
    const promptData = prompts.goalDecomposition({
      name: employee.name,
      role: employee.role === 'manager' ? 'manager' : 'employee',
      level: employee.level || '员工',
      department: `${employee.department}/${employee.subDepartment}`,
      companyStrategy,
      companyKeyWorks: companyKeyWorks || [],
      departmentKeyWorks: departmentKeyWorks || [],
      currentGoals: []
    });

    // 调用AI
    const result = await generateAISuggestion(promptData);

    // 记录使用日志
    const tokensUsed = result.usage?.totalTokens || 0;
    const costYuan = result.usage ? calculateCost({
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    }) : 0;

    await createAIUsageLog({
      user_id: userId,
      user_name: employee.name,
      feature_type: 'self-summary', // 暂时用这个，后续可以添加新的类型
      tokens_used: tokensUsed,
      cost_yuan: costYuan,
      success: result.success,
      error_message: result.error
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'AI生成失败'
      });
    }

    // 解析JSON响应
    let parsed: any = {};
    try {
      parsed = JSON.parse(result.content || '{}');
    } catch {
      parsed = { goals: [], explanation: result.content || '' };
    }

    return res.json({
      success: true,
      data: {
        goals: parsed.goals || [],
        explanation: parsed.explanation || '',
        provider: result.provider,
        usage: result.usage
      }
    });
  })
];

/**
 * 生成公司战略
 */
export const generateCompanyStrategy = [
  body('year').isInt().withMessage('年份必须是整数'),
  
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { year, currentStrategy, companyName, industry } = req.body;
    const userRole = (req as any).user?.role;

    // 权限检查：只有GM可以生成公司战略
    if (userRole !== 'gm') {
      return res.status(403).json({
        success: false,
        message: '只有总经理可以生成公司战略'
      });
    }

    const promptData = prompts.companyStrategy({
      companyName,
      industry,
      year,
      currentStrategy
    });

    const result = await generateAISuggestion(promptData);

    // 记录使用日志
    const userId = (req as any).user?.userId;
    const gm = await EmployeeModel.findById(userId);
    const tokensUsed = result.usage?.totalTokens || 0;
    const costYuan = result.usage ? calculateCost({
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    }) : 0;

    await createAIUsageLog({
      user_id: userId,
      user_name: gm?.name || '未知总经理',
      feature_type: 'self-summary', // 暂用已有类型
      tokens_used: tokensUsed,
      cost_yuan: costYuan,
      success: result.success,
      error_message: result.error
    });

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
 * 生成公司年度重点工作
 */
export const generateCompanyKeyWorks = [
  body('year').isInt().withMessage('年份必须是整数'),
  
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { year, strategy, departments, companyName } = req.body;
    const userRole = (req as any).user?.role;

    if (userRole !== 'gm') {
      return res.status(403).json({
        success: false,
        message: '只有总经理可以生成公司重点工作'
      });
    }

    const promptData = prompts.companyKeyWorks({
      companyName,
      year,
      strategy,
      departments
    });

    const result = await generateAISuggestion(promptData);

    // 记录使用日志
    const userId = (req as any).user?.userId;
    const gm = await EmployeeModel.findById(userId);
    const tokensUsed = result.usage?.totalTokens || 0;
    const costYuan = result.usage ? calculateCost({
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    }) : 0;

    await createAIUsageLog({
      user_id: userId,
      user_name: gm?.name || '未知总经理',
      feature_type: 'self-summary',
      tokens_used: tokensUsed,
      cost_yuan: costYuan,
      success: result.success,
      error_message: result.error
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'AI生成失败'
      });
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(result.content || '{}');
    } catch {
      parsedData = { versions: [{ works: [] }] };
    }

    return res.json({
      success: true,
      data: {
        versions: parsedData.versions || [],
        provider: result.provider,
        usage: result.usage
      }
    });
  })
];

/**
 * 生成部门年度重点工作
 */
export const generateDepartmentKeyWorks = [
  body('department').notEmpty().withMessage('部门名称不能为空'),
  body('year').isInt().withMessage('年份必须是整数'),
  
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { department, year, companyStrategy, companyKeyWorks } = req.body;
    const userRole = (req as any).user?.role;

    if (userRole !== 'gm') {
      return res.status(403).json({
        success: false,
        message: '只有总经理可以生成部门重点工作'
      });
    }

    const promptData = prompts.departmentKeyWorks({
      department,
      year,
      companyStrategy,
      companyKeyWorks
    });

    const result = await generateAISuggestion(promptData);

    // 记录使用日志
    const userId = (req as any).user?.userId;
    const gm = await EmployeeModel.findById(userId);
    const tokensUsed = result.usage?.totalTokens || 0;
    const costYuan = result.usage ? calculateCost({
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    }) : 0;

    await createAIUsageLog({
      user_id: userId,
      user_name: gm?.name || '未知总经理',
      feature_type: 'self-summary',
      tokens_used: tokensUsed,
      cost_yuan: costYuan,
      success: result.success,
      error_message: result.error
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'AI生成失败'
      });
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(result.content || '{}');
    } catch {
      parsedData = { versions: [{ works: [] }] };
    }

    return res.json({
      success: true,
      data: {
        versions: parsedData.versions || [],
        provider: result.provider,
        usage: result.usage
      }
    });
  })
];

/**
 * 生成季度团队总结
 */
export const generateQuarterlySummary = [
  body('quarter').notEmpty().withMessage('季度不能为空'),
  
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { quarter, teamSize, avgScore, topPerformers, keyProjects } = req.body;
    const userRole = (req as any).user?.role;

    if (userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: '只有经理可以生成季度总结'
      });
    }

    const managerId = (req as any).user?.userId;
    const manager = await EmployeeModel.findById(managerId);

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: '经理信息不存在'
      });
    }

    const promptData = prompts.quarterlySummary({
      managerName: manager.name,
      department: `${manager.department}/${manager.subDepartment}`,
      quarter,
      teamSize,
      avgScore,
      topPerformers,
      keyProjects
    });

    const result = await generateAISuggestion(promptData);

    // 记录使用日志
    const tokensUsed = result.usage?.totalTokens || 0;
    const costYuan = result.usage ? calculateCost({
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    }) : 0;

    await createAIUsageLog({
      user_id: managerId,
      user_name: manager.name,
      feature_type: 'self-summary',
      tokens_used: tokensUsed,
      cost_yuan: costYuan,
      success: result.success,
      error_message: result.error
    });

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
