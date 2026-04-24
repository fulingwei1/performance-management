import { automationController } from '../../controllers/automation.controller';
import { memoryStore } from '../../config/memory-db';
import { NotificationModel } from '../../models/notification.model';

describe('automationController deadline reminders', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    memoryStore.performanceRecords.clear();
  });

  it('should link performance task reminders to the employee summary page for that month', async () => {
    memoryStore.performanceRecords.set('rec-e001-2026-04', {
      id: 'rec-e001-2026-04',
      employee_id: 'e001',
      employeeId: 'e001',
      month: '2026-04',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      frozen: false,
      employee_name: '员工A',
    } as any);

    jest.spyOn(NotificationModel, 'createBatch').mockResolvedValue(1);

    const json = jest.fn();
    const res = { json } as any;
    const next = jest.fn();

    automationController.checkDeadlineReminders({} as any, res, next);
    await new Promise(process.nextTick);

    expect(next).not.toHaveBeenCalled();
    expect(NotificationModel.createBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'e001',
        title: '绩效任务即将到期',
        link: '/employee/summary?month=2026-04',
      }),
    ]);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
