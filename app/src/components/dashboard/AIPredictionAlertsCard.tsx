import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Brain, ChevronRight, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PredictionAlert {
  employeeId: string;
  employeeName: string;
  department: string;
  position?: string;
  currentScore: number;
  predictedScore: number;
  predictedMonth: string;
  drop: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  riskLevel: 'high' | 'medium';
}

interface AIPredictionAlertsCardProps {
  title?: string;
  months?: number;
  limit?: number;
  emptyText?: string;
  detailPathBuilder?: (employeeId: string) => string;
}

export function AIPredictionAlertsCard({
  title = 'AI 预测预警',
  months = 3,
  limit = 5,
  emptyText = '当前没有明显下滑风险。',
  detailPathBuilder
}: AIPredictionAlertsCardProps) {
  const [alerts, setAlerts] = useState<PredictionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await aiApi.getRiskAlerts({ months, limit });
        if (!response.success) {
          throw new Error(response.message || '加载预警失败');
        }
        setAlerts(response.data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载预警失败';
        setError(message);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    void loadAlerts();
  }, [months, limit]);

  const summary = useMemo(() => {
    return {
      high: alerts.filter(item => item.riskLevel === 'high').length,
      medium: alerts.filter(item => item.riskLevel === 'medium').length
    };
  }, [alerts]);

  return (
    <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-red-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-orange-600" />
          {title}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span>预测未来 {months} 个月</span>
          <Badge variant="outline" className="border-red-200 text-red-700">高风险 {summary.high}</Badge>
          <Badge variant="outline" className="border-amber-200 text-amber-700">中风险 {summary.medium}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: Math.min(limit, 3) }).map((_, index) => (
              <div key={index} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => {
              const detailPath = detailPathBuilder?.(alert.employeeId);

              return (
                <div
                  key={`${alert.employeeId}-${alert.predictedMonth}`}
                  className={`rounded-lg border px-4 py-3 ${
                    alert.riskLevel === 'high'
                      ? 'border-red-200 bg-red-50/80'
                      : 'border-amber-200 bg-amber-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{alert.employeeName}</span>
                        <Badge className={alert.riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                          {alert.riskLevel === 'high' ? '高风险' : '中风险'}
                        </Badge>
                        <span className="text-xs text-gray-500">{alert.department}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {alert.position || '岗位未填写'}，当前 {alert.currentScore.toFixed(1)} → {alert.predictedMonth} 预测 {alert.predictedScore.toFixed(1)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                          <TrendingDown className="h-3.5 w-3.5" />
                          预计下滑 {alert.drop.toFixed(1)} 分
                        </span>
                        <span>置信度 {alert.confidence}%</span>
                        <span>趋势 {alert.trend === 'decreasing' ? '下降' : alert.trend === 'increasing' ? '上升' : '稳定'}</span>
                      </div>
                    </div>

                    {detailPath ? (
                      <Link
                        to={detailPath}
                        className="inline-flex items-center gap-1 text-sm text-orange-700 hover:text-orange-900 shrink-0"
                      >
                        查看
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <AlertTriangle className={`h-5 w-5 shrink-0 ${alert.riskLevel === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
