import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';
import { PerformanceRecord } from '../types';
import {
  getOrgUnitKey,
  getPerformanceRankingConfig,
  isParticipatingRecord,
} from './performanceRankingConfig.service';

export interface PublicationReadinessViolation {
  type: 'incomplete' | 'forced_distribution';
  unitKey?: string;
  message: string;
  total?: number;
  completed?: number;
  topCount?: number;
  topQuota?: number;
  bottomCount?: number;
  bottomRequired?: number;
}

export interface PublicationReadinessResult {
  ok: boolean;
  participantCount: number;
  completedCount: number;
  violations: PublicationReadinessViolation[];
}

const isCompletedRecord = (record?: PerformanceRecord): boolean =>
  Boolean(record && (record.status === 'completed' || record.status === 'scored'));

const isTopScore = (record: PerformanceRecord): boolean => Number(record.totalScore || 0) >= 1.4;

const isBottomScore = (record: PerformanceRecord): boolean => Number(record.totalScore || 0) < 0.9;

const getDistributionQuota = (total: number) => ({
  topQuota: Math.ceil(total * 0.2),
  bottomRequired: Math.max(1, Math.floor(total * 0.1)),
});

export const validatePublicationReadiness = async (month: string): Promise<PublicationReadinessResult> => {
  const config = await getPerformanceRankingConfig();
  const employees = await EmployeeModel.findAll();
  const participants = employees
    .filter((employee: any) => (employee.role === 'employee' || employee.role === 'manager') && (!employee.status || employee.status === 'active'))
    .filter((employee: any) => isParticipatingRecord(employee, config));

  const records = await PerformanceModel.findByMonth(month);
  const recordsByEmployee = new Map<string, PerformanceRecord>();
  records.forEach((record) => recordsByEmployee.set(record.employeeId, record));

  const completedRecords = participants
    .map((employee: any) => recordsByEmployee.get(employee.id))
    .filter(isCompletedRecord) as PerformanceRecord[];

  const violations: PublicationReadinessViolation[] = [];
  if (participants.length === 0) {
    violations.push({
      type: 'incomplete',
      message: '当前没有参与考核的员工，不能发布绩效结果',
      total: 0,
      completed: 0,
    });
  } else if (completedRecords.length < participants.length) {
    violations.push({
      type: 'incomplete',
      message: `还有 ${participants.length - completedRecords.length} 人未完成评分，当前完成 ${completedRecords.length}/${participants.length}`,
      total: participants.length,
      completed: completedRecords.length,
    });
  }

  const recordsByUnit = new Map<string, PerformanceRecord[]>();
  for (const record of completedRecords.filter((record) => isParticipatingRecord(record, config))) {
    const unitKey = getOrgUnitKey(record);
    if (!recordsByUnit.has(unitKey)) recordsByUnit.set(unitKey, []);
    recordsByUnit.get(unitKey)!.push(record);
  }

  for (const [unitKey, unitRecords] of recordsByUnit.entries()) {
    if (unitRecords.length <= 10) continue;

    const { topQuota, bottomRequired } = getDistributionQuota(unitRecords.length);
    const topCount = unitRecords.filter(isTopScore).length;
    const bottomCount = unitRecords.filter(isBottomScore).length;
    const unitViolations: string[] = [];

    if (topCount > topQuota) {
      unitViolations.push(`优秀人数 ${topCount} 超过上限 ${topQuota}`);
    }
    if (bottomCount < bottomRequired) {
      unitViolations.push(`末位人数 ${bottomCount} 低于要求 ${bottomRequired}`);
    }

    if (unitViolations.length > 0) {
      violations.push({
        type: 'forced_distribution',
        unitKey,
        message: `${unitKey} 共 ${unitRecords.length} 人，需满足 2-7-1：${unitViolations.join('；')}`,
        total: unitRecords.length,
        completed: unitRecords.length,
        topCount,
        topQuota,
        bottomCount,
        bottomRequired,
      });
    }
  }

  return {
    ok: violations.length === 0,
    participantCount: participants.length,
    completedCount: completedRecords.length,
    violations,
  };
};

export const formatPublicationReadinessMessage = (result: PublicationReadinessResult): string => {
  if (result.ok) return '可发布';
  return result.violations.map((violation) => violation.message).join('；');
};
