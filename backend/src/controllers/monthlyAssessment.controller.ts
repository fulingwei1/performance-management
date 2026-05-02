import { Request, Response } from 'express';
import { MonthlyAssessmentModel, MonthlyAssessment } from '../models/monthlyAssessment.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';

const isPrivilegedRole = (role?: string) => role === 'hr' || role === 'gm' || role === 'admin';

async function canAccessEmployeeAssessment(req: Request, employeeId: string): Promise<boolean> {
  if (!req.user) return false;
  if (isPrivilegedRole(req.user.role)) return true;
  if (req.user.userId === employeeId) return true;

  if (req.user.role === 'manager') {
    const employee = await EmployeeModel.findById(employeeId);
    return employee?.managerId === req.user.userId;
  }

  return false;
}

/**
 * 创建或更新月度评分
 */
export const createOrUpdateAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, month, templateId, templateName, departmentType, scores, totalScore } = req.body;
  
  // 数据验证
  if (!employeeId || !month || !templateId || !scores || totalScore === undefined) {
    return res.status(400).json({
      success: false,
      message: '缺少必要字段'
    });
  }
  
  // 验证月份格式
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({
      success: false,
      message: '月份格式错误，应为 YYYY-MM'
    });
  }
  
  // 验证分数范围
  if (totalScore < 0 || totalScore > 2) {
    return res.status(400).json({
      success: false,
      message: '总分超出有效范围 (0-2)'
    });
  }
  
  // 验证 scores 是否为数组
  if (!Array.isArray(scores) || scores.length === 0) {
    return res.status(400).json({
      success: false,
      message: '评分数据格式错误'
    });
  }

  if (!req.user) {
    return res.status(401).json({ success: false, message: '未认证' });
  }

  const employee = await EmployeeModel.findById(employeeId);
  if (!employee) {
    return res.status(404).json({ success: false, message: '员工不存在' });
  }

  if (!(await canAccessEmployeeAssessment(req, employeeId)) || req.user.role === 'employee') {
    return res.status(403).json({ success: false, message: '无权为该员工评分' });
  }

  const evaluator = await EmployeeModel.findById(req.user.userId);
  
  // 检查是否已存在
  const existing = await MonthlyAssessmentModel.findByEmployeeAndMonth(employeeId, month);
  
  if (existing) {
    // 更新
    const updated = await MonthlyAssessmentModel.update(existing.id, {
      scores,
      totalScore
    });
    
    return res.json({ 
      success: true, 
      data: updated,
      message: '评分已更新'
    });
  } else {
    // 创建
    const assessment = await MonthlyAssessmentModel.create({
      employeeId,
      employeeName: employee.name,
      month,
      templateId,
      templateName,
      departmentType,
      scores,
      totalScore,
      evaluatorId: req.user.userId,
      evaluatorName: evaluator?.name || req.user.userId
    });
    
    return res.status(201).json({ 
      success: true, 
      data: assessment,
      message: '评分已创建'
    });
  }
});

/**
 * 获取员工的评分记录
 */
export const getEmployeeAssessments = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId as string;

  if (!(await canAccessEmployeeAssessment(req, employeeId))) {
    return res.status(403).json({ success: false, message: '无权查看该员工评分记录' });
  }
  
  const assessments = await MonthlyAssessmentModel.findByEmployee(employeeId);
  
  res.json({ success: true, data: assessments });
});

/**
 * 获取特定月份的评分
 */
export const getAssessmentByMonth = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId as string;
  const month = req.params.month as string;

  if (!(await canAccessEmployeeAssessment(req, employeeId))) {
    return res.status(403).json({ success: false, message: '无权查看该员工评分记录' });
  }
  
  const assessment = await MonthlyAssessmentModel.findByEmployeeAndMonth(employeeId, month);
  
  if (!assessment) {
    return res.status(404).json({ 
      success: false, 
      message: '未找到评分记录' 
    });
  }
  
  res.json({ success: true, data: assessment });
});

/**
 * 获取当月考核列表（支持按月过滤）
 */
export const getMonthlyList = asyncHandler(async (req: Request, res: Response) => {
  const { month } = req.query;

  let assessments: MonthlyAssessment[];
  if (month && typeof month === 'string') {
    assessments = await MonthlyAssessmentModel.findByMonth(month);
  } else {
    assessments = await MonthlyAssessmentModel.findAll();
  }

  res.json({ success: true, data: assessments });
});

/**
 * 员工自评提交
 */
export const submitSelfAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, month, selfSummary, nextMonthPlan } = req.body;

  if (!employeeId || !month) {
    return res.status(400).json({ success: false, message: '缺少必要字段' });
  }

  if (!req.user) {
    return res.status(401).json({ success: false, message: '未认证' });
  }

  // 员工只能提交自己的自评
  if (req.user.userId !== employeeId && !isPrivilegedRole(req.user.role)) {
    return res.status(403).json({ success: false, message: '无权提交自评' });
  }

  const existing = await MonthlyAssessmentModel.findByEmployeeAndMonth(employeeId, month);

  if (existing) {
    const updated = await MonthlyAssessmentModel.update(existing.id, {
      selfSummary,
      nextMonthPlan,
      status: 'self_assessed'
    });
    return res.json({ success: true, data: updated, message: '自评已提交' });
  } else {
    const employee = await EmployeeModel.findById(employeeId);
    const assessment = await MonthlyAssessmentModel.create({
      employeeId,
      employeeName: employee?.name || '',
      month,
      templateId: '',
      templateName: '',
      departmentType: '',
      scores: [],
      totalScore: 0,
      evaluatorId: employeeId,
      evaluatorName: employee?.name || '',
      selfSummary,
      nextMonthPlan,
      status: 'self_assessed'
    });
    return res.status(201).json({ success: true, data: assessment, message: '自评已提交' });
  }
});

/**
 * 主管评分提交
 */
export const submitScore = asyncHandler(async (req: Request, res: Response) => {
  const { id, scores, totalScore, managerComment, nextMonthWorkArrangement, status } = req.body;

  if (!id || !scores || totalScore === undefined) {
    return res.status(400).json({ success: false, message: '缺少必要字段' });
  }

  if (!req.user) {
    return res.status(401).json({ success: false, message: '未认证' });
  }

  const existing = await MonthlyAssessmentModel.findById(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: '评分记录不存在' });
  }

  // 检查权限：主管只能给下属评分
  if (req.user.role === 'employee') {
    return res.status(403).json({ success: false, message: '无权评分' });
  }
  if (req.user.role === 'manager') {
    const employee = await EmployeeModel.findById(existing.employeeId);
    if (employee?.managerId !== req.user.userId && !isPrivilegedRole(req.user.role)) {
      return res.status(403).json({ success: false, message: '无权为该员工评分' });
    }
  }

  const updated = await MonthlyAssessmentModel.update(id, {
    scores,
    totalScore,
    managerComment,
    nextMonthWorkArrangement,
    status: status || 'scored',
    evaluatorId: req.user.userId,
    evaluatorName: (req.user as any).name || req.user.userId
  });

  return res.json({ success: true, data: updated, message: '评分已提交' });
});
