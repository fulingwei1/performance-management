import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { PerformanceModel } from '../models/performance.model';
import { EmployeeModel } from '../models/employee.model';
import { ObjectiveModel } from '../models/objective.model';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

// GET /api/data-export/performance
export const exportPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { startMonth, endMonth, department } = req.query;

  if (!startMonth || !endMonth) {
    return res.status(400).json({ success: false, message: '请提供 startMonth 和 endMonth 参数' });
  }

  const allRecords = await PerformanceModel.findAll();
  const employees = await EmployeeModel.findAll();
  const employeeMap = new Map<string, any>();
  employees.forEach((emp: any) => employeeMap.set(emp.id, emp));

  // Filter by month range and department
  const records = allRecords.filter((r: any) => {
    if (r.month < startMonth || r.month > endMonth) return false;
    if (department) {
      const emp = employeeMap.get(r.employeeId);
      if (!emp || emp.department !== department) return false;
    }
    return true;
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '绩效管理系统';
  const sheet = workbook.addWorksheet('绩效数据');

  sheet.columns = [
    { header: '员工姓名', key: 'employeeName', width: 15 },
    { header: '部门', key: 'department', width: 20 },
    { header: '岗位', key: 'position', width: 20 },
    { header: '考核月份', key: 'month', width: 12 },
    { header: '绩效得分', key: 'score', width: 12 },
    { header: '等级', key: 'grade', width: 10 },
    { header: '评价人', key: 'reviewerName', width: 15 },
    { header: '评价内容', key: 'comment', width: 40 },
  ];

  // Header style
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  records.forEach((record: any) => {
    const emp = employeeMap.get(record.employeeId);
    sheet.addRow({
      employeeName: emp?.name || record.employeeName || record.employeeId,
      department: emp?.department || '',
      position: emp?.subDepartment || '',
      month: record.month,
      score: record.totalScore || 0,
      grade: record.level || '',
      reviewerName: record.managerComment ? '直属经理' : '',
      comment: record.managerComment || '',
    });
  });

  // Conditional formatting for scores
  sheet.getColumn('score').eachCell((cell, rowNumber) => {
    if (rowNumber === 1) return;
    const score = Number(cell.value) || 0;
    if (score >= 90) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
    } else if (score >= 1.2) {
      // System uses coefficient scores (0.8-1.5 range)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
    } else if (score < 0.8 && score > 0) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
    } else if (score < 60 && score > 1.5) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
    }
  });

  // Auto filter
  sheet.autoFilter = { from: 'A1', to: `H${sheet.rowCount}` };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=performance_${startMonth}_${endMonth}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/data-export/objectives
export const exportObjectives = asyncHandler(async (req: Request, res: Response) => {
  const { year, department } = req.query;

  const yearNum = year ? Number(year) : new Date().getFullYear();
  const objectives = await ObjectiveModel.findAll({ year: yearNum, department: department as string });

  const employees = await EmployeeModel.findAll();
  const employeeMap = new Map<string, any>();
  employees.forEach((emp: any) => employeeMap.set(emp.id, emp));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '绩效管理系统';
  const sheet = workbook.addWorksheet('目标数据');

  sheet.columns = [
    { header: '负责人', key: 'ownerName', width: 15 },
    { header: '目标标题', key: 'title', width: 30 },
    { header: '开始日期', key: 'startDate', width: 14 },
    { header: '结束日期', key: 'endDate', width: 14 },
    { header: '状态', key: 'status', width: 12 },
    { header: '进度', key: 'progress', width: 10 },
    { header: '审批状态', key: 'approvalStatus', width: 12 },
    { header: '目标层级', key: 'level', width: 12 },
    { header: '权重', key: 'weight', width: 10 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  objectives.forEach((obj: any) => {
    const emp = employeeMap.get(obj.ownerId);
    sheet.addRow({
      ownerName: emp?.name || obj.ownerId || '',
      title: obj.title || '',
      startDate: obj.startDate || '',
      endDate: obj.endDate || '',
      status: obj.status || '',
      progress: obj.progress != null ? `${obj.progress}%` : '0%',
      approvalStatus: obj.approvalStatus || '',
      level: obj.level || '',
      weight: obj.weight != null ? `${obj.weight}%` : '',
    });
  });

  sheet.autoFilter = { from: 'A1', to: `I${sheet.rowCount}` };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=objectives_${yearNum}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});
