import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, CheckCircle, FileText } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { assessmentPublicationApi, employeeQuarterlyApi } from '@/services/api';
import type { PerformanceRecord } from '@/types';

interface QuarterlyRecord {
  id: string;
  year: number;
  quarter: number;
  avg_score: number | string;
  max_score: number | string;
  min_score: number | string;
  best_level?: string;
  trend?: 'up' | 'down' | 'flat';
  record_count?: number;
}

const getScoreValue = (value: unknown): number => {
  const score = Number(value);
  return Number.isFinite(score) && score > 0 ? score : 0;
};

const formatScore = (value: unknown): string => {
  const score = getScoreValue(value);
  return score > 0 ? score.toFixed(2) : '—';
};

const isScoredRecord = (record: PerformanceRecord): boolean => (
  getScoreValue(record.totalScore) > 0 && ['completed', 'scored'].includes(record.status)
);

function parseMonth(month: string): { year: number; monthNumber: number; quarter: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (!Number.isInteger(year) || monthNumber < 1 || monthNumber > 12) return null;
  return { year, monthNumber, quarter: Math.ceil(monthNumber / 3) };
}

function getQuarterMonths(year: number, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map((offset) => `${year}-${String(startMonth + offset).padStart(2, '0')}`);
}

function getRecordStatusText(record: PerformanceRecord, isPublished: boolean): string {
  if (!isScoredRecord(record)) {
    return record.status === 'submitted' ? '待经理评分' : '未评分';
  }
  return isPublished ? '正式' : '草稿';
}

function getRecordStatusClass(record: PerformanceRecord, isPublished: boolean): string {
  if (!isScoredRecord(record)) return 'bg-amber-100 text-amber-700';
  return isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
}

export function MyScores({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuthStore();
  const { records, fetchMyRecords } = usePerformanceStore();
  const [publicationStatus, setPublicationStatus] = useState<Record<string, boolean>>({});
  const [quarterlyRecords, setQuarterlyRecords] = useState<QuarterlyRecord[]>([]);

  useEffect(() => {
    if (user) fetchMyRecords(user.id);
  }, [user, fetchMyRecords]);

  useEffect(() => {
    const fetchQuarterly = async () => {
      if (!user) return;
      try {
        const response = await employeeQuarterlyApi.getMy();
        if (response.success) setQuarterlyRecords(response.data || []);
      } catch (error) {
        console.error('获取季度汇总失败:', error);
      }
    };
    fetchQuarterly();
  }, [user]);

  useEffect(() => {
    const checkPublicationStatus = async () => {
      const uniqueMonths = [...new Set(records.map((record) => record.month))];
      const results = await Promise.all(
        uniqueMonths.map(async (month) => {
          try {
            const response = await assessmentPublicationApi.checkPublished(month);
            return [month, response.success ? response.data.isPublished : false] as const;
          } catch {
            return [month, false] as const;
          }
        })
      );
      setPublicationStatus(Object.fromEntries(results));
    };

    if (records.length > 0) checkPublicationStatus();
    else setPublicationStatus({});
  }, [records]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.month.localeCompare(a.month)),
    [records]
  );

  const latestRecord = sortedRecords[0];
  const latestQuarterlyRecord = quarterlyRecords[0];

  const quarterContext = useMemo(() => {
    if (latestQuarterlyRecord) {
      return {
        year: Number(latestQuarterlyRecord.year),
        quarter: Number(latestQuarterlyRecord.quarter),
        official: true,
      };
    }
    const latestMonth = latestRecord ? parseMonth(latestRecord.month) : null;
    return latestMonth ? { year: latestMonth.year, quarter: latestMonth.quarter, official: false } : null;
  }, [latestQuarterlyRecord, latestRecord]);

  const quarterSummary = useMemo(() => {
    if (!quarterContext) return null;

    const months = getQuarterMonths(quarterContext.year, quarterContext.quarter);
    const recordsByMonth = new Map(sortedRecords.map((record) => [record.month, record]));
    const monthRows = months.map((month) => ({ month, record: recordsByMonth.get(month) }));
    const scoredMonths = monthRows
      .map((item) => item.record)
      .filter((record): record is PerformanceRecord => Boolean(record && isScoredRecord(record)));

    const calculatedAverage = scoredMonths.length > 0
      ? scoredMonths.reduce((sum, record) => sum + getScoreValue(record.totalScore), 0) / scoredMonths.length
      : 0;
    const officialAverage = latestQuarterlyRecord
      && Number(latestQuarterlyRecord.year) === quarterContext.year
      && Number(latestQuarterlyRecord.quarter) === quarterContext.quarter
      ? getScoreValue(latestQuarterlyRecord.avg_score)
      : 0;

    return {
      ...quarterContext,
      months: monthRows,
      monthCount: scoredMonths.length,
      averageScore: officialAverage || calculatedAverage,
      officialAverage: officialAverage > 0,
    };
  }, [latestQuarterlyRecord, quarterContext, sortedRecords]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {!embedded && (
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-gray-900">我的绩效</h1>
          <p className="text-gray-500 mt-1">按月查看绩效得分和季度汇总</p>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              绩效得分（按月）
            </CardTitle>
            <p className="text-sm text-gray-500">每个月只展示一个最终绩效得分；未评分月份显示为 —。</p>
          </CardHeader>
          <CardContent>
            {sortedRecords.length > 0 ? (
              <div className="divide-y rounded-xl border bg-white">
                {sortedRecords.map((record) => {
                  const isPublished = Boolean(publicationStatus[record.month]);
                  return (
                    <div key={record.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-gray-900">{record.month}</span>
                        {latestRecord?.id === record.id && (
                          <Badge className="bg-blue-100 text-blue-700">最新</Badge>
                        )}
                        <Badge className={getRecordStatusClass(record, isPublished)}>
                          {isPublished && <CheckCircle className="mr-1 h-3 w-3" />}
                          {!isPublished && isScoredRecord(record) && <FileText className="mr-1 h-3 w-3" />}
                          {getRecordStatusText(record, isPublished)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">绩效得分</p>
                          {isScoredRecord(record) ? (
                            <ScoreDisplay score={record.totalScore} size="sm" showLabel={false} />
                          ) : (
                            <p className="text-2xl font-bold text-gray-400">—</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-gray-500">暂无绩效记录</p>
                <p className="mt-2 text-sm text-gray-400">员工提交月度总结、经理完成评分后，这里会按月显示一个绩效得分。</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
              季度汇总
            </CardTitle>
            <p className="text-sm text-gray-500">显示该季度前面几个月的月度得分汇总；正式季度分归档后优先显示正式汇总。</p>
          </CardHeader>
          <CardContent>
            {quarterSummary ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{quarterSummary.year}年 Q{quarterSummary.quarter}</p>
                      <p className="mt-1 text-xl font-semibold text-gray-900">
                        已汇总 {quarterSummary.monthCount} 个月
                        {quarterSummary.officialAverage ? ' · 正式季度汇总' : ' · 月度临时汇总'}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-gray-500">季度绩效得分</p>
                      <p className="mt-1 text-3xl font-bold text-purple-600">{formatScore(quarterSummary.averageScore)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {quarterSummary.months.map(({ month, record }) => (
                    <div key={month} className="rounded-lg border bg-white p-3">
                      <p className="text-sm font-medium text-gray-900">{month}</p>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-gray-500">月度得分</p>
                          <p className="text-2xl font-bold text-gray-900">{record ? formatScore(record.totalScore) : '—'}</p>
                        </div>
                        <Badge className={record && isScoredRecord(record) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                          {record && isScoredRecord(record) ? '已评分' : '未评分'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-gray-500">
                暂无季度汇总；月度评分完成后，这里会显示本季度前面几个月的汇总。
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
