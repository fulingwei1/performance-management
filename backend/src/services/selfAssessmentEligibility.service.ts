import type { Employee } from '../types';
import { EmployeeModel } from '../models/employee.model';
import {
  getPerformanceRankingConfig,
  isParticipatingRecord,
  type PerformanceRankingConfigV1,
} from './performanceRankingConfig.service';

export type SelfAssessmentEligibility = {
  canSubmitSelfSummary: boolean;
  roleEligible: boolean;
  active: boolean;
  participating: boolean;
  hasValidAssessor: boolean;
};

function isActive(employee: Partial<Employee>): boolean {
  return !employee.status || employee.status === 'active';
}

export function hasValidAssessorId(
  employee: Partial<Employee>,
  validEmployeeIds?: Set<string>
): boolean {
  const employeeId = String(employee.id || (employee as any).employeeId || '').trim();
  const managerId = String(employee.managerId || '').trim();
  if (!managerId || managerId === employeeId) return false;
  return validEmployeeIds ? validEmployeeIds.has(managerId) : true;
}

export function isSelfAssessmentEligibleRecord(
  employee: Partial<Employee> & { id?: string; employeeId?: string },
  config: PerformanceRankingConfigV1,
  options: { validEmployeeIds?: Set<string> } = {}
): boolean {
  const participating = isParticipatingRecord(employee, config);
  const hasValidAssessor = hasValidAssessorId(employee, options.validEmployeeIds);
  return isActive(employee) && participating && hasValidAssessor;
}

export async function resolveSelfAssessmentEligibility(
  employee: Partial<Employee> & { id?: string; employeeId?: string }
): Promise<SelfAssessmentEligibility> {
  const active = isActive(employee);
  // 是否需要自评先由绩效参与范围决定，再由人事档案上下级决定考核人。
  // 系统角色/级别只作展示和权限辅助，不决定考核关系。
  const roleEligible = true;
  const config = await getPerformanceRankingConfig();
  const participating = isParticipatingRecord(employee, config);
  let hasValidAssessor = false;
  const managerId = String(employee.managerId || '').trim();
  const employeeId = String(employee.employeeId || employee.id || '').trim();
  if (managerId && managerId !== employeeId) {
    const manager = await EmployeeModel.findById(managerId);
    hasValidAssessor = Boolean(manager && isActive(manager));
  }
  return {
    canSubmitSelfSummary: active && participating && hasValidAssessor,
    roleEligible,
    active,
    participating,
    hasValidAssessor,
  };
}

export function resolveAssessorId(
  employee: Partial<Employee>,
  validEmployeeIds: Set<string>
): string | null {
  const managerId = String(employee.managerId || '').trim();
  if (managerId && managerId !== employee.id && validEmployeeIds.has(managerId)) {
    return managerId;
  }
  return null;
}
