import { automationController } from '../../controllers/automation.controller';
import { SchedulerService } from '../../services/scheduler.service';

describe('automationController deadline reminders', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should treat body.month as the target performance month when generating tasks', async () => {
    const generatePreviousMonthPerformanceTasks = jest
      .spyOn(SchedulerService, 'generatePreviousMonthPerformanceTasks')
      .mockResolvedValue({
        month: '2026-05',
        createdCount: 1,
        skippedCount: 0,
        notificationCount: 0,
        todoCount: 0,
        emailCount: 0,
        total: 1,
      });

    const json = jest.fn();
    const res = { json } as any;
    const next = jest.fn();

    automationController.generateMonthlyTasks({ body: { month: '2026-05' }, query: {} } as any, res, next);
    await new Promise(process.nextTick);

    expect(next).not.toHaveBeenCalled();
    expect(generatePreviousMonthPerformanceTasks).toHaveBeenCalledTimes(1);
    const referenceDate = generatePreviousMonthPerformanceTasks.mock.calls[0][0] as Date;
    expect(referenceDate.getFullYear()).toBe(2026);
    expect(referenceDate.getMonth()).toBe(5);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should delegate deadline reminder checks to the scheduler workflow', async () => {
    const dailyReminderWorkflow = jest
      .spyOn(SchedulerService, 'dailyReminderWorkflow')
      .mockResolvedValue(undefined);
    const checkOverdueTodos = jest
      .spyOn(SchedulerService, 'checkOverdueTodos')
      .mockResolvedValue(undefined);

    const json = jest.fn();
    const res = { json } as any;
    const next = jest.fn();

    automationController.checkDeadlineReminders({
      query: { force: 'true' },
      body: { month: '2026-05' },
      user: { userId: 'hr001', role: 'hr' },
    } as any, res, next);
    await new Promise(process.nextTick);

    expect(next).not.toHaveBeenCalled();
    expect(dailyReminderWorkflow).toHaveBeenCalledWith(true, '2026-05', {
      allowDuplicateWecom: false,
      requestedBy: 'hr001',
    });
    expect(checkOverdueTodos).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should pass excludeFromAssessment when HR deletes a resigned employee task', async () => {
    const deletePerformanceTaskForEmployee = jest
      .spyOn(SchedulerService, 'deletePerformanceTaskForEmployee')
      .mockResolvedValue({
        month: '2026-05',
        employeeId: 'e001',
        recordDeleted: false,
        recordCancelled: true,
        newStatus: 'exempted',
        todoDeletedCount: 1,
        notificationDeletedCount: 1,
        assessmentExcluded: true,
      });

    const json = jest.fn();
    const res = { json } as any;
    const next = jest.fn();

    automationController.deleteEmployeeTask({
      body: { employeeId: 'e001', month: '2026-05', excludeFromAssessment: true },
      query: {},
      user: { userId: 'hr001', role: 'hr' },
    } as any, res, next);
    await new Promise(process.nextTick);

    expect(next).not.toHaveBeenCalled();
    expect(deletePerformanceTaskForEmployee).toHaveBeenCalledWith('e001', '2026-05', {
      excludeFromAssessment: true,
      operatedBy: 'hr001',
    });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: expect.stringContaining('已加入考核排除名单'),
    }));
  });

  it('should batch remind selected employee tasks and keep per-employee results', async () => {
    const remindPerformanceTaskForEmployee = jest
      .spyOn(SchedulerService, 'remindPerformanceTaskForEmployee')
      .mockImplementation(async (employeeId: string) => {
        if (employeeId === 'e002') throw new Error('该员工没有绩效任务');
        return {
          month: '2026-05',
          employeeId,
          employeeName: employeeId === 'e001' ? '员工A' : '员工C',
          taskType: '员工总结',
          wecomSent: true,
        } as any;
      });

    const json = jest.fn();
    const res = { json } as any;
    const next = jest.fn();

    automationController.batchRemindEmployeeTasks({
      body: { employeeIds: ['e001', 'e002', 'e003'], month: '2026-05' },
      query: {},
      user: { userId: 'hr001', role: 'hr' },
    } as any, res, next);
    await new Promise(process.nextTick);

    expect(next).not.toHaveBeenCalled();
    expect(remindPerformanceTaskForEmployee).toHaveBeenCalledTimes(3);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: '批量补发完成：成功 2 人，失败 1 人',
      data: expect.objectContaining({
        successCount: 2,
        failedCount: 1,
        results: expect.arrayContaining([
          expect.objectContaining({ employeeId: 'e001', success: true }),
          expect.objectContaining({ employeeId: 'e002', success: false, message: '该员工没有绩效任务' }),
        ]),
      }),
    }));
  });
});
