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

  it('allows active employees and managers in assessment scope to submit self summary', async () => {
    const config = buildDefaultPerformanceRankingConfig();

    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'employee' }, config)).toBe(true);
    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'manager', managerId: 'm008' }, config)).toBe(true);
    await expect(resolveSelfAssessmentEligibility({ ...baseEmployee, role: 'manager' })).resolves.toMatchObject({
      active: true,
      roleEligible: true,
      participating: true,
      canSubmitSelfSummary: true,
    });
  });

  it('does not require a currently valid manager_id before showing own summary', () => {
    const config = buildDefaultPerformanceRankingConfig();

    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'manager', managerId: 'e001' }, config)).toBe(true);
    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'manager', managerId: '' }, config)).toBe(true);
  });

  it('allows people with a valid upper assessor even when the current scope config is narrow', () => {
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

  it('excludes non self-assessment roles and excluded employees', () => {
    const config = buildDefaultPerformanceRankingConfig();
    config.participation.excludedEmployeeIds = ['e001'];

    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'gm' }, buildDefaultPerformanceRankingConfig())).toBe(false);
    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'hr' }, buildDefaultPerformanceRankingConfig())).toBe(false);
    expect(isSelfAssessmentEligibleRecord({ ...baseEmployee, role: 'employee' }, config)).toBe(false);
  });

  it('uses valid manager as assessor and falls back to gm001 when the relationship is missing or invalid', () => {
    const validIds = new Set(['gm001', 'm008', 'e001']);

    expect(resolveAssessorId({ id: 'e001', role: 'employee', managerId: 'm008' } as any, validIds)).toBe('m008');
    expect(resolveAssessorId({ id: 'e001', role: 'manager', managerId: 'e001' } as any, validIds)).toBe('gm001');
    expect(resolveAssessorId({ id: 'e001', role: 'manager', managerId: 'missing' } as any, validIds)).toBe('gm001');
  });
});
