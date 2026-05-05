const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthIndex = (month: string): number => {
  const [yearText, monthText] = month.split('-');
  return Number(yearText) * 12 + Number(monthText);
};

const formatMonth = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export interface AssessmentMonthGuardOptions {
  now?: Date;
  pastMonths?: number;
  futureMonths?: number;
  skipInTest?: boolean;
}

export function validateTaskCreationMonth(
  month: string,
  options: AssessmentMonthGuardOptions = {}
): string | null {
  if (!MONTH_PATTERN.test(month)) return '月份格式错误，应为YYYY-MM';

  if (options.skipInTest && process.env.NODE_ENV === 'test') return null;

  const now = options.now || new Date();
  const pastMonths = options.pastMonths ?? 2;
  const futureMonths = options.futureMonths ?? 1;
  const currentIndex = monthIndex(formatMonth(now));
  const targetIndex = monthIndex(month);
  const minIndex = currentIndex - pastMonths;
  const maxIndex = currentIndex + futureMonths;

  if (targetIndex < minIndex || targetIndex > maxIndex) {
    return `只能创建最近${pastMonths}个月至未来${futureMonths}个月内的绩效任务`;
  }

  return null;
}
