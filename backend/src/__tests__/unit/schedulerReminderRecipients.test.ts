describe('SchedulerService reminder recipient logging', () => {
  const loadScheduler = async () => {
    jest.resetModules();

    const queryMock = jest.fn();
    const createBatchMock = jest.fn().mockResolvedValue(0);
    const findExistingMock = jest.fn().mockResolvedValue(null);
    const todoCreateMock = jest.fn().mockResolvedValue({});
    const sendReminderMock = jest.fn().mockResolvedValue(true);
    const sendCombinedPerformanceReminderMock = jest.fn().mockResolvedValue(true);
    const sendDepartmentProgressMock = jest.fn().mockResolvedValue(true);
    const sendDepartmentDeadlineAlertMock = jest.fn().mockResolvedValue(true);
    const employees = [
      { id: 'm001', name: '经理A', role: 'manager', department: '工程技术中心', status: 'active', wecomUserId: 'wx_m001' },
      { id: 'm002', name: '同部门经理B', role: 'manager', department: '工程技术中心', status: 'active', wecomUserId: 'wx_m002' },
      { id: 'e001', name: '员工A', role: 'employee', department: '工程技术中心', status: 'active', managerId: 'm001', wecomUserId: 'wx_e001' },
      { id: 'e999', name: '不参与员工', role: 'employee', department: '工程技术中心', status: 'active', managerId: 'm002', wecomUserId: 'wx_e999', noAssessment: true },
    ];

    jest.doMock('../../config/database', () => ({
      query: queryMock,
      USE_MEMORY_DB: false,
      memoryStore: {},
    }));
    jest.doMock('../../models/employee.model', () => ({
      EmployeeModel: { findAll: jest.fn().mockResolvedValue(employees) },
    }));
    jest.doMock('../../models/notification.model', () => ({
      NotificationModel: { createBatch: createBatchMock },
    }));
    jest.doMock('../../models/todo.model', () => ({
      TodoModel: {
        findExisting: findExistingMock,
        create: todoCreateMock,
        performanceReviewRelatedId: (id: string) => `review-${id}`,
        performanceSummaryRelatedId: (month: string) => `summary-${month}`,
        checkOverdue: jest.fn().mockResolvedValue(0),
      },
    }));
    jest.doMock('../../services/performanceRankingConfig.service', () => ({
      getPerformanceRankingConfig: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../../services/selfAssessmentEligibility.service', () => ({
      isSelfAssessmentEligibleRecord: jest.fn((employee: any) => !employee.noAssessment && employee.id !== 'm002'),
      resolveAssessorId: jest.fn((employee: any) => employee.managerId || 'gm001'),
    }));
    jest.doMock('../../services/wecomDirectory.service', () => ({
      resolveEmployeeWecomUserId: jest.fn((employee: any) => Promise.resolve(employee.wecomUserId || `wx_${employee.id}`)),
    }));
    jest.doMock('../../services/wecomWebhook.service', () => ({
      WecomWebhookService: {
        sendReminder: sendReminderMock,
        sendCombinedPerformanceReminder: sendCombinedPerformanceReminderMock,
        sendDepartmentProgress: sendDepartmentProgressMock,
        sendDepartmentDeadlineAlert: sendDepartmentDeadlineAlertMock,
      },
    }));
    jest.doMock('../../services/email.service', () => ({ EmailService: { sendDeadlineReminder: jest.fn(), sendMonthlyTaskGenerated: jest.fn() } }));
    jest.doMock('../../models/performance.model', () => ({ PerformanceModel: {} }));
    jest.doMock('../../models/assessmentPublication.model', () => ({ AssessmentPublicationModel: {} }));
    jest.doMock('../../services/taskTemplateResolver.service', () => ({ resolveTaskTemplateForEmployee: jest.fn() }));
    jest.doMock('../../services/satisfactionSurvey.service', () => ({ SatisfactionSurveyService: {} }));
    jest.doMock('../../models/organization.model', () => ({ OrganizationModel: { findAllDepartments: jest.fn().mockResolvedValue([]) } }));

    const { SchedulerService } = await import('../../services/scheduler.service');
    return { SchedulerService, queryMock, sendReminderMock, sendCombinedPerformanceReminderMock, sendDepartmentProgressMock };
  };

  it('records employee reminder recipients and excludes non-assessable employees', async () => {
    const { SchedulerService, queryMock, sendReminderMock } = await loadScheduler();
    queryMock
      .mockResolvedValueOnce([
        { employeeId: 'e001', employeeName: '员工A', email: null, department: '工程技术中心', wecomUserId: 'wx_e001' },
      ])
      .mockResolvedValue([]);

    const stats = await (SchedulerService as any).remindEmployeesToSubmit('2026-04', 2, false, '2026-05-07', true);

    expect(sendReminderMock).toHaveBeenCalledTimes(1);
    expect(stats).toMatchObject({ pendingCount: 1, wecomCount: 1 });
    expect(stats.recipientDetails).toEqual([
      expect.objectContaining({ employeeId: 'e001', employeeName: '员工A', taskType: '员工提交总结', wecomUserId: 'wx_e001', sent: true }),
    ]);
  });

  it('sends department progress only to actual assessors and records the recipients', async () => {
    const { SchedulerService, queryMock, sendDepartmentProgressMock } = await loadScheduler();
    queryMock.mockResolvedValueOnce([
      { department: '工程技术中心', draftCount: '1', submittedCount: '1', doneCount: '0', total: '2', assessorIds: ['m001'] },
    ]);

    const stats = await (SchedulerService as any).pushDepartmentProgress('2026-04', 5, 2);

    expect(sendDepartmentProgressMock).toHaveBeenCalledTimes(1);
    expect(sendDepartmentProgressMock.mock.calls[0][1]).toBe('wx_m001');
    expect(stats).toMatchObject({ departmentCount: 1, recipientCount: 1, wecomCount: 1, totalPendingCount: 2 });
    expect(stats.recipientDetails).toEqual([
      expect.objectContaining({ employeeId: 'm001', employeeName: '经理A', taskType: '部门进度催办', department: '工程技术中心', wecomUserId: 'wx_m001', sent: true }),
    ]);
  });

  it('combines self-summary and manager-scoring reminders into one WeCom message per recipient', async () => {
    const { SchedulerService, queryMock, sendReminderMock, sendCombinedPerformanceReminderMock } = await loadScheduler();
    queryMock
      .mockResolvedValueOnce([
        { employeeId: 'm001', employeeName: '经理A', department: '工程技术中心', wecomUserId: 'wx_m001' },
      ])
      .mockResolvedValueOnce([
        { assessorId: 'm001', managerName: '经理A', managerWecomUserId: 'wx_m001', employeeId: 'e001', employeeName: '员工A' },
      ])
      .mockResolvedValueOnce([{ count: 0 }]);

    const stats = await (SchedulerService as any).sendCombinedPerformanceReminders('2026-04', 2, '2026-05-07', false);

    expect(sendReminderMock).not.toHaveBeenCalled();
    expect(sendCombinedPerformanceReminderMock).toHaveBeenCalledTimes(1);
    expect(sendCombinedPerformanceReminderMock.mock.calls[0][0]).toMatchObject({
      month: '2026-04',
      selfSummaryPending: true,
      scorePendingEmployeeNames: ['员工A'],
    });
    expect(stats).toMatchObject({ pendingCount: 2, wecomCount: 1, recipientCount: 1 });
  });

  it('skips combined WeCom reminders when the same recipient already received one today', async () => {
    const { SchedulerService, queryMock, sendCombinedPerformanceReminderMock } = await loadScheduler();
    queryMock
      .mockResolvedValueOnce([
        { employeeId: 'm001', employeeName: '经理A', department: '工程技术中心', wecomUserId: 'wx_m001' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 1 }]);

    const stats = await (SchedulerService as any).sendCombinedPerformanceReminders('2026-04', 2, '2026-05-07', false);

    expect(sendCombinedPerformanceReminderMock).not.toHaveBeenCalled();
    expect(stats).toMatchObject({ pendingCount: 1, wecomCount: 0, recipientCount: 1 });
    expect(stats.recipientDetails).toEqual([
      expect.objectContaining({ employeeId: 'm001', sent: false, reason: '今日已发送过催办，默认不重复发送' }),
    ]);
  });
});
