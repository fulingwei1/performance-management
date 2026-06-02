import { Request, Response } from 'express';
import { PerformanceModel } from '../models/performance.model';
import { asyncHandler } from '../middleware/errorHandler';
import { scoreLevelThresholds } from '../utils/helpers';
import { validatePublicationReadiness } from '../services/publicationReadiness.service';

const SCORE_BUCKETS = [
  { level: 'L5', label: '优秀', min: scoreLevelThresholds.L5, max: null as number | null },
  { level: 'L4', label: '良好', min: scoreLevelThresholds.L4, max: scoreLevelThresholds.L5 },
  { level: 'L3', label: '合格', min: scoreLevelThresholds.L3, max: scoreLevelThresholds.L4 },
  { level: 'L2', label: '待改进', min: scoreLevelThresholds.L2, max: scoreLevelThresholds.L3 },
  { level: 'L1', label: '不合格', min: 0, max: scoreLevelThresholds.L2 },
];

const isScoredRecord = (record: any) =>
  ['completed', 'scored'].includes(record?.status) && Number(record?.totalScore) > 0;

const isSubmittedTaskRecord = (record: any) =>
  ['submitted', 'completed', 'scored'].includes(String(record?.status || ''))
  || Boolean(String(record?.selfSummary || record?.self_summary || '').trim())
  || Boolean(String(record?.nextMonthPlan || record?.next_month_plan || '').trim());

const isRealRecord = (record: any) => !record?.isDemo && !String(record?.id || '').startsWith('demo-');

const getScoreBucket = (score: number) =>
  SCORE_BUCKETS.find((bucket) => score >= bucket.min && (bucket.max === null || score < bucket.max));

const buildDistribution = (records: any[]) =>
  SCORE_BUCKETS.map((bucket) => ({
    label: `${bucket.label}(${bucket.level})`,
    min: bucket.min,
    max: bucket.max,
    count: records.filter((record) => getScoreBucket(Number(record.totalScore))?.level === bucket.level).length,
  }));

const isPrivilegedRole = (role?: string) => role === 'hr' || role === 'gm' || role === 'admin';

const getScopedRecords = async (req: Request, month?: string): Promise<any[]> => {
  if (!req.user) return [];
  if (isPrivilegedRole(req.user.role)) {
    return month ? PerformanceModel.findByMonth(month) : PerformanceModel.findAll();
  }
  return PerformanceModel.findByAssessorId(req.user.userId, month);
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
  const submitted = realRecords.filter(isSubmittedTaskRecord);
  const unsubmitted = realRecords.filter((record) => !isSubmittedTaskRecord(record));
  const scored = realRecords.filter(isScoredRecord);
  const pendingScore = submitted.filter((record) => !isScoredRecord(record));
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
      const deptSubmitted = deptRecords.filter(isSubmittedTaskRecord);
      const deptScored = deptRecords.filter(isScoredRecord);
      const deptPendingScore = deptSubmitted.filter((record) => !isScoredRecord(record));
      const deptScores = deptScored.map((record) => Number(record.totalScore)).filter(Number.isFinite);
      const deptAvg = deptScores.length
        ? round2(deptScores.reduce((sum, score) => sum + score, 0) / deptScores.length)
        : 0;
      const lowCount = deptScored.filter((record) => Number(record.totalScore) < scoreLevelThresholds.L3).length;
      const excellentCount = deptScored.filter((record) => Number(record.totalScore) >= scoreLevelThresholds.L5).length;
      return {
        department,
        totalCount: deptRecords.length,
        submittedCount: deptSubmitted.length,
        unsubmittedCount: deptRecords.length - deptSubmitted.length,
        submissionRate: deptRecords.length > 0 ? round2((deptSubmitted.length / deptRecords.length) * 100) : 0,
        scoredCount: deptScored.length,
        pendingCount: deptPendingScore.length,
        scorePendingCount: deptPendingScore.length,
        scoreCompletionRate: deptRecords.length > 0 ? round2((deptScored.length / deptRecords.length) * 100) : 0,
        completionRate: deptRecords.length > 0 ? round2((deptSubmitted.length / deptRecords.length) * 100) : 0,
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
    submittedCount: submitted.length,
    unsubmittedCount: unsubmitted.length,
    submissionRate: realRecords.length > 0 ? round2((submitted.length / realRecords.length) * 100) : 0,
    scoredCount: scored.length,
    pendingCount: pendingScore.length,
    scorePendingCount: pendingScore.length,
    scoreCompletionRate: realRecords.length > 0 ? round2((scored.length / realRecords.length) * 100) : 0,
    completionRate: realRecords.length > 0 ? round2((submitted.length / realRecords.length) * 100) : 0,
    avgScore,
    maxScore: scores.length ? round2(Math.max(...scores)) : 0,
    minScore: scores.length ? round2(Math.min(...scores)) : 0,
    distribution,
    departments,
  };
};

const toFocusPerson = (record: any, previousRecord?: any) => {
  const currentScore = Number(record.totalScore || 0);
  const previousScore = previousRecord && isScoredRecord(previousRecord)
    ? Number(previousRecord.totalScore || 0)
    : null;
  const delta = previousScore && currentScore > 0 ? round2(currentScore - previousScore) : null;

  return {
    recordId: record.id,
    employeeId: record.employeeId,
    employeeName: record.employeeName || record.employeeId,
    department: record.department || '未分配部门',
    subDepartment: record.subDepartment || '',
    assessorName: record.assessorName || '',
    score: currentScore > 0 ? round2(currentScore) : null,
    previousScore: previousScore ? round2(previousScore) : null,
    delta,
    status: record.status || 'unknown',
  };
};

const buildFocusLists = (currentRecords: any[], previousRecords: any[]) => {
  const realCurrent = currentRecords.filter(isRealRecord);
  const previousByEmployee = new Map<string, any>();
  previousRecords
    .filter(isRealRecord)
    .forEach((record) => previousByEmployee.set(record.employeeId, record));

  const scored = realCurrent.filter(isScoredRecord);
  const pendingSubmission = realCurrent.filter((record) => !isSubmittedTaskRecord(record));
  const pendingScore = realCurrent.filter((record) => isSubmittedTaskRecord(record) && !isScoredRecord(record));

  const lowScores = scored
    .filter((record) => Number(record.totalScore || 0) < scoreLevelThresholds.L3)
    .sort((a, b) => Number(a.totalScore || 0) - Number(b.totalScore || 0))
    .slice(0, 10)
    .map((record) => toFocusPerson(record, previousByEmployee.get(record.employeeId)));

  const topScores = scored
    .sort((a, b) => Number(b.totalScore || 0) - Number(a.totalScore || 0))
    .slice(0, 10)
    .map((record) => toFocusPerson(record, previousByEmployee.get(record.employeeId)));

  const declined = scored
    .map((record) => toFocusPerson(record, previousByEmployee.get(record.employeeId)))
    .filter((person) => typeof person.delta === 'number' && person.delta <= -0.1)
    .sort((a, b) => Number(a.delta || 0) - Number(b.delta || 0))
    .slice(0, 10);

  const pendingPeople = pendingScore
    .sort((a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'zh-CN') || String(a.employeeName || '').localeCompare(String(b.employeeName || ''), 'zh-CN'))
    .slice(0, 20)
    .map((record) => toFocusPerson(record, previousByEmployee.get(record.employeeId)));

  const pendingSubmissionPeople = pendingSubmission
    .sort((a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'zh-CN') || String(a.employeeName || '').localeCompare(String(b.employeeName || ''), 'zh-CN'))
    .slice(0, 20)
    .map((record) => toFocusPerson(record, previousByEmployee.get(record.employeeId)));

  return {
    pending: pendingPeople,
    pendingSubmission: pendingSubmissionPeople,
    pendingScore: pendingPeople,
    lowScores,
    topScores,
    declined,
  };
};

const buildExecutiveText = (
  month: string,
  summary: ReturnType<typeof buildMonthlySummary>,
  previousSummary: ReturnType<typeof buildMonthlySummary>,
  focus: ReturnType<typeof buildFocusLists>,
) => {
  if (summary.totalRecords === 0) {
    return `${month} 尚未生成绩效考核任务，报表暂不能形成有效分析。`;
  }

  const avgText = summary.avgScore > 0 ? `平均分 ${summary.avgScore.toFixed(2)}` : '暂未形成平均分';
  const avgDelta = summary.avgScore - previousSummary.avgScore;
  const avgTrend = previousSummary.avgScore > 0
    ? avgDelta > 0
      ? `较上月上升 ${round2(avgDelta).toFixed(2)}`
      : avgDelta < 0
        ? `较上月下降 ${Math.abs(round2(avgDelta)).toFixed(2)}`
        : '与上月持平'
    : '暂无上月对比';
  const submitText = summary.unsubmittedCount > 0
    ? `仍有 ${summary.unsubmittedCount} 人未提交总结/计划`
    : '员工提交已全部完成';
  const pendingText = summary.pendingCount > 0
    ? `仍有 ${summary.pendingCount} 人待上级评分`
    : '上级评分已全部完成';
  const focusText = [
    focus.lowScores.length > 0 ? `${focus.lowScores.length} 名低分关注人员` : '',
    focus.declined.length > 0 ? `${focus.declined.length} 名环比下降明显人员` : '',
  ].filter(Boolean).join('，');

  return `${month} 参与 ${summary.totalRecords} 人，已提交 ${summary.submittedCount} 人，提交完成率 ${summary.completionRate.toFixed(1)}%；已评分 ${summary.scoredCount} 人，评分完成率 ${summary.scoreCompletionRate.toFixed(1)}%，${avgText}，${avgTrend}；${submitText}，${pendingText}${focusText ? `；需关注 ${focusText}` : '。'}`;
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

  if (summary.unsubmittedCount > 0) {
    risks.push({
      type: 'pending_submission',
      severity: summary.completionRate < 80 ? 'danger' : 'warning',
      title: '仍有员工未提交',
      message: `还有 ${summary.unsubmittedCount} 人未提交工作总结/下月计划，提交完成率 ${summary.completionRate}%。`,
      count: summary.unsubmittedCount,
    });
  }

  if (summary.pendingCount > 0) {
    risks.push({
      type: 'pending_scores',
      severity: summary.scoreCompletionRate < 80 ? 'danger' : 'warning',
      title: '仍有未完成评分',
      message: `还有 ${summary.pendingCount} 条已提交记录未完成上级评分，评分完成率 ${summary.scoreCompletionRate}%。`,
      count: summary.pendingCount,
    });
  }

  summary.departments
    .filter((dept) => dept.unsubmittedCount > 0 || dept.pendingCount > 0)
    .slice(0, 5)
    .forEach((dept) => {
      risks.push({
        type: 'department_pending',
        severity: dept.completionRate < 80 ? 'warning' : 'info',
        title: `${dept.department} 进度未完成`,
        message: `${dept.department} 未提交 ${dept.unsubmittedCount} 人，待评分 ${dept.pendingCount} 人；提交率 ${dept.completionRate}%，评分率 ${dept.scoreCompletionRate}%。`,
        count: dept.unsubmittedCount + dept.pendingCount,
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
  const focus = buildFocusLists(currentRecords, previousRecords);
  const executiveText = buildExecutiveText(targetMonth, summary, previousSummary, focus);
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
      executiveText,
      overview: {
        totalRecords: summary.totalRecords,
        submittedCount: summary.submittedCount,
        unsubmittedCount: summary.unsubmittedCount,
        submissionRate: summary.submissionRate,
        scoredCount: summary.scoredCount,
        pendingCount: summary.pendingCount,
        scorePendingCount: summary.scorePendingCount,
        scoreCompletionRate: summary.scoreCompletionRate,
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
      focus,
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
