import { randomUUID } from 'crypto';
import { Employee } from '../types';
import { memoryStore, query, USE_MEMORY_DB } from '../config/database';

export type SatisfactionSurveyHalf = 1 | 2;
export type SatisfactionSurveyStatus = 'draft' | 'open' | 'closed';

export interface SatisfactionSurveyQuestion {
  key: string;
  label: string;
  description?: string;
}

export interface SatisfactionSurvey {
  id: string;
  year: number;
  half: SatisfactionSurveyHalf;
  period: string;
  title: string;
  description: string;
  questions: SatisfactionSurveyQuestion[];
  status: SatisfactionSurveyStatus;
  startDate: string;
  endDate: string;
  createdBy?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SatisfactionSurveyResponse {
  id: string;
  surveyId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment: string;
  anonymous: boolean;
  scores: Record<string, number>;
  comment?: string;
  submittedAt: string | Date;
}

export interface SatisfactionSurveyStats {
  survey: SatisfactionSurvey;
  responseCount: number;
  overallAverage: number | null;
  questionAverages: Array<SatisfactionSurveyQuestion & { average: number | null }>;
  departmentBreakdown: Array<{
    department: string;
    responseCount: number;
    average: number | null;
  }>;
  comments: Array<{
    anonymous: boolean;
    employeeName?: string;
    department: string;
    comment: string;
    submittedAt: string | Date;
  }>;
}

export const DEFAULT_SATISFACTION_SURVEY_QUESTIONS: SatisfactionSurveyQuestion[] = [
  { key: 'fairness', label: '对绩效考核公平性的满意度' },
  { key: 'feedbackTimeliness', label: '对绩效反馈及时性的满意度' },
  { key: 'collaboration', label: '对部门协作氛围的满意度' },
  { key: 'support', label: '对工作支持与资源保障的满意度' },
  { key: 'overall', label: '对整体工作满意度' },
];

type EnsureSurveyInput = {
  year: number;
  half: SatisfactionSurveyHalf;
  createdBy?: string;
};

type SubmitResponseInput = {
  surveyId: string;
  employee: Employee;
  scores: Record<string, unknown>;
  comment?: string;
  anonymous?: boolean;
};

const halfLabel = (half: SatisfactionSurveyHalf): string => (half === 1 ? '上半年' : '下半年');
const periodFor = (year: number, half: SatisfactionSurveyHalf): string => `${year}-H${half}`;
const surveyIdFor = (year: number, half: SatisfactionSurveyHalf): string => `satisfaction-${periodFor(year, half)}`;
const surveyTitleFor = (year: number, half: SatisfactionSurveyHalf): string => `${year}年${halfLabel(half)}员工满意度调查`;
const surveyDescriptionFor = (year: number, half: SatisfactionSurveyHalf): string =>
  `本调查用于收集${year}年${halfLabel(half)}员工对绩效考核、反馈、协作和工作支持的满意度意见。评分为 1-5 分，默认匿名汇总展示。`;
const startDateFor = (year: number, half: SatisfactionSurveyHalf): string => `${year}-${half === 1 ? '01' : '07'}-01`;
const endDateFor = (year: number, half: SatisfactionSurveyHalf): string => `${year}-${half === 1 ? '06' : '12'}-${half === 1 ? '30' : '31'}`;

function assertHalf(half: number): asserts half is SatisfactionSurveyHalf {
  if (half !== 1 && half !== 2) {
    throw new Error('half 必须是 1 或 2');
  }
}

function getSurveyStore(): Map<string, SatisfactionSurvey> {
  const store = memoryStore as any;
  if (!store.satisfactionSurveys) store.satisfactionSurveys = new Map();
  return store.satisfactionSurveys;
}

function getResponseStore(): Map<string, SatisfactionSurveyResponse> {
  const store = memoryStore as any;
  if (!store.satisfactionSurveyResponses) store.satisfactionSurveyResponses = new Map();
  return store.satisfactionSurveyResponses;
}

function normalizeDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const text = String(value);
  return text.includes('T') ? text.slice(0, 10) : text;
}

function normalizeTimestamp(value: unknown): string | Date {
  if (!value) return new Date().toISOString();
  return value as string | Date;
}

function parseJsonObject(value: unknown): Record<string, number> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value as Record<string, number>;
}

function parseQuestions(value: unknown): SatisfactionSurveyQuestion[] {
  if (!value) return DEFAULT_SATISFACTION_SURVEY_QUESTIONS;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SATISFACTION_SURVEY_QUESTIONS;
    } catch {
      return DEFAULT_SATISFACTION_SURVEY_QUESTIONS;
    }
  }
  return Array.isArray(value) && value.length > 0 ? value as SatisfactionSurveyQuestion[] : DEFAULT_SATISFACTION_SURVEY_QUESTIONS;
}

function mapSurvey(row: any): SatisfactionSurvey {
  return {
    id: row.id,
    year: Number(row.year),
    half: Number(row.half) as SatisfactionSurveyHalf,
    period: row.period,
    title: row.title,
    description: row.description || '',
    questions: parseQuestions(row.questions),
    status: row.status as SatisfactionSurveyStatus,
    startDate: normalizeDate(row.startDate ?? row.start_date),
    endDate: normalizeDate(row.endDate ?? row.end_date),
    createdBy: row.createdBy ?? row.created_by ?? null,
    createdAt: normalizeTimestamp(row.createdAt ?? row.created_at),
    updatedAt: normalizeTimestamp(row.updatedAt ?? row.updated_at),
  };
}

function mapResponse(row: any): SatisfactionSurveyResponse {
  return {
    id: row.id,
    surveyId: row.surveyId ?? row.survey_id,
    employeeId: row.employeeId ?? row.employee_id,
    employeeName: row.employeeName ?? row.employee_name ?? '',
    department: row.department ?? '',
    subDepartment: row.subDepartment ?? row.sub_department ?? '',
    anonymous: row.anonymous !== false,
    scores: parseJsonObject(row.scores),
    comment: row.comment || '',
    submittedAt: normalizeTimestamp(row.submittedAt ?? row.submitted_at),
  };
}

function buildSurvey(input: EnsureSurveyInput): SatisfactionSurvey {
  const period = periodFor(input.year, input.half);
  const now = new Date().toISOString();
  return {
    id: surveyIdFor(input.year, input.half),
    year: input.year,
    half: input.half,
    period,
    title: surveyTitleFor(input.year, input.half),
    description: surveyDescriptionFor(input.year, input.half),
    questions: DEFAULT_SATISFACTION_SURVEY_QUESTIONS,
    status: 'open',
    startDate: startDateFor(input.year, input.half),
    endDate: endDateFor(input.year, input.half),
    createdBy: input.createdBy || 'system',
    createdAt: now,
    updatedAt: now,
  };
}

function validateScores(scores: Record<string, unknown>): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const question of DEFAULT_SATISFACTION_SURVEY_QUESTIONS) {
    const score = Number(scores?.[question.key]);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      throw new Error('请完成所有满意度评分，评分范围为 1-5 分');
    }
    normalized[question.key] = score;
  }

  return normalized;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function responseAverage(response: SatisfactionSurveyResponse): number | null {
  const values = DEFAULT_SATISFACTION_SURVEY_QUESTIONS
    .map((question) => Number(response.scores?.[question.key]))
    .filter((value) => Number.isFinite(value));
  return average(values);
}

export class SatisfactionSurveyService {
  static resolveHalfYearPeriod(date: Date = new Date()): { year: number; half: SatisfactionSurveyHalf; period: string } {
    const year = date.getFullYear();
    const half: SatisfactionSurveyHalf = date.getMonth() < 6 ? 1 : 2;
    return { year, half, period: periodFor(year, half) };
  }

  static async ensureSurveyForDate(date: Date = new Date(), createdBy = 'system'): Promise<SatisfactionSurvey> {
    const { year, half } = this.resolveHalfYearPeriod(date);
    return this.ensureSurveyForPeriod({ year, half, createdBy });
  }

  static async ensureSurveyForPeriod(input: EnsureSurveyInput): Promise<SatisfactionSurvey> {
    assertHalf(input.half);
    const survey = buildSurvey(input);

    if (USE_MEMORY_DB) {
      const store = getSurveyStore();
      const existing = Array.from(store.values()).find((item) => item.year === input.year && item.half === input.half);
      if (existing) return existing;
      store.set(survey.id, survey);
      return survey;
    }

    const rows = await query(`
      INSERT INTO satisfaction_surveys (
        id, year, half, period, title, description, questions, status, start_date, end_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
      ON CONFLICT (year, half) DO UPDATE SET
        questions = COALESCE(satisfaction_surveys.questions, EXCLUDED.questions),
        updated_at = satisfaction_surveys.updated_at
      RETURNING *
    `, [
      survey.id,
      survey.year,
      survey.half,
      survey.period,
      survey.title,
      survey.description,
      JSON.stringify(survey.questions),
      survey.status,
      survey.startDate,
      survey.endDate,
      survey.createdBy,
    ]);

    return mapSurvey(rows[0]);
  }

  static async listSurveys(): Promise<SatisfactionSurvey[]> {
    if (USE_MEMORY_DB) {
      return Array.from(getSurveyStore().values())
        .sort((a, b) => b.year - a.year || b.half - a.half);
    }

    const rows = await query(`
      SELECT *
      FROM satisfaction_surveys
      ORDER BY year DESC, half DESC
    `);
    return rows.map(mapSurvey);
  }

  static async findById(id: string): Promise<SatisfactionSurvey | null> {
    if (USE_MEMORY_DB) {
      return getSurveyStore().get(id) || null;
    }

    const rows = await query('SELECT * FROM satisfaction_surveys WHERE id = $1', [id]);
    return rows.length > 0 ? mapSurvey(rows[0]) : null;
  }

  static async findCurrentSurvey(date: Date = new Date()): Promise<SatisfactionSurvey | null> {
    const { period } = this.resolveHalfYearPeriod(date);

    if (USE_MEMORY_DB) {
      return Array.from(getSurveyStore().values()).find((survey) => survey.period === period) || null;
    }

    const rows = await query('SELECT * FROM satisfaction_surveys WHERE period = $1', [period]);
    return rows.length > 0 ? mapSurvey(rows[0]) : null;
  }

  static async setSurveyStatus(id: string, status: SatisfactionSurveyStatus): Promise<SatisfactionSurvey | null> {
    if (!['draft', 'open', 'closed'].includes(status)) {
      throw new Error('无效的调查状态');
    }

    if (USE_MEMORY_DB) {
      const store = getSurveyStore();
      const survey = store.get(id);
      if (!survey) return null;
      const updated = { ...survey, status, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    }

    const rows = await query(`
      UPDATE satisfaction_surveys
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, status]);
    return rows.length > 0 ? mapSurvey(rows[0]) : null;
  }

  static async submitResponse(input: SubmitResponseInput): Promise<SatisfactionSurveyResponse> {
    const survey = await this.findById(input.surveyId);
    if (!survey) throw new Error('满意度调查不存在');
    if (survey.status !== 'open') throw new Error('当前满意度调查未开放');
    if (!input.employee?.id) throw new Error('员工信息不存在');

    const scores = validateScores(input.scores);
    const response: SatisfactionSurveyResponse = {
      id: `satisfaction-response-${survey.id}-${input.employee.id}`,
      surveyId: survey.id,
      employeeId: input.employee.id,
      employeeName: input.employee.name || input.employee.id,
      department: input.employee.department || '',
      subDepartment: input.employee.subDepartment || '',
      anonymous: input.anonymous !== false,
      scores,
      comment: String(input.comment || '').trim(),
      submittedAt: new Date().toISOString(),
    };

    if (USE_MEMORY_DB) {
      getResponseStore().set(response.id, response);
      return response;
    }

    const rows = await query(`
      INSERT INTO satisfaction_survey_responses (
        id, survey_id, employee_id, employee_name, department, sub_department, anonymous, scores, comment, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (survey_id, employee_id) DO UPDATE SET
        employee_name = EXCLUDED.employee_name,
        department = EXCLUDED.department,
        sub_department = EXCLUDED.sub_department,
        anonymous = EXCLUDED.anonymous,
        scores = EXCLUDED.scores,
        comment = EXCLUDED.comment,
        submitted_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      response.id,
      response.surveyId,
      response.employeeId,
      response.employeeName,
      response.department,
      response.subDepartment,
      response.anonymous,
      JSON.stringify(response.scores),
      response.comment,
    ]);

    return mapResponse(rows[0]);
  }

  static async getMyResponse(surveyId: string, employeeId: string): Promise<SatisfactionSurveyResponse | null> {
    if (USE_MEMORY_DB) {
      return Array.from(getResponseStore().values())
        .find((response) => response.surveyId === surveyId && response.employeeId === employeeId) || null;
    }

    const rows = await query(`
      SELECT *
      FROM satisfaction_survey_responses
      WHERE survey_id = $1 AND employee_id = $2
    `, [surveyId, employeeId]);
    return rows.length > 0 ? mapResponse(rows[0]) : null;
  }

  private static async listResponses(surveyId: string): Promise<SatisfactionSurveyResponse[]> {
    if (USE_MEMORY_DB) {
      return Array.from(getResponseStore().values())
        .filter((response) => response.surveyId === surveyId);
    }

    const rows = await query(`
      SELECT *
      FROM satisfaction_survey_responses
      WHERE survey_id = $1
      ORDER BY submitted_at DESC
    `, [surveyId]);
    return rows.map(mapResponse);
  }

  static async getSurveyStats(surveyId: string): Promise<SatisfactionSurveyStats> {
    const survey = await this.findById(surveyId);
    if (!survey) throw new Error('满意度调查不存在');

    const responses = await this.listResponses(surveyId);
    const responseAverages = responses
      .map(responseAverage)
      .filter((value): value is number => value !== null);

    const questionAverages = DEFAULT_SATISFACTION_SURVEY_QUESTIONS.map((question) => ({
      ...question,
      average: average(
        responses
          .map((response) => Number(response.scores?.[question.key]))
          .filter((value) => Number.isFinite(value))
      ),
    }));

    const departments = new Map<string, number[]>();
    for (const response of responses) {
      const department = response.department || '未设置部门';
      const value = responseAverage(response);
      if (value === null) continue;
      if (!departments.has(department)) departments.set(department, []);
      departments.get(department)!.push(value);
    }

    return {
      survey,
      responseCount: responses.length,
      overallAverage: average(responseAverages),
      questionAverages,
      departmentBreakdown: Array.from(departments.entries())
        .map(([department, values]) => ({
          department,
          responseCount: values.length,
          average: average(values),
        }))
        .sort((a, b) => b.responseCount - a.responseCount || a.department.localeCompare(b.department, 'zh-CN')),
      comments: responses
        .filter((response) => Boolean(response.comment))
        .map((response) => ({
          anonymous: response.anonymous,
          employeeName: response.anonymous ? undefined : response.employeeName,
          department: response.department || '未设置部门',
          comment: response.comment || '',
          submittedAt: response.submittedAt,
        })),
    };
  }

  static newResponseId(): string {
    return randomUUID();
  }
}
