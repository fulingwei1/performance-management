import { memoryStore } from '../../config/database';
import { performanceController } from '../../controllers/performance.controller';

describe('performanceController hierarchy permissions', () => {
  beforeEach(() => {
    memoryStore.employees = new Map();
    memoryStore.performanceRecords = new Map();
    memoryStore.systemSettings = new Map();
    memoryStore.assessmentTemplates = new Map();

    const base = {
      department: '工程技术中心',
      subDepartment: 'PLC 部',
      level: 'senior',
      status: 'active',
    };
    memoryStore.employees.set('m008', { ...base, id: 'm008', name: '王俊', role: 'manager', managerId: 'gm001' } as any);
    memoryStore.employees.set('e124', { ...base, id: 'e124', name: '杨帮', role: 'manager', managerId: 'm008', subDepartment: 'PLC 部/PLC四组' } as any);
    memoryStore.employees.set('e020', { ...base, id: 'e020', name: '黄亿豪', role: 'employee', managerId: 'e124', subDepartment: 'PLC 部/PLC四组', level: 'junior' } as any);
    memoryStore.assessmentTemplates.set('template-eng-default', {
      id: 'template-eng-default',
      name: '工程技术部门标准模板',
      department_type: 'engineering',
      is_default: true,
      status: 'active',
      applicable_roles: [],
      applicable_levels: [],
      applicable_positions: [],
      priority: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

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

  it('uses current hierarchy, not historical assessor_id, when viewing a record', async () => {
    memoryStore.employees.set('e020', {
      ...(memoryStore.employees.get('e020') as any),
      managerId: 'm008',
    } as any);

    const oldAssessorJson = jest.fn();
    const oldAssessorStatus = jest.fn().mockReturnValue({ json: oldAssessorJson });
    const oldAssessorNext = jest.fn();

    performanceController.getRecordById({
      user: { userId: 'e124', id: 'e124', role: 'manager' },
      params: { id: 'rec-e020-2026-04' },
    } as any, { status: oldAssessorStatus, json: oldAssessorJson } as any, oldAssessorNext);

    await new Promise(process.nextTick);

    expect(oldAssessorStatus).toHaveBeenCalledWith(403);
    expect(oldAssessorJson).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: '无权访问该绩效记录',
    }));

    const newAssessorJson = jest.fn();
    const newAssessorStatus = jest.fn().mockReturnValue({ json: newAssessorJson });
    const newAssessorNext = jest.fn();

    performanceController.getRecordById({
      user: { userId: 'm008', id: 'm008', role: 'manager' },
      params: { id: 'rec-e020-2026-04' },
    } as any, { status: newAssessorStatus, json: newAssessorJson } as any, newAssessorNext);

    await new Promise(process.nextTick);

    expect(newAssessorStatus).not.toHaveBeenCalledWith(403);
    expect(newAssessorJson).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ employeeId: 'e020' }),
    }));
  });

  it('generates monthly tasks only for active employees with a valid manager_id relationship', async () => {
    memoryStore.systemSettings!.set('performance_ranking_config', {
      id: 1,
      settingKey: 'performance_ranking_config',
      settingValue: JSON.stringify({
        version: 1,
        participation: {
          mode: 'include',
          enabledUnitKeys: ['工程技术中心'],
          includedUnitKeys: ['工程技术中心'],
          excludedUnitKeys: [],
          includedEmployeeIds: [],
          excludedEmployeeIds: [],
        },
        groupRank: {
          defaultStrategy: { type: 'by_high_low' },
          perUnit: {},
        },
        templateAssignments: {},
        mergeRankGroups: [],
      }),
      settingType: 'json',
      category: 'performance',
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    memoryStore.employees.set('e-no-manager', {
      department: '工程技术中心',
      subDepartment: 'PLC 部',
      level: 'senior',
      status: 'active',
      id: 'e-no-manager',
      name: '无上级员工',
      role: 'employee',
      managerId: '',
    } as any);
    memoryStore.employees.set('e-self-manager', {
      department: '工程技术中心',
      subDepartment: 'PLC 部',
      level: 'senior',
      status: 'active',
      id: 'e-self-manager',
      name: '自指上级员工',
      role: 'employee',
      managerId: 'e-self-manager',
    } as any);
    memoryStore.employees.set('e-excluded-unit', {
      department: '人力行政部',
      subDepartment: '行政组',
      level: 'junior',
      status: 'active',
      id: 'e-excluded-unit',
      name: '未纳入部门员工',
      role: 'employee',
      managerId: 'm008',
    } as any);

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as any;
    const next = jest.fn();

    performanceController.generateTasks({
      user: { userId: 'hr001', id: 'hr001', role: 'hr' },
      body: { month: '2026-05' },
    } as any, res, next);

    await new Promise(process.nextTick);

    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ createdCount: 2, total: 2 }),
    }));
    expect(memoryStore.performanceRecords.get('rec-e124-2026-05')).toMatchObject({
      employeeId: 'e124',
      assessorId: 'm008',
    });
    expect(memoryStore.performanceRecords.get('rec-e020-2026-05')).toMatchObject({
      employeeId: 'e020',
      assessorId: 'e124',
    });
    expect(memoryStore.performanceRecords.has('rec-m008-2026-05')).toBe(false);
    expect(memoryStore.performanceRecords.has('rec-e-no-manager-2026-05')).toBe(false);
    expect(memoryStore.performanceRecords.has('rec-e-self-manager-2026-05')).toBe(false);
    expect(memoryStore.performanceRecords.has('rec-e-excluded-unit-2026-05')).toBe(false);
  });
});
