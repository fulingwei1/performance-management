/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportSummaryCard, type ReportSummaryData } from '../ReportSummaryCard';

const summary: ReportSummaryData = {
  month: '2026-04',
  previousMonth: '2026-03',
  scope: 'company',
  executiveText: '2026-04 参与 100 人，已评分 80 人，完成率 80.0%。',
  overview: {
    totalRecords: 100,
    scoredCount: 80,
    pendingCount: 20,
    completionRate: 80,
    avgScore: 1.12,
    maxScore: 1.45,
    minScore: 0.72,
    previousAvgScore: 1.08,
    previousCompletionRate: 70,
    avgScoreDelta: 0.04,
    completionRateDelta: 10,
  },
  distribution: [
    { label: '优秀(L5)', count: 12, ratio: 15 },
    { label: '良好(L4)', count: 28, ratio: 35 },
    { label: '合格(L3)', count: 30, ratio: 37.5 },
    { label: '待改进(L2)', count: 8, ratio: 10 },
    { label: '不合格(L1)', count: 2, ratio: 2.5 },
  ],
  departments: [
    {
      department: '工程技术中心',
      totalCount: 40,
      scoredCount: 30,
      pendingCount: 10,
      completionRate: 75,
      avgScore: 1.1,
      maxScore: 1.42,
      minScore: 0.8,
      excellentCount: 4,
      lowCount: 3,
    },
  ],
  focus: {
    pending: [
      {
        recordId: 'rec-pending',
        employeeId: 'e001',
        employeeName: '待评员工',
        department: '测试部',
        score: null,
        previousScore: null,
        delta: null,
        status: 'submitted',
      },
    ],
    lowScores: [
      {
        recordId: 'rec-low',
        employeeId: 'e002',
        employeeName: '低分员工',
        department: '测试部',
        score: 0.82,
        previousScore: 1.02,
        delta: -0.2,
        status: 'completed',
      },
    ],
    topScores: [],
    declined: [],
  },
  risks: [
    {
      type: 'pending_scores',
      severity: 'warning',
      title: '仍有未完成评分',
      message: '还有 20 条绩效记录未完成评分。',
      count: 20,
    },
  ],
  publicationReadiness: {
    ok: false,
    participantCount: 100,
    completedCount: 80,
  },
};

describe('ReportSummaryCard', () => {
  it('renders executive summary metrics, risks and department overview', () => {
    render(<ReportSummaryCard summary={summary} title="HR 月度执行摘要" />);

    expect(screen.getByText('HR 月度执行摘要')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
    expect(screen.getByText('1.12')).toBeInTheDocument();
    expect(screen.getByText('80/100')).toBeInTheDocument();
    expect(screen.getByText('仍有未完成评分')).toBeInTheDocument();
    expect(screen.getByText('待评员工')).toBeInTheDocument();
    expect(screen.getByText('低分员工')).toBeInTheDocument();
    expect(screen.getByText('工程技术中心')).toBeInTheDocument();
  });
});
