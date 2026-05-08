import { memoryStore } from '../../config/memory-db';
import { validatePublicationReadiness } from '../../services/publicationReadiness.service';

const addEmployee = (index: number) => {
  const id = `e${String(index).padStart(3, '0')}`;
  memoryStore.employees.set(id, {
    id,
    name: `员工${index}`,
    role: 'employee',
    department: '工程技术中心',
    subDepartment: '测试部',
    level: 'junior',
    status: 'active',
  } as any);
  return id;
};

const addRecord = (employeeId: string, totalScore: number, month = '2026-04', options: { hasInterviewForm?: boolean } = {}) => {
  memoryStore.performanceRecords.set(`rec-${employeeId}-${month}`, {
    id: `rec-${employeeId}-${month}`,
    employeeId,
    assessorId: 'm001',
    month,
    department: '工程技术中心',
    subDepartment: '测试部',
    selfSummary: '本月工作总结',
    nextMonthPlan: '下月工作计划',
    taskCompletion: totalScore,
    initiative: totalScore,
    projectFeedback: totalScore,
    qualityImprovement: totalScore,
    totalScore,
    managerComment: '经理评价',
    nextMonthWorkArrangement: '下月安排',
    interviewFormAttachment: options.hasInterviewForm ? {
      filename: `${employeeId}-interview.pdf`,
      originalName: '绩效面谈表.pdf',
      mimeType: 'application/pdf',
      size: 1234,
      uploadedBy: 'm001',
      uploadedAt: new Date(),
    } : undefined,
    groupType: 'low',
    status: 'completed',
  } as any);
};

describe('validatePublicationReadiness', () => {
  beforeEach(() => {
    memoryStore.employees = new Map();
    memoryStore.performanceRecords = new Map();
    memoryStore.systemSettings = new Map();
  });

  it('does not enforce 2-7-1 distribution for departments with 10 or fewer participants', async () => {
    for (let i = 1; i <= 10; i += 1) {
      const employeeId = addEmployee(i);
      addRecord(employeeId, 1.5);
    }

    const result = await validatePublicationReadiness('2026-04');

    expect(result.ok).toBe(true);
    expect(result.participantCount).toBe(10);
    expect(result.violations).toHaveLength(0);
  });

  it('requires forced distribution only when department participant count is greater than 10', async () => {
    for (let i = 1; i <= 11; i += 1) {
      const employeeId = addEmployee(i);
      addRecord(employeeId, 1.0);
    }

    const result = await validatePublicationReadiness('2026-04');

    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'forced_distribution',
        unitKey: '工程技术中心/测试部',
        bottomRequired: 1,
        bottomCount: 0,
      }),
    ]));
  });

  it('uses the same score thresholds as scoreToLevel for top and bottom performers', async () => {
    const scores = [1.4, 1.28, 1.2, 1.16, 1.1, 1.06, 1.03, 1.0, 0.96, 0.93, 0.89];
    scores.forEach((score, index) => {
      const employeeId = addEmployee(index + 1);
      addRecord(employeeId, score, '2026-04', { hasInterviewForm: score < 0.9 });
    });

    const result = await validatePublicationReadiness('2026-04');

    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('requires interview forms for the bottom 10 percent before publication', async () => {
    const scores = [1.4, 1.28, 1.2, 1.16, 1.1, 1.06, 1.03, 1.0, 0.96, 0.93, 0.89];
    scores.forEach((score, index) => {
      const employeeId = addEmployee(index + 1);
      addRecord(employeeId, score);
    });

    const result = await validatePublicationReadiness('2026-04');

    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'missing_interview_form',
        unitKey: '工程技术中心/测试部',
        bottomRequired: 1,
        missingInterviewCount: 1,
      }),
    ]));
  });
});
