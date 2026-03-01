import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as statsService from '../services/assessmentStats.service';

/**
 * 获取部门类型统计
 */
export const getDepartmentStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await statsService.getDepartmentTypeStats();
  res.json({ success: true, data: stats });
});

/**
 * 获取员工绩效趋势
 */
export const getEmployeeTrend = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId as string;
  
  if (!employeeId) {
    return res.status(400).json({ success: false, message: '缺少员工ID' });
  }
  
  const trend = await statsService.getEmployeePerformanceTrend(employeeId);
  
  if (!trend) {
    return res.status(404).json({ success: false, message: '未找到该员工的评分记录' });
  }
  
  res.json({ success: true, data: trend });
});

/**
 * 获取评分分布
 */
export const getScoreDistribution = asyncHandler(async (req: Request, res: Response) => {
  const month = req.query.month as string | undefined;
  
  const distribution = await statsService.getScoreDistribution(month);
  
  res.json({ success: true, data: distribution });
});
