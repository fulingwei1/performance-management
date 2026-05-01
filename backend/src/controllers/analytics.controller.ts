import { Request, Response } from 'express';
import { PerformanceModel } from '../models/performance.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

const SCORE_BUCKETS = [
  { level: 'L5', label: '优秀', min: 1.4, max: null as number | null },
  { level: 'L4', label: '良好', min: 1.15, max: 1.4 },
  { level: 'L3', label: '合格', min: 0.9, max: 1.15 },
  { level: 'L2', label: '待改进', min: 0.65, max: 0.9 },
  { level: 'L1', label: '不合格', min: 0, max: 0.65 },
];

const isRealRecord = (record: any) => !record?.isDemo && !String(record?.id || '').startsWith('demo-');

const isScoredRecord = (record: any) =>
  ['completed', 'scored'].includes(record?.status) && Number(record?.totalScore) > 0;

const getScoreBucket = (score: number) =>
  SCORE_BUCKETS.find((bucket) => score >= bucket.min && (bucket.max === null || score < bucket.max));

const buildDistribution = (records: any[]) =>
  SCORE_BUCKETS.map((bucket) => ({
    label: `${bucket.label}(${bucket.level})`,
    min: bucket.min,
    max: bucket.max,
    count: records.filter((record) => getScoreBucket(Number(record.totalScore))?.level === bucket.level).length,
  }));

const toTagArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
};

const topTagEntries = (records: any[], field: string, limit = 8): Array<[string, number]> => {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    toTagArray(record?.[field]).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
};

const formatTagSection = (lines: string[], title: string, entries: Array<[string, number]>) => {
  lines.push(title);
  if (entries.length === 0) {
    lines.push('暂无数据');
    lines.push('');
    return;
  }
  entries.forEach(([tag, count]) => lines.push(`${tag}: ${count}`));
  lines.push('');
};

// GET /api/analytics/performance-distribution
export const getPerformanceDistribution = asyncHandler(async (req: Request, res: Response) => {
  const { month, department } = req.query;

  const allRecords = await PerformanceModel.findByMonth(month as string || new Date().toISOString().slice(0, 7));
  const distribution = department 
    ? allRecords.filter(r => r.department === department)
    : allRecords;
  const realRecords = distribution.filter(isRealRecord);
  const scored = realRecords.filter(isScoredRecord);
  const ranges = buildDistribution(scored);

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
          allRecords.push(...monthRecords.filter(r => r.department === dept && isRealRecord(r) && isScoredRecord(r)));
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthRecords = await PerformanceModel.findByMonth(currentMonth);
        allRecords.push(...monthRecords.filter(r => r.department === dept && isRealRecord(r) && isScoredRecord(r)));
      }

      if (allRecords.length === 0) {
        return { department: dept, avgScore: 0, excellentRate: 0, poorRate: 0, totalCount: 0 };
      }

      const avgScore = allRecords.reduce((sum, r) => sum + r.totalScore, 0) / allRecords.length;
      const excellentRate = allRecords.filter(r => r.totalScore >= 1.4).length / allRecords.length;
      const poorRate = allRecords.filter(r => r.totalScore < 0.65).length / allRecords.length;

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
  const realRecords = allRecords.filter(isRealRecord);
  const scored = realRecords.filter(isScoredRecord);
  const pending = realRecords.filter((record) => !isScoredRecord(record));

  const lines: string[] = [];
  lines.push(`绩效分析报告 - ${targetMonth}`);
  lines.push('');
  lines.push('统计口径: 仅统计真实绩效记录，已自动排除示例/demo 数据');
  lines.push(`本期参与人数: ${realRecords.length}`);
  lines.push(`已完成评分: ${scored.length}`);
  lines.push(`待评分: ${pending.length}`);
  lines.push(`评分完成率: ${realRecords.length > 0 ? ((scored.length / realRecords.length) * 100).toFixed(1) : '0.0'}%`);
  
  if (scored.length > 0) {
    const avg = scored.reduce((s, r) => s + r.totalScore, 0) / scored.length;
    const maxScore = Math.max(...scored.map((record) => record.totalScore));
    const minScore = Math.min(...scored.map((record) => record.totalScore));
    lines.push(`平均分: ${avg.toFixed(2)}`);
    lines.push(`最高分: ${maxScore.toFixed(2)}`);
    lines.push(`最低分: ${minScore.toFixed(2)}`);
    lines.push('');
    lines.push('=== 绩效分布 ===');
    buildDistribution(scored).forEach((range) => {
      const ratio = ((range.count / scored.length) * 100).toFixed(1);
      lines.push(`${range.label}: ${range.count}人 (${ratio}%)`);
    });
    
    lines.push('');
    lines.push('=== 部门对比 ===');
    const depts = [...new Set(scored.map(s => s.department).filter(Boolean))];
    const deptSummaries = depts.map((dept) => {
      const deptRecords = scored.filter(s => s.department === dept);
      const deptAvg = deptRecords.reduce((s, r) => s + r.totalScore, 0) / deptRecords.length;
      const deptTotal = realRecords.filter((record) => record.department === dept).length;
      const excellentRate = deptRecords.length > 0
        ? ((deptRecords.filter((record) => record.totalScore >= 1.4).length / deptRecords.length) * 100).toFixed(1)
        : '0.0';
      return {
        dept,
        deptAvg,
        deptCompleted: deptRecords.length,
        deptTotal,
        excellentRate,
      };
    }).sort((a, b) => b.deptAvg - a.deptAvg);
    deptSummaries.forEach(({ dept, deptAvg, deptCompleted, deptTotal, excellentRate }) => {
      lines.push(`${dept}: 平均分 ${deptAvg.toFixed(2)}, 已评分 ${deptCompleted}/${deptTotal}, 优秀率 ${excellentRate}%`);
    });

    lines.push('');
    lines.push('=== 结构化标签分析 ===');
    formatTagSection(lines, '高频问题类型', topTagEntries(scored, 'issueTypeTags'));
    formatTagSection(lines, '高频亮点贡献', topTagEntries(scored, 'highlightTags'));
    formatTagSection(lines, '高频工作类型', topTagEntries(scored, 'workTypeTags'));
    formatTagSection(lines, '高频改进动作', topTagEntries(scored, 'improvementActionTags'));
    formatTagSection(lines, '员工反馈问题', topTagEntries(realRecords, 'employeeIssueTags'));
    formatTagSection(lines, '员工资源诉求', topTagEntries(realRecords, 'resourceNeedTags'));
    formatTagSection(lines, '问题归因分布', topTagEntries(scored, 'issueAttributionTags'));
    formatTagSection(lines, '工作负荷判断', topTagEntries(scored, 'workloadTags'));
    formatTagSection(lines, '经理建议等级', topTagEntries(scored, 'managerSuggestionTags'));

    lines.push('');
    lines.push('=== 详细数据 ===');
    lines.push('姓名,部门,子部门,分数,等级,部门排名,组内排名,跨部门排名,问题类型,亮点贡献,工作类型,改进动作,员工反馈,资源诉求,问题归因,工作负荷,经理建议');
    scored.sort((a, b) => b.totalScore - a.totalScore).forEach(r => {
      lines.push([
        r.employeeName,
        r.department || '-',
        r.subDepartment || '-',
        r.totalScore.toFixed(2),
        r.level || '-',
        r.departmentRank || '-',
        r.groupRank || '-',
        r.crossDeptRank || '-',
        toTagArray(r.issueTypeTags).join('、') || '-',
        toTagArray(r.highlightTags).join('、') || '-',
        toTagArray(r.workTypeTags).join('、') || '-',
        toTagArray(r.improvementActionTags).join('、') || '-',
        toTagArray(r.employeeIssueTags).join('、') || '-',
        toTagArray(r.resourceNeedTags).join('、') || '-',
        toTagArray(r.issueAttributionTags).join('、') || '-',
        toTagArray(r.workloadTags).join('、') || '-',
        toTagArray(r.managerSuggestionTags).join('、') || '-',
      ].join(','));
    });
  } else {
    lines.push('');
    lines.push('当前月份暂无已完成的真实绩效评分记录。');
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=performance-report-${targetMonth}.txt`);
  res.send(lines.join('\n'));
});
