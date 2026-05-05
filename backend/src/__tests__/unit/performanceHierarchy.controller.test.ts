import { memoryStore } from '../../config/database';
import { performanceController } from '../../controllers/performance.controller';

describe('performanceController hierarchy permissions', () => {
  beforeEach(() => {
    memoryStore.employees = new Map();
    memoryStore.performanceRecords = new Map();
    memoryStore.systemSettings = new Map();

    const base = {
      department: '工程技术中心',
      subDepartment: 'PLC 部',
      level: 'senior',
      status: 'active',
    };
    memoryStore.employees.set('m008', { ...base, id: 'm008', name: '王俊', role: 'manager', managerId: 'gm001' } as any);
    memoryStore.employees.set('e124', { ...base, id: 'e124', name: '杨帮', role: 'manager', managerId: 'm008', subDepartment: 'PLC 部/PLC四组' } as any);
    memoryStore.employees.set('e020', { ...base, id: 'e020', name: '黄亿豪', role: 'employee', managerId: 'e124', subDepartment: 'PLC 部/PLC四组', level: 'junior' } as any);

    memoryStore.performanceRecords.set('rec-e020-2026-04', {
      id: 'rec-e020-2026-04',
      employeeId: 'e020',
      assessorId: 'e124',
      month: '2026-04',
      selfSummary: '完成四月工作',
      nextMonthPlan: '五月继续推进',
      taskCompletion: 1,
      initiative: 1,
      projectFeedback: 1,
      qualityImprovement: 1,
      totalScore: 1,
      managerComment: '杨帮初评',
      nextMonthWorkArrangement: '继续跟进项目',
      groupType: 'high',
      groupRank: 0,
      crossDeptRank: 0,
      departmentRank: 0,
      companyRank: 0,
      status: 'completed',
      frozen: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  });

  it('allows an upper manager to adjust a completed score from a subordinate manager', async () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as any;
    const next = jest.fn();

    performanceController.submitScore({
      user: { userId: 'm008', id: 'm008', role: 'manager' },
      body: {
        id: 'rec-e020-2026-04',
        taskCompletion: 1.2,
        initiative: 1.1,
        projectFeedback: 1,
        qualityImprovement: 1,
        managerComment: '上级复核后调整评分',
        nextMonthWorkArrangement: '继续做好项目交付',
      },
    } as any, res, next);

    await new Promise(process.nextTick);

    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: '评分提交成功',
    }));
    expect(memoryStore.performanceRecords.get('rec-e020-2026-04')).toMatchObject({
      assessorId: 'e124',
      totalScore: 1.11,
      managerComment: '上级复核后调整评分',
    });
  });
});
