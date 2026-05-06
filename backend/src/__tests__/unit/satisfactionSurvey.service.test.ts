import { memoryStore } from '../../config/database';
import {
  DEFAULT_SATISFACTION_SURVEY_QUESTIONS,
  SatisfactionSurveyService,
} from '../../services/satisfactionSurvey.service';

describe('SatisfactionSurveyService', () => {
  const employee = {
    id: 'e001',
    name: '员工A',
    role: 'employee',
    department: '工程技术中心',
    subDepartment: '测试部',
    level: 'junior',
    status: 'active',
  } as any;

  const validScores = {
    fairness: 4,
    feedbackTimeliness: 5,
    collaboration: 3,
    support: 4,
    overall: 5,
  };

  beforeEach(() => {
    (memoryStore as any).satisfactionSurveys = new Map();
    (memoryStore as any).satisfactionSurveyResponses = new Map();
  });

  it('resolves the expected half-year period from a date', () => {
    expect(SatisfactionSurveyService.resolveHalfYearPeriod(new Date('2026-05-05T12:00:00+08:00'))).toEqual({
      year: 2026,
      half: 1,
      period: '2026-H1',
    });

    expect(SatisfactionSurveyService.resolveHalfYearPeriod(new Date('2026-11-01T12:00:00+08:00'))).toEqual({
      year: 2026,
      half: 2,
      period: '2026-H2',
    });
  });

  it('resolves satisfaction survey only from June and December performance months', async () => {
    expect(SatisfactionSurveyService.resolveSurveyPeriodForPerformanceMonth('2026-06')).toEqual({
      year: 2026,
      half: 1,
      period: '2026-H1',
    });
    expect(SatisfactionSurveyService.resolveSurveyPeriodForPerformanceMonth('2026-12')).toEqual({
      year: 2026,
      half: 2,
      period: '2026-H2',
    });
    expect(SatisfactionSurveyService.resolveSurveyPeriodForPerformanceMonth('2026-05')).toBeNull();

    await expect(SatisfactionSurveyService.ensureSurveyForAssessmentDate(new Date('2026-05-06T08:00:00+08:00'))).resolves.toBeNull();
    await expect(SatisfactionSurveyService.ensureSurveyForAssessmentDate(new Date('2026-07-01T08:00:00+08:00'))).resolves.toMatchObject({
      period: '2026-H1',
      status: 'open',
    });
  });

  it('ensures one open survey for the same half-year period', async () => {
    const first = await SatisfactionSurveyService.ensureSurveyForPeriod({ year: 2026, half: 1, createdBy: 'hr001' });
    const second = await SatisfactionSurveyService.ensureSurveyForPeriod({ year: 2026, half: 1, createdBy: 'hr001' });

    expect(first).toMatchObject({
      id: 'satisfaction-2026-H1',
      year: 2026,
      half: 1,
      period: '2026-H1',
      title: '2026年上半年员工满意度调查',
      status: 'open',
    });
    expect(second.id).toBe(first.id);
    expect(DEFAULT_SATISFACTION_SURVEY_QUESTIONS).toHaveLength(5);
    expect(Array.from((memoryStore as any).satisfactionSurveys.values())).toHaveLength(1);
  });

  it('only exposes an open survey as current', async () => {
    await SatisfactionSurveyService.ensureSurveyForPeriod({ year: 2026, half: 1, createdBy: 'hr001' });
    const current = await SatisfactionSurveyService.findCurrentSurvey(new Date('2026-07-02T08:00:00+08:00'));
    expect(current).toMatchObject({ period: '2026-H1', status: 'open' });

    await SatisfactionSurveyService.setSurveyStatus('satisfaction-2026-H1', 'closed');
    await expect(SatisfactionSurveyService.findCurrentSurvey(new Date('2026-07-02T08:00:00+08:00'))).resolves.toBeNull();
  });

  it('does not keep stale half-year surveys visible outside the assessment window', async () => {
    await SatisfactionSurveyService.ensureSurveyForPeriod({ year: 2026, half: 1, createdBy: 'hr001' });

    await expect(SatisfactionSurveyService.findCurrentSurvey(new Date(2026, 4, 6, 10))).resolves.toBeNull();
    await expect(SatisfactionSurveyService.findCurrentSurvey(new Date(2026, 7, 1, 10))).resolves.toBeNull();
  });

  it('stores one response per employee and aggregates averages', async () => {
    const survey = await SatisfactionSurveyService.ensureSurveyForPeriod({ year: 2026, half: 1, createdBy: 'hr001' });

    const submitted = await SatisfactionSurveyService.submitResponse({
      surveyId: survey.id,
      employee,
      scores: validScores,
      comment: '希望绩效反馈再及时一点',
      anonymous: true,
    });

    expect(submitted).toMatchObject({
      surveyId: survey.id,
      employeeId: 'e001',
      anonymous: true,
      comment: '希望绩效反馈再及时一点',
    });

    await SatisfactionSurveyService.submitResponse({
      surveyId: survey.id,
      employee,
      scores: { ...validScores, fairness: 5 },
      comment: '已补充',
      anonymous: false,
    });

    const stats = await SatisfactionSurveyService.getSurveyStats(survey.id);
    expect(stats.responseCount).toBe(1);
    expect(stats.overallAverage).toBe(4.4);
    expect(stats.questionAverages.find((item) => item.key === 'fairness')).toMatchObject({
      label: '对绩效考核公平性的满意度',
      average: 5,
    });
    expect(stats.departmentBreakdown).toEqual([
      expect.objectContaining({
        department: '工程技术中心',
        responseCount: 1,
        average: 4.4,
      }),
    ]);
  });

  it('rejects incomplete scores before storing a response', async () => {
    const survey = await SatisfactionSurveyService.ensureSurveyForPeriod({ year: 2026, half: 1, createdBy: 'hr001' });

    await expect(SatisfactionSurveyService.submitResponse({
      surveyId: survey.id,
      employee,
      scores: { fairness: 5 },
      comment: '',
      anonymous: true,
    })).rejects.toThrow('请完成所有满意度评分');

    expect(Array.from((memoryStore as any).satisfactionSurveyResponses.values())).toHaveLength(0);
  });
});
