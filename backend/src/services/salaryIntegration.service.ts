import axios from 'axios';
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

interface SalaryForecastEmployee {
  employeeExternalId?: string;
  employeeId?: string;
  employeeName?: string;
  department?: string;
  subDepartment?: string;
  draftScore?: number;
  draftCoefficient?: number;
}

interface SalaryForecastPayload {
  periodType: PushPeriodType;
  year: number;
  month?: number;
  quarter?: number;
  employees: SalaryForecastEmployee[];
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

export class SalaryIntegrationService {
  static async buildAuthorizedForecastPayload(payload: any, user: any): Promise<{
    success: boolean;
    payload?: SalaryForecastPayload;
    message?: string;
    status?: number;
  }> {
    const periodType = payload?.periodType === 'quarterly' ? 'quarterly' : 'monthly';
    const year = Number(payload?.year);
    const month = payload?.month !== undefined ? Number(payload.month) : undefined;
    const quarter = payload?.quarter !== undefined ? Number(payload.quarter) : undefined;
    const employees = Array.isArray(payload?.employees) ? payload.employees : [];

    if (!year || Number.isNaN(year)) {
      return { success: false, status: 400, message: '请提供有效的年份' };
    }
    if (periodType === 'monthly' && (!month || month < 1 || month > 12)) {
      return { success: false, status: 400, message: '请提供有效的月份' };
    }
    if (periodType === 'quarterly' && (!quarter || quarter < 1 || quarter > 4)) {
      return { success: false, status: 400, message: '请提供有效的季度' };
    }
    if (!employees.length) {
      return { success: false, status: 400, message: '请至少选择一名员工' };
    }

    const normalizedPayload: SalaryForecastPayload = {
      periodType,
      year,
      ...(month ? { month } : {}),
      ...(quarter ? { quarter } : {}),
      employees,
    };

    if (user?.role !== 'manager') {
      return { success: true, payload: normalizedPayload };
    }

    const managerId = user.userId || user.id;
    const authorizedEmployees: SalaryForecastEmployee[] = [];

    for (const item of employees) {
      const employeeId = String(item?.employeeExternalId || item?.employeeId || '').trim();
      if (!employeeId) continue;

      const employee = await EmployeeModel.findById(employeeId);
      if (!employee || employee.managerId !== managerId) continue;
      if (employee.status && employee.status !== 'active') continue;

      authorizedEmployees.push({
        ...item,
        employeeExternalId: employee.id,
        employeeName: item.employeeName || employee.name,
        department: item.department || employee.department,
        subDepartment: item.subDepartment || employee.subDepartment,
      });
    }

    if (!authorizedEmployees.length) {
      return { success: false, status: 403, message: '只能查看自己直属下属的绩效工资预测' };
    }

    return {
      success: true,
      payload: {
        ...normalizedPayload,
        employees: authorizedEmployees,
      },
    };
  }

  static async fetchSalaryForecast(payload: SalaryForecastPayload): Promise<any> {
    try {
      const response = await this.postToSalary('/api/integrations/performance/salary-forecast', payload as unknown as Record<string, unknown>);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: `读取薪资系统绩效工资预测失败：${error?.response?.data?.message || error.message}`,
      };
    }
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

      const summaries = await this.loadOrGenerateQuarterlySummaries(year, quarter);
      
      if (!summaries || summaries.length === 0) {
        return {
          success: false,
          message: `未找到 ${year}-Q${quarter} 的季度汇总数据`
        };
      }
      
      const results: any[] = [];
      const sortedSummaries = [...summaries].sort((a: any, b: any) => Number(b.avg_score || 0) - Number(a.avg_score || 0));

      for (let idx = 0; idx < sortedSummaries.length; idx++) {
        const summary = sortedSummaries[idx];
        const employee = await EmployeeModel.findById(summary.employee_id);
        if (!employee) continue;

        const quarterScore = Number(Number(summary.avg_score || 0).toFixed(2));
        const level = scoreToLevel(quarterScore);
        
        results.push({
          employeeExternalId: summary.employee_id,
          employeeName: employee.name || '',
          department: employee.department || '',
          subDepartment: employee.subDepartment || '',
          quarterScore,
          monthsCount: parseInt(summary.record_count || 0),
          rank: idx + 1,
          level,
          coefficient: this.scoreToCoefficient(quarterScore)
        });
      }
      
      const payload = {
        quarter: `${year}-Q${quarter}`,
        effectiveQuarter: getEffectiveQuarter(year, quarter),
        periodType: 'quarterly',
        publishedAt: new Date().toISOString(),
        adminConfirmed: true,
        confirmedBy: confirmation?.confirmedBy || 'admin',
        confirmedAt: new Date().toISOString(),
        results: results
      };
      
      const response = await this.postToSalary('/api/integrations/performance/quarter-results', payload);
      
      return {
        success: true,
        message: `已推送 ${year}-Q${quarter} 季度绩效数据 ${results.length} 条到薪资系统`,
        data: {
          quarter: `${year}-Q${quarter}`,
          effectiveQuarter: payload.effectiveQuarter,
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

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (pushToken) {
      headers['X-Performance-Push-Token'] = pushToken;
    }

    return axios.post(`${salaryBaseUrl}${path}`, payload, {
      headers,
      timeout: 30000,
    });
  }
}
