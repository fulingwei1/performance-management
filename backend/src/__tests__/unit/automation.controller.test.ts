import { automationController } from '../../controllers/automation.controller';
import { SchedulerService } from '../../services/scheduler.service';

describe('automationController deadline reminders', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
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

    automationController.checkDeadlineReminders({ query: { force: 'true' } } as any, res, next);
    await new Promise(process.nextTick);

    expect(next).not.toHaveBeenCalled();
    expect(dailyReminderWorkflow).toHaveBeenCalledWith(true);
    expect(checkOverdueTodos).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
