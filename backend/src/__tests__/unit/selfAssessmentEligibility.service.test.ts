import { buildDefaultPerformanceRankingConfig } from '../../services/performanceRankingConfig.service';
import {
  isSelfAssessmentEligibleRecord,
  resolveAssessorId,
  resolveSelfAssessmentEligibility,
} from '../../services/selfAssessmentEligibility.service';
import { memoryStore } from '../../config/database';

describe('selfAssessmentEligibility service', () => {
  beforeEach(() => {
    memoryStore.systemSettings = new Map();
  });

  const baseEmployee = {
    id: 'e001',
    name: '员工A',
    department: '工程技术中心',
    subDepartment: 'PLC 部/PLC四组',
    level: 'senior' as const,
    status: 'active' as const,
  };

  it('allows any active employee with a valid upper assessor to submit self summary', async () => {
    const config = buildDefaultPerformanceRankingConfig();
    memoryStore.employees.set('m008', {
      ...baseEmployee,
      id: 'm008',
      name: '上级',
      role: 'manager',
    } as any);

    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'employee', managerId: 'm008' }, config, { validEmployeeIds: new Set(['m008', 'e001']) })).toBe(true);
    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'hr', managerId: 'm008' } as any, config, { validEmployeeIds: new Set(['m008', 'e001']) })).toBe(true);
    await expect(resolveSelfAssessmentEligibility({ ...baseEmployee, role: 'manager', managerId: 'm008' })).resolves.toMatchObject({
      active: true,
      roleEligible: true,
      participating: true,
      canSubmitSelfSummary: true,
    });
  });

  it('requires a valid manager_id before showing own summary', () => {
    const config = buildDefaultPerformanceRankingConfig();

    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'manager', managerId: 'e001' }, config, { validEmployeeIds: new Set(['e001']) })).toBe(false);
    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'manager', managerId: '' }, config, { validEmployeeIds: new Set(['e001']) })).toBe(false);
  });

  it('ignores scope config when the upper assessor relationship is valid', () => {
    const config = buildDefaultPerformanceRankingConfig();
    config.participation.mode = 'include';
    config.participation.includedUnitKeys = ['项目管理部'];
    config.participation.enabledUnitKeys = ['项目管理部'];
    const validEmployeeIds = new Set(['m008', 'e001']);

    expect(isSelfAssessmentEligibleRecord(
      { ...baseEmployee, role: 'manager', managerId: 'm008' },
      config,
      { validEmployeeIds }
    )).toBe(true);
  });

  it('does not use role or manual exclusion as the source of assessment relationship', () => {
    const config = buildDefaultPerformanceRankingConfig();
    config.participation.excludedEmployeeIds = ['e001'];
    const validEmployeeIds = new Set(['m008', 'e001']);

    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'gm', managerId: 'm008' } as any, buildDefaultPerformanceRankingConfig(), { validEmployeeIds })).toBe(true);
    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'hr', managerId: 'm008' } as any, buildDefaultPerformanceRankingConfig(), { validEmployeeIds })).toBe(true);
    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'employee', managerId: 'm008' }, config, { validEmployeeIds })).toBe(true);
  });

  it('uses valid manager as assessor and returns null when the relationship is missing or invalid', () => {
    const validIds = new Set(['gm001', 'm008', 'e001']);

    expect(resolveAssessorId({ id: 'e001', role: 'employee', managerId: 'm008' } as any, validIds)).toBe('m008');
    expect(resolveAssessorId({ id: 'e001', role: 'manager', managerId: 'e001' } as any, validIds)).toBeNull();
    expect(resolveAssessorId({ id: 'e001', role: 'manager', managerId: 'missing' } as any, validIds)).toBeNull();
  });
});
