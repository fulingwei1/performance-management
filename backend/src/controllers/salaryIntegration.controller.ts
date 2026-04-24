import axios from 'axios';
import { Request, Response } from 'express';
import { PerformanceModel } from '../models/performance.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import { levelToScore, scoreToLevel } from '../utils/helpers';
import { getPerformanceRankingConfig, isParticipatingRecord } from '../services/performanceRankingConfig.service';

type QuarterLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

interface SalaryQuarterResultItem {
  employeeExternalId: string;
  employeeName: string;
  department: string;
  subDepartment: string;
  quarterScore: number;
  monthsCount: number;
  rank: number;
  level: QuarterLevel;
  coefficient: number;
}

interface SalaryQuarterResultsPushPayload {
  quarter: string;
  effectiveQuarter: string;
  publishedAt: string;
  results: SalaryQuarterResultItem[];
}

function quarterToMonths(quarter: string): string[] {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return [];
  const year = parseInt(match[1], 10);
  const q = parseInt(match[2], 10);
  const startMonth = (q - 1) * 3 + 1;
  return [0, 1, 2].map((offset) => `${year}-${String(startMonth + offset).padStart(2, '0')}`);
}

function nextQuarter(quarter: string): string {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return quarter;
  let year = parseInt(match[1], 10);
  let q = parseInt(match[2], 10) + 1;
  if (q === 5) {
    q = 1;
    year += 1;
  }
  return `${year}-Q${q}`;
}

function requireSalaryIntegrationConfig(): { salaryBaseUrl: string; pushToken: string } {
  const salaryBaseUrl = (process.env.SALARY_SYSTEM_BASE_URL || '').trim();
  const pushToken = (process.env.SALARY_SYSTEM_PUSH_TOKEN || '').trim();
  if (!salaryBaseUrl) {
    throw new Error('缺少环境变量 SALARY_SYSTEM_BASE_URL（例如 http://127.0.0.1:5000）');
  }
  if (!pushToken) {
    throw new Error('缺少环境变量 SALARY_SYSTEM_PUSH_TOKEN（用于调用薪资系统接收接口）');
  }
  return { salaryBaseUrl, pushToken };
}

function buildSalaryPushUrl(salaryBaseUrl: string): string {
  // 兼容 salaryBaseUrl 末尾是否带 /
  const base = salaryBaseUrl.endsWith('/') ? salaryBaseUrl.slice(0, -1) : salaryBaseUrl;
  return `${base}/api/integrations/performance/quarter-results`;
}

function isActivePerformanceEmployee(employee: any): boolean {
  const status = String(employee?.status || 'active');
  return employee?.role === 'employee' && status !== 'disabled' && status !== 'inactive';
}

export const salaryIntegrationController = {
  pushQuarterResults: asyncHandler(async (req: Request, res: Response) => {
    const quarter = String((req.body as any)?.quarter || '').trim();
    const allowIncomplete = (req.body as any)?.allowIncomplete === true;
    const months = quarterToMonths(quarter);
    if (months.length !== 3) {
      return res.status(400).json({ success: false, message: '季度格式应为 YYYY-Q1' });
    }

    const rankingConfig = await getPerformanceRankingConfig();
    const expectedEmployees = (await EmployeeModel.findAll()).filter(
      (employee: any) => isActivePerformanceEmployee(employee) && isParticipatingRecord(employee, rankingConfig)
    );

    // 汇总季度得分（仅统计已完成的月度记录）
    const scoreAgg = new Map<
      string,
      {
        employeeExternalId: string;
        employeeName: string;
        department: string;
        subDepartment: string;
        sum: number;
        count: number;
      }
    >();
    const completedMonthsByEmployee = new Map<string, Set<string>>();

    for (const month of months) {
      const records = await PerformanceModel.findByMonth(month);
      for (const record of records) {
        if (record.status !== 'completed') continue;
        if (!isParticipatingRecord(record, rankingConfig)) continue;
        const employeeExternalId = record.employeeId;
        const employeeName = (record as any).employeeName || '';
        if (!employeeExternalId || !employeeName) continue;
        if (!completedMonthsByEmployee.has(employeeExternalId)) {
          completedMonthsByEmployee.set(employeeExternalId, new Set());
        }
        completedMonthsByEmployee.get(employeeExternalId)!.add(month);

        const totalScore = Number(record.totalScore || 0);
        const department = (record as any).department || '';
        const subDepartment = (record as any).subDepartment || '';

        const prev = scoreAgg.get(employeeExternalId);
        if (!prev) {
          scoreAgg.set(employeeExternalId, {
            employeeExternalId,
            employeeName,
            department,
            subDepartment,
            sum: totalScore,
            count: 1,
          });
        } else {
          prev.sum += totalScore;
          prev.count += 1;
          // 信息以最新的为准（部门调整等）
          prev.employeeName = employeeName || prev.employeeName;
          prev.department = department || prev.department;
          prev.subDepartment = subDepartment || prev.subDepartment;
        }
      }
    }

    const incompleteEmployees = expectedEmployees
      .map((employee: any) => {
        const completedMonths = completedMonthsByEmployee.get(employee.id) || new Set<string>();
        return {
          employeeExternalId: employee.id,
          employeeName: employee.name,
          department: employee.department || '',
          subDepartment: employee.subDepartment || '',
          completedMonths: Array.from(completedMonths).sort(),
          missingMonths: months.filter((month) => !completedMonths.has(month)),
        };
      })
      .filter((item) => item.missingMonths.length > 0);

    if (incompleteEmployees.length > 0 && !allowIncomplete) {
      return res.status(409).json({
        success: false,
        message: '季度绩效尚未完成，已阻止推送到薪资系统',
        data: {
          quarter,
          effectiveQuarter: nextQuarter(quarter),
          months,
          expectedEmployeeCount: expectedEmployees.length,
          incompleteEmployeeCount: incompleteEmployees.length,
          incompleteEmployees: incompleteEmployees.slice(0, 20),
        },
      });
    }

    const effectiveQuarter = nextQuarter(quarter);
    const publishedAt = new Date().toISOString();

    const items: SalaryQuarterResultItem[] = Array.from(scoreAgg.values()).map((agg) => {
      const avg = agg.count > 0 ? agg.sum / agg.count : 0;
      const quarterScore = Math.round(avg * 100) / 100;
      const level = scoreToLevel(quarterScore) as QuarterLevel;
      const coefficient = levelToScore(level);
      return {
        employeeExternalId: agg.employeeExternalId,
        employeeName: agg.employeeName,
        department: agg.department,
        subDepartment: agg.subDepartment,
        quarterScore,
        monthsCount: agg.count,
        rank: 0, // to be filled
        level,
        coefficient,
      };
    });

    items.sort((a, b) => {
      if (b.quarterScore !== a.quarterScore) return b.quarterScore - a.quarterScore;
      return a.employeeExternalId.localeCompare(b.employeeExternalId);
    });
    items.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    if (items.length === 0) {
      return res.status(409).json({
        success: false,
        message: '该季度没有可推送的已完成绩效结果',
        data: { quarter, effectiveQuarter, months },
      });
    }

    const payload: SalaryQuarterResultsPushPayload = {
      quarter,
      effectiveQuarter,
      publishedAt,
      results: items,
    };

    const { salaryBaseUrl, pushToken } = requireSalaryIntegrationConfig();
    const url = buildSalaryPushUrl(salaryBaseUrl);

    const salaryResp = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Performance-Push-Token': pushToken,
      },
      timeout: 15_000,
    });

    res.json({
      success: true,
      data: {
        quarter,
        effectiveQuarter,
        months,
        pushedTo: url,
        performanceCount: items.length,
        expectedEmployeeCount: expectedEmployees.length,
        incompleteEmployeeCount: incompleteEmployees.length,
        incompletePushAllowed: allowIncomplete,
        salaryResponse: salaryResp.data,
      },
      message: '季度绩效结果已推送到薪资系统',
    });
  }),
};
