import axios from 'axios';
import { EmployeeQuarterlyModel } from '../models/employeeQuarterly.model';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';

const SALARY_API_BASE = process.env.SALARY_API_URL || 'http://host.docker.internal:8000';

export class SalaryIntegrationService {
  
  static async pushQuarterlyResults(year: number, quarter: number): Promise<any> {
    try {
      const summaries = await EmployeeQuarterlyModel.findByQuarter(year, quarter);
      
      if (!summaries || summaries.length === 0) {
        return {
          success: false,
          message: `未找到 ${year}-Q${quarter} 的季度汇总数据`
        };
      }
      
      const results: any[] = [];
      for (let idx = 0; idx < summaries.length; idx++) {
        const summary = summaries[idx];
        const employee = await EmployeeModel.findById(summary.employee_id);
        if (!employee) continue;
        
        results.push({
          employeeExternalId: summary.employee_id,
          employeeName: employee.name || '',
          department: employee.department || '',
          subDepartment: employee.subDepartment || '',
          quarterScore: parseFloat(summary.avg_score || 0),
          monthsCount: parseInt(summary.record_count || 0),
          rank: idx + 1,
          level: summary.best_level || '',
          coefficient: this.scoreToCoefficient(parseFloat(summary.avg_score || 0))
        });
      }
      
      const payload = {
        quarter: `${year}-Q${quarter}`,
        effectiveQuarter: `${year}-Q${quarter}`,
        publishedAt: new Date().toISOString(),
        results: results
      };
      
      const response = await axios.post(
        `${SALARY_API_BASE}/api/integrations/performance/quarter-results`,
        payload,
        { timeout: 30000 }
      );
      
      return {
        success: true,
        message: `已推送 ${results.length} 条季度绩效数据`,
        data: {
          quarter: `${year}-Q${quarter}`,
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
  
  static async pushMonthlyResults(year: number, month: number): Promise<any> {
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const records = await PerformanceModel.findByMonth(monthStr);
      
      if (!records || records.length === 0) {
        return {
          success: false,
          message: `未找到 ${monthStr} 的月度绩效数据`
        };
      }
      
      const results: any[] = [];
      for (let idx = 0; idx < records.length; idx++) {
        const record = records[idx];
        const employee = await EmployeeModel.findById(record.employeeId);
        if (!employee) continue;
        
        results.push({
          employeeExternalId: record.employeeId,
          employeeName: employee.name || '',
          department: employee.department || '',
          subDepartment: employee.subDepartment || '',
          quarterScore: parseFloat(String(record.totalScore || 0)),
          monthsCount: 1,
          rank: idx + 1,
          level: record.level || '',
          coefficient: this.scoreToCoefficient(parseFloat(String(record.totalScore || 0)))
        });
      }
      
      const quarter = this.monthToQuarter(month);
      const payload = {
        quarter: `${year}-Q${quarter}`,
        effectiveQuarter: `${year}-Q${quarter}`,
        publishedAt: new Date().toISOString(),
        results: results
      };
      
      const response = await axios.post(
        `${SALARY_API_BASE}/api/integrations/performance/quarter-results`,
        payload,
        { timeout: 30000 }
      );
      
      return {
        success: true,
        message: `已推送 ${results.length} 条月度绩效数据`,
        data: {
          month: monthStr,
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
    if (score >= 4.5) return 1.2;
    if (score >= 4.0) return 1.1;
    if (score >= 3.5) return 1.0;
    if (score >= 3.0) return 0.9;
    if (score >= 2.5) return 0.8;
    return 0.7;
  }
  
  static monthToQuarter(month: number): number {
    return Math.floor((month - 1) / 3) + 1;
  }
}
