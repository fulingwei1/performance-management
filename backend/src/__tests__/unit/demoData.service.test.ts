import { memoryStore } from '../../config/database';
import { DemoDataService } from '../../services/demoData.service';
import { validatePublicationReadiness } from '../../services/publicationReadiness.service';

describe('DemoDataService', () => {
  beforeEach(() => {
    memoryStore.employees = new Map();
    memoryStore.performanceRecords = new Map();
    memoryStore.todos = new Map();
    memoryStore.notifications = new Map();
    (memoryStore as any).employeeQuarterlySummaries = new Map();

    memoryStore.employees.set('gm001', {
      id: 'gm001',
      name: '总经理',
      role: 'gm',
      department: '总经办',
      subDepartment: '',
      level: 'senior',
      status: 'active',
    } as any);
    memoryStore.employees.set('m001', {
      id: 'm001',
      name: '经理A',
      role: 'manager',
      department: '工程技术中心',
      subDepartment: '测试部',
      level: 'senior',
      managerId: 'gm001',
      status: 'active',
    } as any);
    memoryStore.employees.set('e001', {
      id: 'e001',
      name: '员工A',
      role: 'employee',
      department: '工程技术中心',
      subDepartment: '测试部',
      level: 'junior',
      managerId: 'm001',
      status: 'active',
    } as any);
  });

  it('generates isolated demo performance records for eligible employees and months', async () => {
    const result = await DemoDataService.generatePerformanceDemoData({
      endMonth: '2026-05',
      monthCount: 2,
    });

    expect(result).toMatchObject({
      months: ['2026-04', '2026-05'],
      employeeCount: 2,
      createdCount: 4,
      skippedCount: 0,
    });

    const records = Array.from(memoryStore.performanceRecords.values()) as any[];
    expect(records).toHaveLength(4);
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'demo-perf-e001-2026-05',
        employeeId: 'e001',
        assessorId: 'm001',
        month: '2026-05',
        status: 'completed',
        isDemo: true,
      }),
      expect.objectContaining({
        id: 'demo-perf-m001-2026-05',
        employeeId: 'm001',
        assessorId: 'gm001',
        month: '2026-05',
        status: 'completed',
        isDemo: true,
      }),
    ]));
  });

  it('clears only demo data and keeps real performance records', async () => {
    await DemoDataService.generatePerformanceDemoData({ endMonth: '2026-05', monthCount: 1 });
    memoryStore.performanceRecords.set('real-e001-2026-05', {
      id: 'real-e001-2026-05',
      employeeId: 'e001',
      assessorId: 'm001',
      month: '2026-05',
      selfSummary: '真实工作总结',
      nextMonthPlan: '真实计划',
      taskCompletion: 1,
      initiative: 1,
      projectFeedback: 1,
      qualityImprovement: 1,
      totalScore: 1,
      managerComment: '真实评价',
      nextMonthWorkArrangement: '真实安排',
      groupType: 'low',
      groupRank: 0,
      crossDeptRank: 0,
      departmentRank: 0,
      companyRank: 0,
      status: 'completed',
    } as any);

    const result = await DemoDataService.clearDemoData();

    expect(result.performanceRecordsDeleted).toBe(2);
    expect(memoryStore.performanceRecords.has('real-e001-2026-05')).toBe(true);
    expect(Array.from(memoryStore.performanceRecords.keys())).toEqual(['real-e001-2026-05']);
  });

  it('generates demo scores with enough bottom performers for 2-7-1 publication checks', async () => {
    const stableMiddleScoreIds = [
      'x0001', 'x0002', 'x0003', 'x0005', 'x0007',
      'x0008', 'x0010', 'x0011', 'x0012', 'x0013',
      'x0015', 'x0017', 'x0018', 'x0019', 'x0020',
      'x0022', 'x0023', 'x0025', 'x0027', 'x0028',
    ];

    stableMiddleScoreIds.forEach((id, index) => {
      memoryStore.employees.set(id, {
        id,
        name: `演示员工${index}`,
        role: 'employee',
        department: '制造中心',
        subDepartment: '生产部/机电装配组',
        level: 'junior',
        managerId: 'm001',
        status: 'active',
      } as any);
    });

    await DemoDataService.generatePerformanceDemoData({ endMonth: '2026-05', monthCount: 1 });

    const unitRecords = Array.from(memoryStore.performanceRecords.values()).filter((record: any) => (
      record.month === '2026-05'
      && record.department === '制造中心'
      && record.subDepartment === '生产部/机电装配组'
    )) as any[];
    const bottomCount = unitRecords.filter((record) => Number(record.totalScore) < 0.9).length;
    const topCount = unitRecords.filter((record) => Number(record.totalScore) >= 1.4).length;

    expect(unitRecords).toHaveLength(20);
    expect(bottomCount).toBeGreaterThanOrEqual(2);
    expect(topCount).toBeLessThanOrEqual(4);
    await expect(validatePublicationReadiness('2026-05')).resolves.toMatchObject({
      ok: true,
    });
  });
});
