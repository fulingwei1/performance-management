import { Request, Response } from 'express';
import { PerformanceModel } from '../models/performance.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';
import { scoreLevelThresholds } from '../utils/helpers';
import { validatePublicationReadiness } from '../services/publicationReadiness.service';

const SCORE_BUCKETS = [
  { level: 'L5', label: '优秀', min: scoreLevelThresholds.L5, max: null as number | null },
  { level: 'L4', label: '良好', min: scoreLevelThresholds.L4, max: scoreLevelThresholds.L5 },
  { level: 'L3', label: '合格', min: scoreLevelThresholds.L3, max: scoreLevelThresholds.L4 },
  { level: 'L2', label: '待改进', min: scoreLevelThresholds.L2, max: scoreLevelThresholds.L3 },
  { level: 'L1', label: '不合格', min: 0, max: scoreLevelThresholds.L2 },
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

const isPrivilegedRole = (role?: string) => role === 'hr' || role === 'gm' || role === 'admin';

const getScopedRecords = async (req: Request, month?: string): Promise<any[]> => {
  if (!req.user) return [];
  if (isPrivilegedRole(req.user.role)) {
    return month ? PerformanceModel.findByMonth(month) : PerformanceModel.findAll();
  }
  return PerformanceModel.findByAssessorId(req.user.userId, month);
};

const canAccessEmployeeTrend = async (req: Request, employeeId: string): Promise<boolean> => {
  if (!req.user) return false;
  if (isPrivilegedRole(req.user.role)) return true;
  if (req.user.userId === employeeId) return true;
  if (req.user.role === 'manager') {
    return EmployeeModel.isInManagerTeam(req.user.userId, employeeId);
  }
  return false;
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

const validateMonth = (month: string) => /^\d{4}-\d{2}$/.test(month);

const getPreviousMonth = (month: string): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const round2 = (value: number): number => Number(value.toFixed(2));

const buildMonthlySummary = (records: any[]) => {
  const realRecords = records.filter(isRealRecord);
  const scored = realRecords.filter(isScoredRecord);
  const pending = realRecords.filter((record) => !isScoredRecord(record));
  const scores = scored.map((record) => Number(record.totalScore)).filter((score) => Number.isFinite(score));
  const avgScore = scores.length ? round2(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;

  const distribution = buildDistribution(scored).map((item) => ({
    ...item,
    ratio: scored.length > 0 ? round2((item.count / scored.length) * 100) : 0,
  }));

  const departmentMap = new Map<string, any[]>();
  realRecords.forEach((record) => {
    const department = String(record.department || '未分配部门');
    if (!departmentMap.has(department)) departmentMap.set(department, []);
    departmentMap.get(department)!.push(record);
  });

  const departments = Array.from(departmentMap.entries())
    .map(([department, deptRecords]) => {
      const deptScored = deptRecords.filter(isScoredRecord);
      const deptScores = deptScored.map((record) => Number(record.totalScore)).filter(Number.isFinite);
      const deptAvg = deptScores.length
        ? round2(deptScores.reduce((sum, score) => sum + score, 0) / deptScores.length)
        : 0;
      const lowCount = deptScored.filter((record) => Number(record.totalScore) < scoreLevelThresholds.L3).length;
      const excellentCount = deptScored.filter((record) => Number(record.totalScore) >= scoreLevelThresholds.L5).length;
      return {
        department,
        totalCount: deptRecords.length,
        scoredCount: deptScored.length,
        pendingCount: deptRecords.length - deptScored.length,
        completionRate: deptRecords.length > 0 ? round2((deptScored.length / deptRecords.length) * 100) : 0,
        avgScore: deptAvg,
        maxScore: deptScores.length ? round2(Math.max(...deptScores)) : 0,
        minScore: deptScores.length ? round2(Math.min(...deptScores)) : 0,
        excellentCount,
        lowCount,
        distribution: buildDistribution(deptScored).map((item) => ({ level: item.label, count: item.count })),
      };
    })
    .sort((a, b) => b.pendingCount - a.pendingCount || a.department.localeCompare(b.department, 'zh-CN'));

  return {
    totalRecords: realRecords.length,
    scoredCount: scored.length,
    pendingCount: pending.length,
    completionRate: realRecords.length > 0 ? round2((scored.length / realRecords.length) * 100) : 0,
    avgScore,
    maxScore: scores.length ? round2(Math.max(...scores)) : 0,
    minScore: scores.length ? round2(Math.min(...scores)) : 0,
    distribution,
    departments,
  };
};

const buildRisks = (summary: ReturnType<typeof buildMonthlySummary>, readiness?: Awaited<ReturnType<typeof validatePublicationReadiness>>) => {
  const risks: Array<{ type: string; severity: 'info' | 'warning' | 'danger'; title: string; message: string; count?: number; department?: string }> = [];

  if (summary.totalRecords === 0) {
    risks.push({
      type: 'no_tasks',
      severity: 'warning',
      title: '本月尚无绩效任务',
      message: '当前月份没有绩效记录，请先确认 HR 是否已生成考核任务。',
    });
    return risks;
  }

  if (summary.pendingCount > 0) {
    risks.push({
      type: 'pending_scores',
      severity: summary.completionRate < 80 ? 'danger' : 'warning',
      title: '仍有未完成评分',
      message: `还有 ${summary.pendingCount} 条绩效记录未完成评分，完成率 ${summary.completionRate}%。`,
      count: summary.pendingCount,
    });
  }

  summary.departments
    .filter((dept) => dept.pendingCount > 0)
    .slice(0, 5)
    .forEach((dept) => {
      risks.push({
        type: 'department_pending',
        severity: dept.completionRate < 80 ? 'warning' : 'info',
        title: `${dept.department} 未完成`,
        message: `${dept.department} 还有 ${dept.pendingCount} 人未评分，完成率 ${dept.completionRate}%。`,
        count: dept.pendingCount,
        department: dept.department,
      });
    });

  summary.departments
    .filter((dept) => dept.scoredCount >= 3 && dept.avgScore > 0 && (dept.avgScore < scoreLevelThresholds.L3 || dept.avgScore >= scoreLevelThresholds.L5))
    .slice(0, 5)
    .forEach((dept) => {
      risks.push({
        type: 'department_score_anomaly',
        severity: dept.avgScore < scoreLevelThresholds.L3 ? 'warning' : 'info',
        title: `${dept.department} 均分${dept.avgScore < scoreLevelThresholds.L3 ? '偏低' : '偏高'}`,
        message: `${dept.department} 已评分 ${dept.scoredCount} 人，平均分 ${dept.avgScore}。`,
        department: dept.department,
      });
    });

  readiness?.violations.slice(0, 8).forEach((violation) => {
    risks.push({
      type: `publication_${violation.type}`,
      severity: 'warning',
      title: violation.type === 'forced_distribution' ? '2-7-1 分布提醒' : '发布前置条件未满足',
      message: violation.message,
      department: violation.unitKey,
    });
  });

  if (risks.length === 0) {
    risks.push({
      type: 'healthy',
      severity: 'info',
      title: '本月报表状态正常',
      message: '当前没有发现明显的完成进度或分布风险。',
    });
  }

  return risks;
};

// GET /api/analytics/performance-distribution
export const getPerformanceDistribution = asyncHandler(async (req: Request, res: Response) => {
  const { month, department } = req.query;

  const allRecords = await getScopedRecords(req, month as string || new Date().toISOString().slice(0, 7));
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

// GET /api/analytics/report-summary?month=YYYY-MM
export const getReportSummary = asyncHandler(async (req: Request, res: Response) => {
  const targetMonth = String(req.query.month || new Date().toISOString().slice(0, 7));
  if (!validateMonth(targetMonth)) {
    return res.status(400).json({ success: false, message: '月份格式错误，应为 YYYY-MM' });
  }

  const previousMonth = getPreviousMonth(targetMonth);
  const [currentRecords, previousRecords] = await Promise.all([
    getScopedRecords(req, targetMonth),
    getScopedRecords(req, previousMonth),
  ]);
  const summary = buildMonthlySummary(currentRecords);
  const previousSummary = buildMonthlySummary(previousRecords);
  const readiness = isPrivilegedRole(req.user?.role)
    ? await validatePublicationReadiness(targetMonth)
    : undefined;
  const risks = buildRisks(summary, readiness);

  res.json({
    success: true,
    data: {
      month: targetMonth,
      previousMonth,
      scope: isPrivilegedRole(req.user?.role) ? 'company' : 'team',
      generatedAt: new Date().toISOString(),
      overview: {
        totalRecords: summary.totalRecords,
        scoredCount: summary.scoredCount,
        pendingCount: summary.pendingCount,
        completionRate: summary.completionRate,
        avgScore: summary.avgScore,
        maxScore: summary.maxScore,
        minScore: summary.minScore,
        previousAvgScore: previousSummary.avgScore,
        previousCompletionRate: previousSummary.completionRate,
        avgScoreDelta: round2(summary.avgScore - previousSummary.avgScore),
        completionRateDelta: round2(summary.completionRate - previousSummary.completionRate),
      },
      distribution: summary.distribution,
      departments: summary.departments,
      risks,
      publicationReadiness: readiness
        ? {
          ok: readiness.ok,
          participantCount: readiness.participantCount,
          completedCount: readiness.completedCount,
          violations: readiness.violations,
        }
        : null,
    },
  });
});

// GET /api/analytics/department-comparison
export const getDepartmentComparison = asyncHandler(async (req: Request, res: Response) => {
  const { startMonth, endMonth } = req.query;

  const recordsByDepartment = new Map<string, any[]>();

  const pushRecords = (records: any[]) => {
    records
      .filter((record) => record.department && isRealRecord(record) && isScoredRecord(record))
      .forEach((record) => {
        const dept = record.department;
        if (!recordsByDepartment.has(dept)) recordsByDepartment.set(dept, []);
        recordsByDepartment.get(dept)!.push(record);
      });
  };

  if (startMonth && endMonth) {
    const start = new Date(startMonth as string + '-01');
    const end = new Date(endMonth as string + '-01');
    const current = new Date(start);
    while (current <= end) {
      const monthStr = current.toISOString().slice(0, 7);
      pushRecords(await getScopedRecords(req, monthStr));
      current.setMonth(current.getMonth() + 1);
    }
  } else {
    const currentMonth = new Date().toISOString().slice(0, 7);
    pushRecords(await getScopedRecords(req, currentMonth));
  }

  const comparison = Array.from(recordsByDepartment.entries()).map(([dept, allRecords]) => {
    const avgScore = allRecords.reduce((sum, r) => sum + r.totalScore, 0) / allRecords.length;
    const excellentRate = allRecords.filter(r => r.totalScore >= scoreLevelThresholds.L5).length / allRecords.length;
    const poorRate = allRecords.filter(r => r.totalScore < scoreLevelThresholds.L2).length / allRecords.length;

    return {
      department: dept,
      avgScore: parseFloat(avgScore.toFixed(2)),
      excellentRate: parseFloat((excellentRate * 100).toFixed(2)),
      poorRate: parseFloat((poorRate * 100).toFixed(2)),
      totalCount: allRecords.length
    };
  });

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
      if (!(await canAccessEmployeeTrend(req, employeeId as string))) {
        return res.status(403).json({ success: false, message: '无权查看该员工绩效趋势' });
      }
      const record = await PerformanceModel.findByEmployeeIdAndMonth(employeeId as string, monthStr);
      if (record && record.status === 'completed') {
        trend.push({ month: monthStr, score: record.totalScore, grade: record.level || '', rank: record.companyRank || 0 });
      }
    } else {
      const records = await getScopedRecords(req, monthStr);
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
  const scopedRecords = await getScopedRecords(req);
  const scopedEmployeeIds = new Set(scopedRecords.map((record) => record.employeeId));
  const employees = isPrivilegedRole(req.user?.role)
    ? await EmployeeModel.findAll()
    : (await EmployeeModel.findTeamForManager(req.user!.userId)).filter((employee) => scopedEmployeeIds.has(employee.id));
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

  const allRecords = await getScopedRecords(req, targetMonth);
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
        ? ((deptRecords.filter((record) => record.totalScore >= scoreLevelThresholds.L5).length / deptRecords.length) * 100).toFixed(1)
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
