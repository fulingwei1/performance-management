import { memoryStore } from '../../config/database';
import { MonthlyAssessmentModel } from '../../models/monthlyAssessment.model';
import { getMonthlyStats, getScoreDistribution } from '../../services/assessmentStats.service';

describe('AssessmentStatsService', () => {
  beforeEach(() => {
    memoryStore.monthlyAssessments = new Map();
  });

  const createAssessment = (month: string, employeeId: string, totalScore: number) => {
    return MonthlyAssessmentModel.create({
      employeeId,
      employeeName: `员工${employeeId}`,
      month,
      templateId: 'template-1',
      templateName: '月度绩效模板',
      departmentType: 'production',
      scores: [
        {
          metricName: '质量',
          metricCode: 'quality',
          weight: 1,
          level: 'L3',
          score: totalScore
        }
      ],
      totalScore,
      evaluatorId: 'manager-1',
      evaluatorName: '经理A'
    });
  };

  it('should calculate monthly stats and level distribution from monthly assessments', async () => {
    await createAssessment('2026-04', 'emp-1', 1.5);
    await createAssessment('2026-04', 'emp-2', 1.2);
    await createAssessment('2026-04', 'emp-3', 0.95);
    await createAssessment('2026-04', 'emp-4', 0.7);
    await createAssessment('2026-04', 'emp-5', 0.5);
    await createAssessment('2026-03', 'emp-6', 1.5);

    const stats = await getMonthlyStats('2026-04');

    expect(stats).toEqual({
      month: '2026-04',
      totalAssessments: 5,
      avgScore: 0.97,
      maxScore: 1.5,
      minScore: 0.5,
      l5Count: 1,
      l4Count: 1,
      l3Count: 1,
      l2Count: 1,
      l1Count: 1
    });
  });

  it('should return structured empty monthly stats when no assessments exist', async () => {
    const stats = await getMonthlyStats('2026-05');

    expect(stats).toEqual({
      month: '2026-05',
      totalAssessments: 0,
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      l5Count: 0,
      l4Count: 0,
      l3Count: 0,
      l2Count: 0,
      l1Count: 0
    });
  });

  it('should calculate score distribution for a month or all months', async () => {
    await createAssessment('2026-04', 'emp-1', 1.5);
    await createAssessment('2026-04', 'emp-2', 1.2);
    await createAssessment('2026-05', 'emp-3', 0.5);

    await expect(getScoreDistribution('2026-04')).resolves.toEqual({
      l5: 1,
      l4: 1,
      l3: 0,
      l2: 0,
      l1: 0
    });

    await expect(getScoreDistribution()).resolves.toEqual({
      l5: 1,
      l4: 1,
      l3: 0,
      l2: 0,
      l1: 1
    });
  });
});
