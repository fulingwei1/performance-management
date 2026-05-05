import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Loader2, MessageSquare, Power, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  satisfactionSurveyApi,
  SatisfactionSurvey,
  SatisfactionSurveyStats,
} from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function formatAverage(value: number | null) {
  return value === null ? '—' : value.toFixed(1);
}

export default function HRSatisfactionSurvey() {
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [stats, setStats] = useState<SatisfactionSurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const selectedSurvey = useMemo(
    () => surveys.find((survey) => survey.id === selectedId) || null,
    [selectedId, surveys],
  );

  const loadStats = async (surveyId: string) => {
    if (!surveyId) {
      setStats(null);
      return;
    }
    const response = await satisfactionSurveyApi.getStats(surveyId);
    if (response.success) setStats(response.data as SatisfactionSurveyStats);
  };

  const loadSurveys = async (preferredId?: string) => {
    setLoading(true);
    try {
      const response = await satisfactionSurveyApi.list();
      const list = response.success ? response.data as SatisfactionSurvey[] : [];
      setSurveys(list);
      const nextId = preferredId || selectedId || list[0]?.id || '';
      setSelectedId(nextId);
      await loadStats(nextId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载满意度调查失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureCurrent = async () => {
    setWorking(true);
    try {
      const response = await satisfactionSurveyApi.ensureCurrent();
      if (response.success) {
        toast.success(response.message || '当前半年度调查已就绪');
        await loadSurveys((response.data as SatisfactionSurvey).id);
      } else {
        toast.error(response.message || '创建失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败');
    } finally {
      setWorking(false);
    }
  };

  const updateStatus = async (status: 'open' | 'closed') => {
    if (!selectedSurvey) return;
    setWorking(true);
    try {
      const response = status === 'open'
        ? await satisfactionSurveyApi.open(selectedSurvey.id)
        : await satisfactionSurveyApi.close(selectedSurvey.id);
      if (response.success) {
        toast.success(response.message || '状态已更新');
        await loadSurveys(selectedSurvey.id);
      } else {
        toast.error(response.message || '状态更新失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '状态更新失败');
    } finally {
      setWorking(false);
    }
  };

  const handleSelect = async (surveyId: string) => {
    setSelectedId(surveyId);
    setWorking(true);
    try {
      await loadStats(surveyId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载统计失败');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">半年度满意度调查</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">系统每半年自动准备一次；这里可以手动创建、开放/关闭，并查看匿名汇总统计。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => loadSurveys(selectedId)} disabled={loading || working}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button onClick={ensureCurrent} disabled={working}>
            {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            确保本期调查
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在加载满意度调查...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>调查期次</CardTitle>
              <CardDescription>按半年度管理，每个员工每期只能保留一份最新答卷。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {surveys.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  还没有调查。点击“确保本期调查”即可创建当前半年度。
                </div>
              ) : surveys.map((survey) => (
                <button
                  key={survey.id}
                  type="button"
                  onClick={() => handleSelect(survey.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedId === survey.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">{survey.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      survey.status === 'open'
                        ? 'bg-green-100 text-green-700'
                        : survey.status === 'closed'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {survey.status === 'open' ? '开放' : survey.status === 'closed' ? '已关闭' : '草稿'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{survey.startDate} 至 {survey.endDate}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {selectedSurvey ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle>{selectedSurvey.title}</CardTitle>
                        <CardDescription className="mt-1">{selectedSurvey.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {selectedSurvey.status === 'open' ? (
                          <Button variant="outline" onClick={() => updateStatus('closed')} disabled={working}>
                            <Power className="mr-2 h-4 w-4" />
                            关闭调查
                          </Button>
                        ) : (
                          <Button onClick={() => updateStatus('open')} disabled={working}>
                            <Power className="mr-2 h-4 w-4" />
                            开放填写
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-lg border bg-white p-4">
                        <p className="text-sm text-gray-500">答卷数量</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.responseCount || 0}</p>
                      </div>
                      <div className="rounded-lg border bg-white p-4">
                        <p className="text-sm text-gray-500">综合满意度</p>
                        <p className="mt-2 text-3xl font-bold text-blue-600">{formatAverage(stats?.overallAverage ?? null)}</p>
                      </div>
                      <div className="rounded-lg border bg-white p-4">
                        <p className="text-sm text-gray-500">统计口径</p>
                        <p className="mt-2 text-sm font-medium text-gray-900">1-5 分，默认匿名汇总</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      题目平均分
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(stats?.questionAverages || selectedSurvey.questions.map((question) => ({ ...question, average: null }))).map((item) => {
                      const width = item.average === null ? 0 : Math.max(0, Math.min(100, (item.average / 5) * 100));
                      return (
                        <div key={item.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-gray-800">{item.label}</span>
                            <span className="font-mono text-gray-700">{formatAverage(item.average)}</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-gray-100">
                            <div className="h-2.5 rounded-full bg-blue-500" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>部门分布</CardTitle>
                    <CardDescription>按答卷中的员工部门做汇总，便于观察部门差异。</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats?.departmentBreakdown?.length ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="py-2 pr-4 font-medium">部门</th>
                              <th className="py-2 pr-4 font-medium">答卷数</th>
                              <th className="py-2 pr-4 font-medium">平均分</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {stats.departmentBreakdown.map((item) => (
                              <tr key={item.department}>
                                <td className="py-2 pr-4 text-gray-900">{item.department}</td>
                                <td className="py-2 pr-4 text-gray-700">{item.responseCount}</td>
                                <td className="py-2 pr-4 font-mono text-gray-700">{formatAverage(item.average)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">暂无答卷。</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>补充意见</CardTitle>
                    <CardDescription>匿名答卷不展示姓名；非匿名答卷展示员工姓名。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats?.comments?.length ? stats.comments.map((item, index) => (
                      <div key={`${item.submittedAt}-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                          <span>{item.anonymous ? '匿名' : item.employeeName || '未署名'} · {item.department}</span>
                          <span>{new Date(item.submittedAt).toLocaleString('zh-CN')}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-gray-800">{item.comment}</p>
                      </div>
                    )) : (
                      <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">暂无补充意见。</p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  请选择一个调查期次，或先创建当前半年度调查。
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
