/**
 * 进度监控服务
 * 实时监控月度绩效考核各阶段完成进度
 */

import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { PerformanceModel } from '../models/performance.model';
import { EmployeeModel } from '../models/employee.model';
import logger from '../config/logger';

export interface ProgressSnapshot {
  month: string;
  totalEmployees: number;
  eligibleEmployees: number;
  draftCount: number;
  submittedCount: number;
  scoredCount: number;
  completedCount: number;
  participationRate: number;
  departmentProgress: DepartmentProgress[];
  managerProgress: ManagerProgress[];
}

export interface DepartmentProgress {
  department: string;
  total: number;
  completed: number;
  rate: number;
}

export interface ManagerProgress {
  managerId: string;
  managerName: string;
  total: number;
  completed: number;
  rate: number;
}

export class ProgressMonitorService {
  /**
   * 获取指定月份的进度快照
   */
  static async getMonthProgress(month: string): Promise<ProgressSnapshot> {
    const allEmployees = await EmployeeModel.findAll();
    const eligibleEmployees = allEmployees.filter(
      (e: any) => (e.role === 'employee' || e.role === 'manager') && e.status !== 'disabled'
    );

    const records = await PerformanceModel.findByMonth(month);

    // 按状态分组
    const draftCount = records.filter(r => r.status === 'draft').length;
    const submittedCount = records.filter(r => r.status === 'submitted').length;
    const scoredCount = records.filter(r => r.status === 'scored').length;
    const completedCount = records.filter(r => r.status === 'completed').length;

    const totalRecords = eligibleEmployees.length;
    const participationRate = totalRecords > 0
      ? parseFloat(((completedCount + scoredCount + submittedCount) / totalRecords * 100).toFixed(1))
      : 0;

    // 按部门统计
    const deptMap = new Map<string, { total: number; completed: number }>();
    for (const emp of eligibleEmployees) {
      const dept = emp.department || '未分配';
      if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, completed: 0 });
      deptMap.get(dept)!.total++;
    }
    for (const rec of records.filter(r => r.status === 'completed' || r.status === 'scored')) {
      const dept = rec.department || '未分配';
      if (deptMap.has(dept)) deptMap.get(dept)!.completed++;
    }

    const departmentProgress = Array.from(deptMap.entries())
      .map(([dept, data]) => ({
        department: dept,
        total: data.total,
        completed: data.completed,
        rate: data.total > 0 ? parseFloat((data.completed / data.total * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => a.rate - b.rate);

    // 按经理统计
    const managerMap = new Map<string, { managerId: string; managerName: string; total: number; completed: number }>();
    for (const emp of eligibleEmployees) {
      if (!emp.managerId) continue;
      const mgrId = emp.managerId;
      if (!managerMap.has(mgrId)) {
        const mgr = allEmployees.find(e => e.id === mgrId);
        managerMap.set(mgrId, {
          managerId: mgrId,
          managerName: mgr?.name || '未知',
          total: 0,
          completed: 0
        });
      }
      managerMap.get(mgrId)!.total++;
    }
    for (const rec of records.filter(r => r.status === 'completed' || r.status === 'scored')) {
      // 找到该记录对应的经理
      const emp = allEmployees.find(e => e.id === rec.employeeId);
      if (emp?.managerId && managerMap.has(emp.managerId)) {
        managerMap.get(emp.managerId)!.completed++;
      }
    }

    const managerProgress = Array.from(managerMap.values())
      .map(m => ({
        managerId: m.managerId,
        managerName: m.managerName,
        total: m.total,
        completed: m.completed,
        rate: m.total > 0 ? parseFloat((m.completed / m.total * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => a.rate - b.rate);

    return {
      month,
      totalEmployees: allEmployees.length,
      eligibleEmployees: totalRecords,
      draftCount,
      submittedCount,
      scoredCount,
      completedCount,
      participationRate,
      departmentProgress,
      managerProgress
    };
  }

  /**
   * 获取所有已记录月份的进度列表
   */
  static async listMonths(): Promise<string[]> {
    if (USE_MEMORY_DB) {
      const records = Array.from(memoryStore.performanceRecords.values());
      const months = new Set(records.map(r => r.month));
      return Array.from(months).sort().reverse();
    }

    const sql = `SELECT DISTINCT month FROM performance_records ORDER BY month DESC`;
    const results = await query(sql, []);
    return results.map((r: any) => r.month);
  }
}
