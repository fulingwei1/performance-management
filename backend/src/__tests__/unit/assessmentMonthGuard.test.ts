import { validateTaskCreationMonth } from '../../utils/assessmentMonthGuard';

describe('assessment month guard', () => {
  const now = new Date('2026-05-06T10:00:00+08:00');

  it('allows nearby task months only', () => {
    expect(validateTaskCreationMonth('2026-04', { now })).toBeNull();
    expect(validateTaskCreationMonth('2026-06', { now })).toBeNull();
  });

  it('rejects old and far future task months', () => {
    expect(validateTaskCreationMonth('2025-01', { now })).toContain('只能创建最近');
    expect(validateTaskCreationMonth('2027-12', { now })).toContain('只能创建最近');
  });

  it('rejects invalid month formats', () => {
    expect(validateTaskCreationMonth('2026-5', { now })).toBe('月份格式错误，应为YYYY-MM');
  });
});
