import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ReportRisk {
  type: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  count?: number;
  department?: string;
}

export interface ReportDepartmentSummary {
  department: string;
  totalCount: number;
  scoredCount: number;
  pendingCount: number;
  completionRate: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  excellentCount: number;
  lowCount: number;
}

export interface ReportSummaryData {
  month: string;
  previousMonth: string;
  scope: 'company' | 'team';
  overview: {
    totalRecords: number;
    scoredCount: number;
    pendingCount: number;
    completionRate: number;
    avgScore: number;
    maxScore: number;
    minScore: number;
    previousAvgScore: number;
    previousCompletionRate: number;
    avgScoreDelta: number;
    completionRateDelta: number;
  };
  distribution: Array<{
    label: string;
    count: number;
    ratio: number;
  }>;
  departments: ReportDepartmentSummary[];
  risks: ReportRisk[];
  publicationReadiness?: {
    ok: boolean;
    participantCount: number;
    completedCount: number;
  } | null;
}

const formatScore = (value: number | null | undefined) => (
  Number(value || 0) > 0 ? Number(value).toFixed(2) : '—'
);

const formatDelta = (value: number, suffix = '') => {
  if (!Number.isFinite(value) || value === 0) return `持平${suffix}`;
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
};

const riskClass = (severity: ReportRisk['severity']) => {
  if (severity === 'danger') return 'border-red-200 bg-red-50 text-red-700';
  if (severity === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-blue-100 bg-blue-50 text-blue-700';
};

function DeltaBadge({ value, suffix = '' }: { value: number; suffix?: string }) {
  const isUp = value > 0;
  const isDown = value < 0;
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1',
        isUp && 'border-green-200 bg-green-50 text-green-700',
        isDown && 'border-red-200 bg-red-50 text-red-700',
        !isUp && !isDown && 'border-gray-200 bg-gray-50 text-gray-600',
      )}
    >
      {isUp && <TrendingUp className="h-3 w-3" />}
      {isDown && <TrendingDown className="h-3 w-3" />}
      {formatDelta(value, suffix)}
    </Badge>
  );
}

export function ReportSummaryCard({
  summary,
  title = '执行摘要',
  description,
  showDepartments = true,
}: {
  summary: ReportSummaryData | null;
  title?: string;
  description?: string;
  showDepartments?: boolean;
}) {
  if (!summary) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-gray-500">
          正在生成报表摘要...
        </CardContent>
      </Card>
    );
  }

  const { overview } = summary;
  const topRisk = summary.risks?.[0];
  const topDepartments = [...(summary.departments || [])]
    .sort((a, b) => b.pendingCount - a.pendingCount || b.scoredCount - a.scoredCount)
    .slice(0, 5);

  return (
    <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              {title}
            </CardTitle>
            <p className="mt-1 text-sm text-gray-500">
              {description || `${summary.month} 报表摘要 · ${summary.scope === 'company' ? '公司口径' : '团队口径'}`}
            </p>
          </div>
          <Badge className={summary.publicationReadiness?.ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
            {summary.publicationReadiness
              ? summary.publicationReadiness.ok ? '发布检查通过' : '发布检查需关注'
              : '团队报表'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">完成率</p>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{overview.completionRate.toFixed(1)}%</p>
            <div className="mt-2"><DeltaBadge value={overview.completionRateDelta} suffix="%" /></div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">平均分</p>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{formatScore(overview.avgScore)}</p>
            <div className="mt-2"><DeltaBadge value={overview.avgScoreDelta} /></div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">已评分/参与</p>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{overview.scoredCount}/{overview.totalRecords}</p>
            <p className="mt-2 text-xs text-gray-500">待评分 {overview.pendingCount} 人</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">最高/最低</p>
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{formatScore(overview.maxScore)}</p>
            <p className="mt-2 text-xs text-gray-500">最低 {formatScore(overview.minScore)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-gray-900">L1-L5 分布</p>
            <div className="space-y-3">
              {summary.distribution.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                    <span>{item.label}</span>
                    <span>{item.count} 人 · {item.ratio.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(item.ratio, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              风险提醒
            </p>
            <div className="space-y-2">
              {(summary.risks || []).slice(0, 5).map((risk, index) => (
                <div key={`${risk.type}-${index}`} className={cn('rounded-lg border px-3 py-2 text-sm', riskClass(risk.severity))}>
                  <p className="font-medium">{risk.title}</p>
                  <p className="mt-1 text-xs opacity-90">{risk.message}</p>
                </div>
              ))}
              {!topRisk && <p className="text-sm text-gray-400">暂无风险提醒。</p>}
            </div>
          </div>
        </div>

        {showDepartments && topDepartments.length > 0 && (
          <div className="rounded-xl border bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-gray-900">部门概览</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {topDepartments.map((dept) => (
                <div key={dept.department} className="rounded-lg border bg-gray-50 p-3">
                  <p className="truncate text-sm font-medium text-gray-900">{dept.department}</p>
                  <p className="mt-2 text-xs text-gray-500">完成率 {dept.completionRate.toFixed(1)}%</p>
                  <p className="mt-1 text-xs text-gray-500">均分 {formatScore(dept.avgScore)} · 待评 {dept.pendingCount}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
