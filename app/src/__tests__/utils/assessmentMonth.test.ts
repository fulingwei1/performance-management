import { describe, expect, it } from 'vitest';
import {
  getDefaultAssessmentMonth,
  getPreviousMonthFromValue,
  getPreviousMonthValue,
  isValidAssessmentMonth,
} from '@/lib/assessmentMonth';

describe('assessment month helpers', () => {
  it('defaults to previous month from day 1 to day 7', () => {
    expect(getDefaultAssessmentMonth(new Date(2026, 4, 1))).toBe('2026-04');
    expect(getDefaultAssessmentMonth(new Date(2026, 4, 7))).toBe('2026-04');
  });

  it('defaults to current month after day 7', () => {
    expect(getDefaultAssessmentMonth(new Date(2026, 4, 8))).toBe('2026-05');
  });

  it('handles January by rolling back to previous year', () => {
    expect(getPreviousMonthValue(new Date(2026, 0, 5))).toBe('2025-12');
    expect(getDefaultAssessmentMonth(new Date(2026, 0, 5))).toBe('2025-12');
    expect(getPreviousMonthFromValue('2026-01')).toBe('2025-12');
  });

  it('validates yyyy-MM month values', () => {
    expect(isValidAssessmentMonth('2026-04')).toBe(true);
    expect(isValidAssessmentMonth('2026-4')).toBe(false);
    expect(isValidAssessmentMonth('2026-13')).toBe(false);
    expect(isValidAssessmentMonth(null)).toBe(false);
  });
});
