export const EXCLUDED_PERFORMANCE_STATUSES = ['cancelled', 'exempted'] as const;

export type ExcludedPerformanceStatus = typeof EXCLUDED_PERFORMANCE_STATUSES[number];

export const isExcludedPerformanceStatus = (status?: unknown): boolean =>
  EXCLUDED_PERFORMANCE_STATUSES.includes(String(status || '') as ExcludedPerformanceStatus);

export const isScopeExcludedRecord = (record?: any): boolean => {
  if (!record) return false;
  return (
    isExcludedPerformanceStatus(record.status)
    || record.isExcludedFromStats === true
    || record.is_excluded_from_stats === true
    || record.isExcludedFromStats === 1
    || record.is_excluded_from_stats === 1
  );
};
