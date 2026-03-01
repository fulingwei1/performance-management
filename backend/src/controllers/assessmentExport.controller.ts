import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as exportService from '../services/assessmentExport.service';

/**
 * 导出月度评分记录
 */
export const exportMonthlyAssessments = asyncHandler(async (req: Request, res: Response) => {
  const { month, departmentType, employeeIds } = req.query;
  
  const options = {
    month: month as string,
    departmentType: departmentType as string,
    employeeIds: employeeIds ? (employeeIds as string).split(',') : undefined
  };
  
  const buffer = await exportService.exportMonthlyAssessments(options);
  
  const filename = `月度评分记录_${month || '全部'}_${new Date().getTime()}.xlsx`;
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
});

/**
 * 导出部门类型统计
 */
export const exportDepartmentStats = asyncHandler(async (req: Request, res: Response) => {
  const buffer = await exportService.exportDepartmentTypeStats();
  
  const filename = `部门类型统计_${new Date().getTime()}.xlsx`;
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
});

/**
 * 导出员工评分趋势
 */
export const exportScoreTrend = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId as string;
  
  if (!employeeId) {
    return res.status(400).json({ success: false, message: '缺少员工ID' });
  }
  
  const buffer = await exportService.exportScoreTrendAnalysis(employeeId);
  
  const filename = `评分趋势_${employeeId}_${new Date().getTime()}.xlsx`;
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
});
