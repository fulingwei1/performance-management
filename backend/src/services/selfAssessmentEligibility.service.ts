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

function isSelfAssessmentRole(role?: string): boolean {
  // 当前月度绩效自评对象是普通员工和需要被上级考核的经理/主管/组长。
  return role === 'employee' || role === 'manager';
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
  config: PerformanceRankingConfigV1,
  options: { validEmployeeIds?: Set<string> } = {}
): boolean {
  const participating = isParticipatingRecord(
    {
      employeeId: employee.employeeId || employee.id,
      department: employee.department,
      subDepartment: employee.subDepartment,
    },
    config
  );
  const hasValidAssessor = hasValidAssessorId(employee, options.validEmployeeIds);
  return (
    isActive(employee) &&
    isSelfAssessmentRole(employee.role) &&
    (participating || hasValidAssessor)
  );
}

export async function resolveSelfAssessmentEligibility(
  employee: Partial<Employee> & { id?: string; employeeId?: string }
): Promise<SelfAssessmentEligibility> {
  const config = await getPerformanceRankingConfig();
  const active = isActive(employee);
  const roleEligible = isSelfAssessmentRole(employee.role);
  let hasValidAssessor = false;
  const managerId = String(employee.managerId || '').trim();
  const employeeId = String(employee.employeeId || employee.id || '').trim();
  if (managerId && managerId !== employeeId) {
    const manager = await EmployeeModel.findById(managerId);
    hasValidAssessor = Boolean(manager && isActive(manager));
  }
  const participating = isParticipatingRecord(
    {
      employeeId: employee.employeeId || employee.id,
      department: employee.department,
      subDepartment: employee.subDepartment,
    },
    config
  );

  return {
    canSubmitSelfSummary: active && roleEligible && (participating || hasValidAssessor),
    roleEligible,
    active,
    participating,
    hasValidAssessor,
  };
}

export function resolveAssessorId(
  employee: Partial<Employee>,
  validEmployeeIds: Set<string>,
  fallbackAssessorId = 'gm001'
): string {
  const managerId = String(employee.managerId || '').trim();
  if (managerId && managerId !== employee.id && validEmployeeIds.has(managerId)) {
    return managerId;
  }
  return fallbackAssessorId;
}
