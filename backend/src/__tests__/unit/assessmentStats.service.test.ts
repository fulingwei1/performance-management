import { memoryStore } from '../../config/database';
import { getMonthlyStats, getScoreDistribution } from '../../services/assessmentStats.service';

describe('AssessmentStatsService', () => {
  beforeEach(() => {
    memoryStore.performanceRecords = new Map();
    memoryStore.employees = new Map([
      ['manager-1', {
        id: 'manager-1',
        name: '经理A',
        role: 'manager',
        department: '生产部',
        level: 'senior',
        status: 'active'
      } as any],
    ]);
  });

  const createAssessment = (month: string, employeeId: string, totalScore: number) => {
    memoryStore.employees.set(employeeId, {
      employeeId,
      id: employeeId,
      name: `员工${employeeId}`,
      role: 'employee',
      department: '生产部',
      level: 'junior',
      managerId: 'manager-1',
      status: 'active'
    } as any);

    memoryStore.performanceRecords.set(`record-${employeeId}-${month}`, {
      id: `record-${employeeId}-${month}`,
      employeeId,
      assessorId: 'manager-1',
      month,
      selfSummary: '完成工作',
      nextMonthPlan: '继续推进',
      taskCompletion: totalScore,
      initiative: totalScore,
      projectFeedback: totalScore,
      qualityImprovement: totalScore,
      totalScore,
      managerComment: '评价',
      nextMonthWorkArrangement: '安排',
      groupType: 'low',
      groupRank: 0,
      crossDeptRank: 0,
      departmentRank: 0,
      companyRank: 0,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any);
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
