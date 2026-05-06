import { memoryStore } from '../../config/database';
import { PerformanceModel } from '../../models/performance.model';

describe('PerformanceModel.updateRanks', () => {
  beforeEach(() => {
    memoryStore.employees = new Map();
    memoryStore.performanceRecords = new Map();
    memoryStore.systemSettings = new Map();
  });

  const addRecord = (id: string, employeeId: string, totalScore: number) => {
    memoryStore.performanceRecords.set(id, {
      id,
      employeeId,
      assessorId: 'm001',
      month: '2026-05',
      department: '工程技术中心',
      subDepartment: '测试部',
      employeeLevel: 'junior',
      selfSummary: '总结',
      nextMonthPlan: '计划',
      taskCompletion: totalScore,
      initiative: totalScore,
      projectFeedback: totalScore,
      qualityImprovement: totalScore,
      totalScore,
      normalizedScore: totalScore,
      managerComment: '评价',
      nextMonthWorkArrangement: '安排',
      groupType: 'low',
      groupRank: 0,
      crossDeptRank: 0,
      departmentRank: 0,
      companyRank: 0,
      status: 'completed',
    } as any);
  };

  it('assigns the same dense rank to records with identical scores', async () => {
    addRecord('rank-a', 'e001', 1.41);
    addRecord('rank-b', 'e002', 1.41);
    addRecord('rank-c', 'e003', 1.2);

    await PerformanceModel.updateRanks('2026-05');

    const a = memoryStore.performanceRecords.get('rank-a') as any;
    const b = memoryStore.performanceRecords.get('rank-b') as any;
    const c = memoryStore.performanceRecords.get('rank-c') as any;

    expect(a.companyRank).toBe(1);
    expect(b.companyRank).toBe(1);
    expect(c.companyRank).toBe(2);
    expect(a.departmentRank).toBe(1);
    expect(b.departmentRank).toBe(1);
    expect(c.departmentRank).toBe(2);
    expect(a.groupRank).toBe(1);
    expect(b.groupRank).toBe(1);
    expect(c.groupRank).toBe(2);
  });
});
