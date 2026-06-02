import axios from 'axios';
import ExcelJS from 'exceljs';
import { EmployeeQuarterlyModel } from '../models/employeeQuarterly.model';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';
import { PerformanceRecord } from '../types';
import { levelToScore, scoreToLevel } from '../utils/helpers';
import {
  getPerformanceRankingConfig,
  isParticipatingRecord,
} from './performanceRankingConfig.service';

type PushPeriodType = 'monthly' | 'quarterly';

interface PushResultsOptions {
  periodType: PushPeriodType;
  year: number;
  month?: number;
  quarter?: number;
  confirmedByAdmin?: boolean;
  confirmedBy?: string;
}

interface QuarterlyCoefficientRow {
  employeeExternalId: string;
  employeeName: string;
  department: string;
  subDepartment: string;
  quarterScore: number;
  monthsCount: number;
  rank: number;
  level: string;
  coefficient: number;
  monthlyScores: Array<{
    month: string;
    score: number;
    level: string;
  }>;
}

interface QuarterlyCoefficientDataset {
  quarter: string;
  effectiveQuarter: string;
  periodType: 'quarterly';
  sourceMonths: string[];
  generatedAt: string;
  summary: {
    employeeCount: number;
    avgQuarterScore: number;
    avgCoefficient: number;
    minCoefficient: number;
    maxCoefficient: number;
    levelCounts: Record<string, number>;
  };
  results: QuarterlyCoefficientRow[];
}

const getSalaryBaseUrl = (): string => (
  process.env.SALARY_SYSTEM_BASE_URL ||
  process.env.SALARY_API_URL ||
  'http://host.docker.internal:8000'
).trim().replace(/\/+$/, '');

const getSalaryPushToken = (): string => (process.env.SALARY_SYSTEM_PUSH_TOKEN || '').trim();

const isCompletedRecord = (record: PerformanceRecord): boolean => (
  record.status === 'completed' || record.status === 'scored'
);

const monthLabel = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}`;

const getNextMonthLabel = (year: number, month: number): string => {
  const next = new Date(year, month, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

const getEffectiveQuarter = (year: number, quarter: number): string => (
  quarter === 4 ? `${year + 1}-Q1` : `${year}-Q${quarter + 1}`
);

const getQuarterMonths = (year: number, quarter: number): string[] => {
  const startMonth = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map((offset) => monthLabel(year, startMonth + offset));
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseMaybeJsonArray = (value: any): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getSummaryValue = (summary: any, camelKey: string, snakeKey: string): any => (
  summary?.[camelKey] ?? summary?.[snakeKey]
);

export class SalaryIntegrationService {
  static async buildQuarterlyCoefficientDataset(year: number, quarter: number): Promise<QuarterlyCoefficientDataset> {
    if (!year || !quarter || quarter < 1 || quarter > 4) {
      throw new Error('请提供有效的 year 和 quarter (1-4)');
    }

    const summaries = await this.loadOrGenerateQuarterlySummaries(year, quarter);
    const rows: QuarterlyCoefficientRow[] = [];

    for (const summary of summaries || []) {
      const employeeExternalId = String(getSummaryValue(summary, 'employeeId', 'employee_id') || '').trim();
      if (!employeeExternalId) continue;

      const archive = (!getSummaryValue(summary, 'employeeName', 'employee_name')
        || !getSummaryValue(summary, 'department', 'department'))
        ? await EmployeeModel.findById(employeeExternalId)
        : null;

      const quarterScore = Number(toNumber(getSummaryValue(summary, 'avgScore', 'avg_score')).toFixed(2));
      if (quarterScore <= 0) continue;

      const level = scoreToLevel(quarterScore);
      const monthRecords = parseMaybeJsonArray(getSummaryValue(summary, 'monthRecords', 'month_records'));
      const monthlyScores = monthRecords.map((record: any) => {
        const score = Number(toNumber(record.totalScore ?? record.total_score ?? record.score).toFixed(2));
        return {
          month: String(record.month || ''),
          score,
          level: String(record.level || scoreToLevel(score)),
        };
      }).filter((item) => item.month && item.score > 0);

      rows.push({
        employeeExternalId,
        employeeName: String(getSummaryValue(summary, 'employeeName', 'employee_name') || archive?.name || ''),
        department: String(getSummaryValue(summary, 'department', 'department') || archive?.department || ''),
        subDepartment: String(getSummaryValue(summary, 'subDepartment', 'sub_department') || archive?.subDepartment || ''),
        quarterScore,
        monthsCount: Number(getSummaryValue(summary, 'recordCount', 'record_count') || monthlyScores.length || 0),
        rank: 0,
        level,
        coefficient: this.scoreToCoefficient(quarterScore),
        monthlyScores,
      });
    }

    rows.sort((a, b) => {
      const scoreDiff = b.quarterScore - a.quarterScore;
      if (scoreDiff !== 0) return scoreDiff;
      return a.employeeExternalId.localeCompare(b.employeeExternalId);
    });

    let currentRank = 0;
    let previousScore: number | null = null;
    rows.forEach((row, index) => {
      if (previousScore === null || row.quarterScore !== previousScore) {
        currentRank = index + 1;
        previousScore = row.quarterScore;
      }
      row.rank = currentRank;
    });

    const levelCounts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.level] = (acc[row.level] || 0) + 1;
      return acc;
    }, { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 });
    const scoreTotal = rows.reduce((sum, row) => sum + row.quarterScore, 0);
    const coefficientTotal = rows.reduce((sum, row) => sum + row.coefficient, 0);
    const coefficients = rows.map((row) => row.coefficient);

    return {
      quarter: `${year}-Q${quarter}`,
      effectiveQuarter: getEffectiveQuarter(year, quarter),
      periodType: 'quarterly',
      sourceMonths: getQuarterMonths(year, quarter),
      generatedAt: new Date().toISOString(),
      summary: {
        employeeCount: rows.length,
        avgQuarterScore: rows.length ? Number((scoreTotal / rows.length).toFixed(2)) : 0,
        avgCoefficient: rows.length ? Number((coefficientTotal / rows.length).toFixed(2)) : 0,
        minCoefficient: rows.length ? Math.min(...coefficients) : 0,
        maxCoefficient: rows.length ? Math.max(...coefficients) : 0,
        levelCounts,
      },
      results: rows,
    };
  }

  static async exportQuarterlyCoefficientWorkbook(year: number, quarter: number): Promise<ExcelJS.Buffer> {
    const dataset = await this.buildQuarterlyCoefficientDataset(year, quarter);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ATE绩效管理平台';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('季度绩效系数');
    sheet.columns = [
      { header: '考核季度', key: 'quarter', width: 12 },
      { header: '影响薪资季度', key: 'effectiveQuarter', width: 14 },
      { header: '员工ID', key: 'employeeExternalId', width: 14 },
      { header: '姓名', key: 'employeeName', width: 12 },
      { header: '一级部门', key: 'department', width: 18 },
      { header: '二级/小组', key: 'subDepartment', width: 18 },
      { header: '季度排名', key: 'rank', width: 10 },
      { header: '有效月份数', key: 'monthsCount', width: 12 },
      { header: '季度均分', key: 'quarterScore', width: 12 },
      { header: '绩效等级', key: 'level', width: 10 },
      { header: '绩效系数', key: 'coefficient', width: 12 },
      { header: '月度明细', key: 'monthlyScoresText', width: 40 },
    ];
    sheet.getRow(1).font = { bold: true };

    dataset.results.forEach((row) => {
      sheet.addRow({
        ...row,
        quarter: dataset.quarter,
        effectiveQuarter: dataset.effectiveQuarter,
        monthlyScoresText: row.monthlyScores.map((item) => `${item.month}:${item.score}(${item.level})`).join('；'),
      });
    });

    const summarySheet = workbook.addWorksheet('汇总说明');
    summarySheet.addRows([
      ['考核季度', dataset.quarter],
      ['影响薪资季度', dataset.effectiveQuarter],
      ['来源月份', dataset.sourceMonths.join('、')],
      ['人数', dataset.summary.employeeCount],
      ['季度均分', dataset.summary.avgQuarterScore],
      ['平均绩效系数', dataset.summary.avgCoefficient],
      ['最低绩效系数', dataset.summary.minCoefficient],
      ['最高绩效系数', dataset.summary.maxCoefficient],
      ['生成时间', dataset.generatedAt],
      ['说明', '绩效系数由季度均分按统一 L1-L5 等级映射生成：L5=1.5，L4=1.2，L3=1.0，L2=0.8，L1=0.5。'],
    ]);
    summarySheet.getColumn(1).width = 18;
    summarySheet.getColumn(2).width = 80;

    return workbook.xlsx.writeBuffer();
  }

  static async pushResults(options: PushResultsOptions): Promise<any> {
    if (options.periodType === 'monthly') {
      if (!options.month || options.month < 1 || options.month > 12) {
        return { success: false, message: '请选择有效的月份' };
      }
      return this.pushMonthlyResults(options.year, options.month, options);
    }

    if (!options.quarter || options.quarter < 1 || options.quarter > 4) {
      return { success: false, message: '请选择有效的季度' };
    }
    return this.pushQuarterlyResults(options.year, options.quarter, options);
  }
  
  static async pushQuarterlyResults(
    year: number,
    quarter: number,
    confirmation?: { confirmedByAdmin?: boolean; confirmedBy?: string }
  ): Promise<any> {
    try {
      const confirmationCheck = this.requireAdminConfirmation(confirmation);
      if (!confirmationCheck.success) return confirmationCheck;

      const dataset = await this.buildQuarterlyCoefficientDataset(year, quarter);
      
      if (!dataset.results || dataset.results.length === 0) {
        return {
          success: false,
          message: `未找到 ${year}-Q${quarter} 的季度汇总数据`
        };
      }
      
      const payload = {
        quarter: dataset.quarter,
        effectiveQuarter: dataset.effectiveQuarter,
        periodType: 'quarterly',
        publishedAt: new Date().toISOString(),
        adminConfirmed: true,
        confirmedBy: confirmation?.confirmedBy || 'admin',
        confirmedAt: new Date().toISOString(),
        summary: dataset.summary,
        results: dataset.results
      };
      
      const response = await this.postToSalary('/api/integrations/performance/quarter-results', payload);
      
      return {
        success: true,
        message: `已推送 ${year}-Q${quarter} 季度绩效数据 ${dataset.results.length} 条到薪资系统`,
        data: {
          quarter: `${year}-Q${quarter}`,
          effectiveQuarter: payload.effectiveQuarter,
          sent_count: dataset.results.length,
          salary_response: response.data
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: `推送失败：${error.message}`
      };
    }
  }
  
  static async pushMonthlyResults(
    year: number,
    month: number,
    confirmation?: { confirmedByAdmin?: boolean; confirmedBy?: string }
  ): Promise<any> {
    try {
      const confirmationCheck = this.requireAdminConfirmation(confirmation);
      if (!confirmationCheck.success) return confirmationCheck;

      const monthStr = monthLabel(year, month);
      const rankingConfig = await getPerformanceRankingConfig();
      const records = (await PerformanceModel.findByMonth(monthStr))
        .filter(isCompletedRecord)
        .filter((record) => isParticipatingRecord(record, rankingConfig))
        .sort((a, b) => {
          const scoreDiff = Number(b.totalScore || 0) - Number(a.totalScore || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return String(a.employeeId || '').localeCompare(String(b.employeeId || ''));
        });
      
      if (!records || records.length === 0) {
        return {
          success: false,
          message: `未找到 ${monthStr} 已完成且参与考核的月度绩效数据`
        };
      }
      
      const results = records.map((record, idx) => {
        const monthlyScore = Number(Number(record.totalScore || 0).toFixed(2));
        const level = record.level || scoreToLevel(monthlyScore);

        return {
          employeeExternalId: record.employeeId,
          employeeName: record.employeeName || '',
          department: record.department || '',
          subDepartment: record.subDepartment || '',
          monthScore: monthlyScore,
          monthlyScore,
          rank: idx + 1,
          departmentRank: record.departmentRank || 0,
          groupRank: record.groupRank || 0,
          companyRank: record.companyRank || 0,
          level,
          coefficient: this.scoreToCoefficient(monthlyScore),
        };
      });

      const payload = {
        month: monthStr,
        effectiveMonth: getNextMonthLabel(year, month),
        periodType: 'monthly',
        publishedAt: new Date().toISOString(),
        adminConfirmed: true,
        confirmedBy: confirmation?.confirmedBy || 'admin',
        confirmedAt: new Date().toISOString(),
        results
      };
      
      const response = await this.postToSalary('/api/integrations/performance/month-results', payload);
      
      return {
        success: true,
        message: `已推送 ${monthStr} 月度绩效数据 ${results.length} 条到薪资系统`,
        data: {
          month: monthStr,
          effectiveMonth: payload.effectiveMonth,
          sent_count: results.length,
          salary_response: response.data
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: `推送失败：${error.message}`
      };
    }
  }
  
  static scoreToCoefficient(score: number): number {
    return levelToScore(scoreToLevel(score));
  }
  
  static monthToQuarter(month: number): number {
    return Math.floor((month - 1) / 3) + 1;
  }

  private static requireAdminConfirmation(confirmation?: { confirmedByAdmin?: boolean; confirmedBy?: string }) {
    if (confirmation?.confirmedByAdmin === true) {
      return { success: true };
    }

    return {
      success: false,
      requiresConfirmation: true,
      message: '暂未推送到薪资系统：需要系统管理员确认后，才会把绩效结果写入薪资系统绩效工资计算。',
    };
  }

  private static async loadOrGenerateQuarterlySummaries(year: number, quarter: number): Promise<any[]> {
    const existing = await EmployeeQuarterlyModel.findByQuarter(year, quarter);
    if (existing?.length > 0) return existing;

    const generated = await EmployeeQuarterlyModel.generateForQuarter(year, quarter);
    return generated.details || [];
  }

  private static async postToSalary(path: string, payload: Record<string, unknown>) {
    const salaryBaseUrl = getSalaryBaseUrl();
    const pushToken = getSalaryPushToken();

    if (!salaryBaseUrl) {
      throw new Error('未配置薪资系统地址 SALARY_SYSTEM_BASE_URL');
    }
    if (!pushToken) {
      throw new Error('未配置薪资系统推送 token SALARY_SYSTEM_PUSH_TOKEN，不能调用薪资系统绩效接口');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Performance-Push-Token': pushToken,
    };

    return axios.post(`${salaryBaseUrl}${path}`, payload, {
      headers,
      timeout: 30000,
    });
  }
}
