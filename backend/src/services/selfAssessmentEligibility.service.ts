import type { Employee } from '../types';
import { EmployeeModel } from '../models/employee.model';
import type { PerformanceRankingConfigV1 } from './performanceRankingConfig.service';

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
  const employeeId = String(employee.id || '').trim();
  const managerId = String(employee.managerId || '').trim();
  if (!managerId || managerId === employeeId) return false;
  return validEmployeeIds ? validEmployeeIds.has(managerId) : true;
}

export function isSelfAssessmentEligibleRecord(
  employee: Partial<Employee> & { id?: string; employeeId?: string },
  _config: PerformanceRankingConfigV1,
  options: { validEmployeeIds?: Set<string> } = {}
): boolean {
  const hasValidAssessor = hasValidAssessorId(employee, options.validEmployeeIds);
  return isActive(employee) && hasValidAssessor;
}

export async function resolveSelfAssessmentEligibility(
  employee: Partial<Employee> & { id?: string; employeeId?: string }
): Promise<SelfAssessmentEligibility> {
  const active = isActive(employee);
  // 是否需要自评只由人事档案上下级决定；系统角色/级别只作展示和权限辅助，不决定考核关系。
  const roleEligible = true;
  let hasValidAssessor = false;
  const managerId = String(employee.managerId || '').trim();
  const employeeId = String(employee.employeeId || employee.id || '').trim();
  if (managerId && managerId !== employeeId) {
    const manager = await EmployeeModel.findById(managerId);
    hasValidAssessor = Boolean(manager && isActive(manager));
  }
  const participating = hasValidAssessor;

  return {
    canSubmitSelfSummary: active && hasValidAssessor,
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
