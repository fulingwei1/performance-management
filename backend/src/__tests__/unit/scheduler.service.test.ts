import { memoryStore } from '../../config/database';
import { SchedulerService } from '../../services/scheduler.service';

describe('SchedulerService monthly performance task generation', () => {
  beforeEach(() => {
    memoryStore.employees = new Map();
    memoryStore.performanceRecords = new Map();
    memoryStore.notifications = new Map();
    memoryStore.todos = new Map();
    memoryStore.systemSettings = new Map();
  });

  it('should generate previous-month performance records, todos and notifications on monthly trigger', async () => {
    memoryStore.employees.set('m001', {
      id: 'm001',
      name: '经理A',
      role: 'manager',
      department: '工程技术中心',
      subDepartment: '测试部',
      level: 'senior',
      status: 'active'
    } as any);
    memoryStore.employees.set('e001', {
      id: 'e001',
      name: '员工A',
      role: 'employee',
      department: '工程技术中心',
      subDepartment: '测试部',
      level: 'junior',
      managerId: 'm001',
      status: 'active'
    } as any);
    memoryStore.employees.set('hr001', {
      id: 'hr001',
      name: 'HR',
      role: 'hr',
      department: '人力资源部',
      subDepartment: '人力资源部',
      level: 'senior',
      status: 'active'
    } as any);

    const result = await SchedulerService.generatePreviousMonthPerformanceTasks(new Date('2026-04-01T08:00:00+08:00'));

    expect(result).toEqual({
      month: '2026-03',
      createdCount: 2,
      skippedCount: 0,
      notificationCount: 2,
      todoCount: 2,
      total: 2
    });

    expect(memoryStore.performanceRecords.has('rec-e001-2026-03')).toBe(true);
    expect(memoryStore.performanceRecords.has('rec-m001-2026-03')).toBe(true);
    expect(memoryStore.performanceRecords.has('rec-hr001-2026-03')).toBe(false);

    const todos = Array.from(memoryStore.todos!.values());
    expect(todos).toHaveLength(2);
    expect(todos).toEqual(expect.arrayContaining([
      expect.objectContaining({
        employeeId: 'e001',
        type: 'work_summary',
        title: '提交2026-03月度工作总结',
        link: '/employee/summary?month=2026-03',
        relatedId: 'performance-summary-2026-03'
      })
    ]));

    const notifications = Array.from(memoryStore.notifications!.values());
    expect(notifications).toHaveLength(2);
    expect(notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        userId: 'e001',
        title: '请提交2026-03月度工作总结',
        link: '/employee/summary?month=2026-03'
      })
    ]));
  });

  it('should map deadline reminder todos to existing front-end routes', () => {
    expect((SchedulerService as any).getTodoLink('work_summary')).toBe('/employee/summary');
    expect((SchedulerService as any).getTodoLink('manager_review')).toBe('/manager/scoring');
    expect((SchedulerService as any).getTodoLink('hr_review')).toBe('/hr/assessment-publication');
    expect((SchedulerService as any).getTodoLink('appeal_review')).toBe('/hr/appeals');
    expect((SchedulerService as any).getTodoLink('goal_approval')).toBe('/manager/goal-approval');
    expect((SchedulerService as any).getTodoLink('unknown_type')).toBe('/employee/dashboard');
  });

  it('should be idempotent for an already generated previous-month task batch', async () => {
    memoryStore.employees.set('m001', {
      id: 'm001',
      name: '经理A',
      role: 'manager',
      department: '工程技术中心',
      subDepartment: '测试部',
      level: 'senior',
      status: 'active'
    } as any);
    memoryStore.employees.set('e001', {
      id: 'e001',
      name: '员工A',
      role: 'employee',
      department: '工程技术中心',
      subDepartment: '测试部',
      level: 'junior',
      managerId: 'm001',
      status: 'active'
    } as any);

    await SchedulerService.generatePreviousMonthPerformanceTasks(new Date('2026-04-01T08:00:00+08:00'));
    const second = await SchedulerService.generatePreviousMonthPerformanceTasks(new Date('2026-04-01T08:00:00+08:00'));

    expect(second).toMatchObject({
      month: '2026-03',
      createdCount: 0,
      skippedCount: 2,
      notificationCount: 0,
      todoCount: 0,
      total: 2
    });
    expect(Array.from(memoryStore.performanceRecords.values()).filter((r: any) => r.month === '2026-03')).toHaveLength(2);
    expect(Array.from(memoryStore.todos!.values())).toHaveLength(2);
    expect(Array.from(memoryStore.notifications!.values())).toHaveLength(2);
  });
});
