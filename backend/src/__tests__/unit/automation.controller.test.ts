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

    automationController.checkDeadlineReminders({ query: { force: 'true' }, body: { month: '2026-05' } } as any, res, next);
    await new Promise(process.nextTick);

    expect(next).not.toHaveBeenCalled();
    expect(dailyReminderWorkflow).toHaveBeenCalledWith(true, '2026-05');
    expect(checkOverdueTodos).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
