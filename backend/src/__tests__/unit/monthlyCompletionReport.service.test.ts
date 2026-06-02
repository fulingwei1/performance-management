import { memoryStore } from '../../config/database';
import { SchedulerService } from '../../services/scheduler.service';
import { sendAppMessage } from '../../services/wecomWebhook.service';

jest.mock('../../services/wecomWebhook.service', () => ({
  WecomWebhookService: {
    sendResultPublished: jest.fn().mockResolvedValue(true),
  },
  sendAppMessage: jest.fn().mockResolvedValue(true),
}));

const mockedSendAppMessage = sendAppMessage as jest.MockedFunction<typeof sendAppMessage>;

function addEmployee(id: string, name: string, overrides: Record<string, any> = {}) {
  memoryStore.employees.set(id, {
    id,
    name,
    role: 'employee',
    department: '工程技术中心',
    subDepartment: 'PLC部',
    level: 'junior',
    managerId: 'm001',
    status: 'active',
    ...overrides,
  } as any);
}

function addRecord(employeeId: string, month: string, status: string, score = 1) {
  const employee = memoryStore.employees.get(employeeId) as any;
  memoryStore.performanceRecords.set(`rec-${employeeId}-${month}`, {
    id: `rec-${employeeId}-${month}`,
    employeeId,
    employeeName: employee?.name || employeeId,
    assessorId: employeeId === 'm001' ? 'gm001' : 'm001',
    month,
    selfSummary: status === 'draft' ? '' : '本月总结',
    nextMonthPlan: status === 'draft' ? '' : '下月计划',
    taskCompletion: score,
    initiative: score,
    projectFeedback: score,
    qualityImprovement: score,
    totalScore: status === 'draft' ? 0 : score,
    managerComment: status === 'draft' ? '' : '评价',
    nextMonthWorkArrangement: status === 'draft' ? '' : '安排',
    department: employee?.department || '工程技术中心',
    subDepartment: employee?.subDepartment || 'PLC部',
    status,
  } as any);
}

describe('SchedulerService monthly completion executive report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    memoryStore.employees = new Map();
    memoryStore.performanceRecords = new Map();
    memoryStore.notifications = new Map();
    memoryStore.todos = new Map();
    memoryStore.automationLogs = new Map();
    memoryStore.systemSettings = new Map();
    memoryStore.assessmentTemplates = new Map([
      ['template-eng-default', {
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
      } as any],
    ]);

    addEmployee('gm001', '郑汝才', { role: 'gm', level: 'senior', managerId: undefined, wecomUserId: 'zhengrc' });
    addEmployee('m001', '骆奕兴', { role: 'manager', level: 'senior', managerId: 'gm001', wecomUserId: 'luoyx' });
    addEmployee('hr001', '符凌维', { role: 'admin', level: 'senior', department: '人力行政部', subDepartment: '', managerId: undefined, wecomUserId: 'fulw' });
    addEmployee('e001', '员工A');
    addEmployee('e002', '员工B');
  });

  it('does not send the executive report before every eligible assessment is completed', async () => {
    addRecord('m001', '2026-05', 'completed', 1.2);
    addRecord('e001', '2026-05', 'completed', 1.1);
    addRecord('e002', '2026-05', 'submitted', 1.0);

    const result = await SchedulerService.sendMonthlyCompletionReportIfReady('2026-05');

    expect(result).toMatchObject({ sent: false, reason: '未全部完成: 2/3' });
    expect(mockedSendAppMessage).not.toHaveBeenCalled();
  });

  it('sends one comprehensive report to Zheng Rucai, Luo Yixing and Fu Lingwei when all are completed, then dedupes', async () => {
    addRecord('m001', '2026-05', 'completed', 1.2);
    addRecord('e001', '2026-05', 'completed', 1.4);
    addRecord('e002', '2026-05', 'completed', 0.8);

    const first = await SchedulerService.sendMonthlyCompletionReportIfReady('2026-05');
    const second = await SchedulerService.sendMonthlyCompletionReportIfReady('2026-05');

    expect(first).toMatchObject({ sent: true, month: '2026-05', recipientCount: 3 });
    expect(second).toMatchObject({ sent: false, reason: '已发送' });
    expect(mockedSendAppMessage).toHaveBeenCalledTimes(1);
    expect(mockedSendAppMessage.mock.calls[0][0]).toBe('zhengrc|luoyx|fulw');
    expect(mockedSendAppMessage.mock.calls[0][1]).toContain('2026-05 绩效考核综合报告');
    expect(mockedSendAppMessage.mock.calls[0][1]).toContain('参与考核人数：**3**');
    expect(mockedSendAppMessage.mock.calls[0][1]).toContain('平均绩效系数');
  });
});
