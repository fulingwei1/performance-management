import { format } from 'date-fns';

const ASSESSMENT_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getPreviousMonthValue(referenceDate = new Date()): string {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  return format(date, 'yyyy-MM');
}

export function getDefaultAssessmentMonth(referenceDate = new Date()): string {
  if (referenceDate.getDate() <= 7) {
    return getPreviousMonthValue(referenceDate);
  }

  return format(referenceDate, 'yyyy-MM');
}

export function isValidAssessmentMonth(month: string | null | undefined): month is string {
  return typeof month === 'string' && ASSESSMENT_MONTH_PATTERN.test(month);
}

export function getPreviousMonthFromValue(month: string): string {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const date = new Date(year, monthIndex - 1, 1);

  return format(date, 'yyyy-MM');
}
