describe('WecomCallbackService', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.WECOM_CALLBACK_TOKEN = 'test-token';
    process.env.WECOM_ENCODING_AES_KEY = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
    process.env.WECOM_CORP_ID = 'corp-test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses structured work summary replies', async () => {
    const { parseWorkSummaryReply } = await import('../../services/wecomCallback.service');

    const parsed = parseWorkSummaryReply('总结：本月完成PLC调试\n计划：下月继续现场联调\n建议：希望提前排产');

    expect(parsed).toEqual({
      selfSummary: '本月完成PLC调试',
      nextMonthPlan: '下月继续现场联调',
      improvementSuggestion: '希望提前排产',
    });
  });

  it('parses one-line work summary replies', async () => {
    const { parseWorkSummaryReply } = await import('../../services/wecomCallback.service');

    const parsed = parseWorkSummaryReply('总结：本月完成PLC调试 计划：下月继续现场联调 建议：希望提前排产');

    expect(parsed).toEqual({
      selfSummary: '本月完成PLC调试',
      nextMonthPlan: '下月继续现场联调',
      improvementSuggestion: '希望提前排产',
    });
  });

  it('submits a draft performance summary from WeCom user id', async () => {
    jest.doMock('../../models/employee.model', () => ({
      EmployeeModel: {
        findAll: jest.fn().mockResolvedValue([
          { id: 'e001', name: '员工A', wecomUserId: 'wx_e001', status: 'active', managerId: 'm001' },
          { id: 'm001', name: '经理A', wecomUserId: 'wx_m001', status: 'active' },
        ]),
      },
    }));
    jest.doMock('../../models/performance.model', () => ({
      PerformanceModel: {
        findByEmployeeIdAndMonth: jest.fn().mockResolvedValue({
          id: 'rec-e001-2026-05',
          employeeId: 'e001',
          assessorId: 'm001',
          month: '2026-05',
          status: 'draft',
          groupType: 'all',
          templateId: 'tpl',
          templateName: '模板',
          departmentType: 'engineering',
        }),
        saveSummary: jest.fn().mockResolvedValue({ id: 'rec-e001-2026-05', status: 'submitted' }),
      },
    }));
    jest.doMock('../../models/todo.model', () => ({
      TodoModel: {
        completeByRelatedId: jest.fn().mockResolvedValue(1),
        performanceSummaryRelatedId: (month: string) => `performance-summary-${month}`,
        performanceReviewRelatedId: (id: string) => `performance-review-${id}`,
        findExisting: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    }));
    jest.doMock('../../models/notification.model', () => ({
      NotificationModel: { create: jest.fn().mockResolvedValue({}) },
    }));
    jest.doMock('../../services/wecomWebhook.service', () => ({
      sendAppMessage: jest.fn().mockResolvedValue(true),
    }));

    const { handleInboundTextMessage } = await import('../../services/wecomCallback.service');
    const { PerformanceModel } = await import('../../models/performance.model');
    const { TodoModel } = await import('../../models/todo.model');

    const result = await handleInboundTextMessage({
      fromUserName: 'wx_e001',
      content: '总结：本月完成PLC调试\n计划：下月继续现场联调',
      month: '2026-05',
    });

    expect(result.success).toBe(true);
    expect(PerformanceModel.saveSummary).toHaveBeenCalledWith(expect.objectContaining({
      id: 'rec-e001-2026-05',
      employeeId: 'e001',
      selfSummary: '本月完成PLC调试',
      nextMonthPlan: '下月继续现场联调',
    }));
    expect(TodoModel.completeByRelatedId).toHaveBeenCalledWith('work_summary', 'performance-summary-2026-05', 'e001');
  });
});
