import { Request, Response } from 'express';
import { PerformanceModel } from '../models/performance.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

// GET /api/analytics/performance-distribution
export const getPerformanceDistribution = asyncHandler(async (req: Request, res: Response) => {
  const { month, department } = req.query;

  const allRecords = await PerformanceModel.findByMonth(month as string || new Date().toISOString().slice(0, 7));
  const distribution = department 
    ? allRecords.filter(r => r.department === department)
    : allRecords;
  const scored = distribution.filter(r => r.status === 'completed' && r.totalScore > 0);

  const ranges = [
    { label: '优秀(90-100)', min: 90, max: 100, count: 0 },
    { label: '良好(80-89)', min: 80, max: 89, count: 0 },
    { label: '合格(70-79)', min: 70, max: 79, count: 0 },
    { label: '待改进(60-69)', min: 60, max: 69, count: 0 },
    { label: '不合格(<60)', min: 0, max: 59, count: 0 },
  ];

  scored.forEach(record => {
    const range = ranges.find(r => record.totalScore >= r.min && record.totalScore <= r.max);
    if (range) range.count++;
  });

  const avgScore = scored.length > 0
    ? scored.reduce((sum, r) => sum + r.totalScore, 0) / scored.length
    : 0;

  res.json({
    success: true,
    data: { ranges, total: scored.length, avgScore: parseFloat(avgScore.toFixed(2)) }
  });
});

// GET /api/analytics/department-comparison
export const getDepartmentComparison = asyncHandler(async (req: Request, res: Response) => {
  const { startMonth, endMonth } = req.query;

  const employees = await EmployeeModel.findAll();
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const comparison = await Promise.all(
    departments.map(async (dept) => {
      const allRecords: any[] = [];
      
      if (startMonth && endMonth) {
        const start = new Date(startMonth as string + '-01');
        const end = new Date(endMonth as string + '-01');
        const current = new Date(start);
        while (current <= end) {
          const monthStr = current.toISOString().slice(0, 7);
          const monthRecords = await PerformanceModel.findByMonth(monthStr);
          allRecords.push(...monthRecords.filter(r => r.department === dept && r.status === 'completed' && r.totalScore > 0));
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthRecords = await PerformanceModel.findByMonth(currentMonth);
        allRecords.push(...monthRecords.filter(r => r.department === dept && r.status === 'completed' && r.totalScore > 0));
      }

      if (allRecords.length === 0) {
        return { department: dept, avgScore: 0, excellentRate: 0, poorRate: 0, totalCount: 0 };
      }

      const avgScore = allRecords.reduce((sum, r) => sum + r.totalScore, 0) / allRecords.length;
      const excellentRate = allRecords.filter(r => r.totalScore >= 90).length / allRecords.length;
      const poorRate = allRecords.filter(r => r.totalScore < 60).length / allRecords.length;

      return {
        department: dept,
        avgScore: parseFloat(avgScore.toFixed(2)),
        excellentRate: parseFloat((excellentRate * 100).toFixed(2)),
        poorRate: parseFloat((poorRate * 100).toFixed(2)),
        totalCount: allRecords.length
      };
    })
  );

  res.json({ success: true, data: comparison.filter(c => c.totalCount > 0) });
});

// GET /api/analytics/performance-trend
export const getPerformanceTrend = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, months = '12' } = req.query;
  const numMonths = parseInt(months as string);
  const trend: any[] = [];
  const now = new Date();

  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7);

    if (employeeId) {
      const record = await PerformanceModel.findByEmployeeIdAndMonth(employeeId as string, monthStr);
      if (record && record.status === 'completed') {
        trend.push({ month: monthStr, score: record.totalScore, grade: record.level || '', rank: record.companyRank || 0 });
      }
    } else {
      const records = await PerformanceModel.findByMonth(monthStr);
      const completed = records.filter(r => r.status === 'completed' && r.totalScore > 0);
      if (completed.length > 0) {
        const avg = completed.reduce((sum, r) => sum + r.totalScore, 0) / completed.length;
        trend.push({ month: monthStr, score: parseFloat(avg.toFixed(2)), count: completed.length });
      }
    }
  }

  res.json({ success: true, data: trend });
});

// GET /api/analytics/anomaly-detection
export const detectAnomalies = asyncHandler(async (req: Request, res: Response) => {
  const employees = await EmployeeModel.findAll();
  const anomalies: any[] = [];

  for (const emp of employees) {
    const records = await PerformanceModel.findByEmployeeId(emp.id);
    const completed = records.filter(r => r.status === 'completed' && r.totalScore > 0);

    if (completed.length >= 2) {
      const current = completed[0].totalScore;
      const previous = completed[1].totalScore;
      const drop = previous - current;

      if (drop >= 20) {
        anomalies.push({
          employeeId: emp.id, employeeName: emp.name, department: emp.department,
          currentMonth: completed[0].month, previousMonth: completed[1].month,
          currentScore: current, previousScore: previous, drop, type: 'sudden_drop'
        });
      }
    }
  }

  res.json({ success: true, data: anomalies });
});

// GET /api/analytics/report/export
export const generateReport = asyncHandler(async (req: Request, res: Response) => {
  const { month } = req.query;
  const targetMonth = (month as string) || new Date().toISOString().slice(0, 7);

  const allRecords = await PerformanceModel.findByMonth(targetMonth);
  const scored = allRecords.filter(r => r.status === 'completed' && r.totalScore > 0);

  const lines: string[] = [];
  lines.push(`绩效分析报告 - ${targetMonth}`);
  lines.push('');
  lines.push(`总人数: ${scored.length}`);
  
  if (scored.length > 0) {
    const avg = scored.reduce((s, r) => s + r.totalScore, 0) / scored.length;
    lines.push(`平均分: ${avg.toFixed(2)}`);
    lines.push('');
    lines.push('=== 绩效分布 ===');
    [
      { label: '优秀(90-100)', min: 90, max: 100 },
      { label: '良好(80-89)', min: 80, max: 89 },
      { label: '合格(70-79)', min: 70, max: 79 },
      { label: '待改进(60-69)', min: 60, max: 69 },
      { label: '不合格(<60)', min: 0, max: 59 },
    ].forEach(r => {
      const count = scored.filter(s => s.totalScore >= r.min && s.totalScore <= r.max).length;
      lines.push(`${r.label}: ${count}人`);
    });
    
    lines.push('');
    lines.push('=== 部门对比 ===');
    const depts = [...new Set(scored.map(s => s.department).filter(Boolean))];
    depts.forEach(dept => {
      const deptRecords = scored.filter(s => s.department === dept);
      const deptAvg = deptRecords.reduce((s, r) => s + r.totalScore, 0) / deptRecords.length;
      lines.push(`${dept}: 平均分 ${deptAvg.toFixed(2)}, ${deptRecords.length}人`);
    });

    lines.push('');
    lines.push('=== 详细数据 ===');
    lines.push('姓名,部门,分数,等级,排名');
    scored.sort((a, b) => b.totalScore - a.totalScore).forEach(r => {
      lines.push(`${r.employeeName},${r.department},${r.totalScore},${r.level || '-'},${r.companyRank || '-'}`);
    });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=performance-report-${targetMonth}.txt`);
  res.send(lines.join('\n'));
});
