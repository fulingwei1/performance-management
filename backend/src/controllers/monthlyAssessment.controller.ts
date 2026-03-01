import { Request, Response } from 'express';
import { MonthlyAssessmentModel } from '../models/monthlyAssessment.model';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * 创建或更新月度评分
 */
export const createOrUpdateAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, month, templateId, templateName, departmentType, scores, totalScore, evaluatorId, evaluatorName } = req.body;
  
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
      month,
      templateId,
      templateName,
      departmentType,
      scores,
      totalScore,
      evaluatorId,
      evaluatorName
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
  
  const assessments = await MonthlyAssessmentModel.findByEmployee(employeeId);
  
  res.json({ success: true, data: assessments });
});

/**
 * 获取特定月份的评分
 */
export const getAssessmentByMonth = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId as string;
  const month = req.params.month as string;
  
  const assessment = await MonthlyAssessmentModel.findByEmployeeAndMonth(employeeId, month);
  
  if (!assessment) {
    return res.status(404).json({ 
      success: false, 
      message: '未找到评分记录' 
    });
  }
  
  res.json({ success: true, data: assessment });
});
