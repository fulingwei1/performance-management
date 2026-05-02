/**
 * 部门经理绩效看板
 * 展示团队绩效趋势、四维分析等
 */

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { performanceApi, employeeApi } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendChart } from '@/components/charts/TrendChart';
import { RadarChart } from '@/components/charts/RadarChart';
import { TalentGrid } from '@/components/stats/TalentGrid';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2, 
  BarChart3,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Tags
} from 'lucide-react';
import { format } from 'date-fns';
import keywordsData from '@/data/evaluation-keywords.json';
import { topTagEntries } from '@/lib/performanceTagAnalytics';

// 时间范围选项
const TIME_RANGE_OPTIONS = [
  { value: '3', label: '最近3个月' },
  { value: '6', label: '最近6个月' },
  { value: '12', label: '最近12个月' },
];

export function Analytics() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6');
  const [hasDemoData, setHasDemoData] = useState(false);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const keywordLabelMap = useMemo(() => {
    const entries = [...(keywordsData.positive || []), ...(keywordsData.negative || [])].map((item: any) => [item.id, item.text]);
    return new Map<string, string>(entries);
  }, []);

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [recordsRes, subRes, demoStatusRes] = await Promise.all([
          performanceApi.getTeamRecords(undefined, parseInt(timeRange)),
          employeeApi.getSubordinates(),
          performanceApi.getDemoDataStatus()
        ]);
        
        if (recordsRes.success) setRecords(recordsRes.data);
        if (subRes.success) setSubordinates(subRes.data);
        if (demoStatusRes.success) setHasDemoData(demoStatusRes.hasDemoData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, timeRange]);

  const realRecords = useMemo(
    () => records.filter((record) => !record.isDemo && !String(record.id || '').startsWith('demo-')),
    [records]
  );

  // 计算统计数据
  const stats = useMemo(() => {
    // 只获取有评分的记录（解决月初未评分问题）
    const currentMonthRecords = realRecords.filter(r => r.month === currentMonth && r.totalScore > 0);
    const previousMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM');
    const previousMonthRecords = realRecords.filter(r => r.month === previousMonth && r.totalScore > 0);
    
    const currentAvg = currentMonthRecords.length > 0
      ? currentMonthRecords.reduce((sum, r) => sum + r.totalScore, 0) / currentMonthRecords.length
      : 0;
    const previousAvg = previousMonthRecords.length > 0
      ? previousMonthRecords.reduce((sum, r) => sum + r.totalScore, 0) / previousMonthRecords.length
      : 0;
    
    return {
      teamSize: subordinates.length,
      currentCompleted: currentMonthRecords.filter(r => r.status === 'completed' || r.status === 'scored').length,
      currentAvg,
      previousAvg,
      change: currentAvg - previousAvg
    };
  }, [realRecords, subordinates, currentMonth]);

  // 生成趋势图数据
  const trendData = useMemo(() => {
    const monthsSet = new Set(realRecords.map(r => r.month));
    const months = Array.from(monthsSet).sort();
    
    return months.map(month => {
      // 只获取有评分的记录（解决月初未评分问题）
      const monthRecords = realRecords.filter(r => r.month === month && r.totalScore > 0);
      const avgScore = monthRecords.length > 0
        ? monthRecords.reduce((sum, r) => sum + r.totalScore, 0) / monthRecords.length
        : null; // 没有评分数据时返回null，图表会断开
      return {
        month,
        teamAvg: avgScore !== null ? Math.round(avgScore * 100) / 100 : null
      };
    });
  }, [realRecords]);

  // 四维分析数据
  const radarData = useMemo(() => {
    // 只获取有评分的记录（解决月初未评分问题）
    const currentMonthRecords = realRecords.filter(r => r.month === currentMonth && r.totalScore > 0);
    const previousMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM');
    const previousMonthRecords = realRecords.filter(r => r.month === previousMonth && r.totalScore > 0);
    
    const calcAvg = (recs: any[], key: string) => 
      recs.length > 0 ? recs.reduce((sum, r) => sum + (r[key] || 0), 0) / recs.length : 0;
    
    return {
      current: {
        taskCompletion: calcAvg(currentMonthRecords, 'taskCompletion'),
        initiative: calcAvg(currentMonthRecords, 'initiative'),
        projectFeedback: calcAvg(currentMonthRecords, 'projectFeedback'),
        qualityImprovement: calcAvg(currentMonthRecords, 'qualityImprovement')
      },
      previous: {
        taskCompletion: calcAvg(previousMonthRecords, 'taskCompletion'),
        initiative: calcAvg(previousMonthRecords, 'initiative'),
        projectFeedback: calcAvg(previousMonthRecords, 'projectFeedback'),
        qualityImprovement: calcAvg(previousMonthRecords, 'qualityImprovement')
      }
    };
  }, [realRecords, currentMonth]);

  // 九宫格数据
  const talentGridData = useMemo(() => {
    // 按员工分组
    const employeeRecords = new Map<string, any[]>();
    realRecords.forEach(r => {
      if (!employeeRecords.has(r.employeeId)) {
        employeeRecords.set(r.employeeId, []);
      }
      employeeRecords.get(r.employeeId)!.push(r);
    });
    
    return subordinates.map(emp => {
      const empRecords = employeeRecords.get(emp.id) || [];
      const sortedRecords = empRecords.sort((a, b) => a.month.localeCompare(b.month));
      
      // 获取有评分的历史记录（解决月初未评分问题）
      const scoredRecords = sortedRecords.filter(r => r.totalScore > 0);
      const historyScores = scoredRecords.map(r => r.totalScore);
      
      // 使用最近有评分的记录作为当前分数
      const currentRecord = scoredRecords.length > 0 
        ? scoredRecords[scoredRecords.length - 1]  // 最近有评分的记录
        : null;
      const previousRecord = scoredRecords.length > 1 
        ? scoredRecords[scoredRecords.length - 2]  // 上一条有评分的记录
        : null;
      
      const currentScore = currentRecord?.totalScore || 0;
      const previousScore = previousRecord?.totalScore || 0;
      const avgScore = historyScores.length > 0 
        ? historyScores.reduce((a, b) => a + b, 0) / historyScores.length 
        : 0;
      
      // 计算趋势
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (currentScore - previousScore > 0.05) trend = 'up';
      else if (currentScore - previousScore < -0.05) trend = 'down';
      
      // 计算连续进步月数
      let consecutiveImproving = 0;
      for (let i = scoredRecords.length - 1; i > 0; i--) {
        if (scoredRecords[i].totalScore > scoredRecords[i - 1].totalScore) {
          consecutiveImproving++;
        } else {
          break;
        }
      }
      
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        subDepartment: emp.subDepartment,
        level: emp.level,
        currentScore,
        avgScore,
        trend,
        consecutiveImproving,
        historyScores
      };
    }).filter(emp => emp.currentScore > 0);
  }, [realRecords, subordinates]);

  const keywordStats = useMemo(() => {
    const currentMonthScored = realRecords.filter(
      (record) =>
        record.month === currentMonth &&
        record.totalScore > 0 &&
        (record.status === 'completed' || record.status === 'scored')
    );
    const positiveMap = new Map<string, number>();
    const negativeMap = new Map<string, number>();

    currentMonthScored.forEach((record) => {
      (record.evaluationKeywords || []).forEach((keyword) => {
        const target = keyword.startsWith('n') ? negativeMap : positiveMap;
        target.set(keyword, (target.get(keyword) || 0) + 1);
      });
    });

    const toSortedArray = (map: Map<string, number>) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    return {
      currentMonthScoredCount: currentMonthScored.length,
      positive: toSortedArray(positiveMap),
      negative: toSortedArray(negativeMap),
    };
  }, [realRecords, currentMonth]);

  const structuredStats = useMemo(() => {
    const currentMonthScored = realRecords.filter(
      (record) =>
        record.month === currentMonth &&
        record.totalScore > 0 &&
        (record.status === 'completed' || record.status === 'scored')
    );

    return {
      issueTypes: topTagEntries(currentMonthScored, 'issueTypeTags'),
      highlights: topTagEntries(currentMonthScored, 'highlightTags'),
      employeeIssues: topTagEntries(currentMonthScored, 'employeeIssueTags'),
      resourceNeeds: topTagEntries(currentMonthScored, 'resourceNeedTags'),
      issueAttributions: topTagEntries(currentMonthScored, 'issueAttributionTags'),
      workloads: topTagEntries(currentMonthScored, 'workloadTags', 4),
      managerSuggestions: topTagEntries(currentMonthScored, 'managerSuggestionTags', 4),
      improvementActions: topTagEntries(currentMonthScored, 'improvementActionTags'),
      workTypes: topTagEntries(currentMonthScored, 'workTypeTags'),
      currentMonthScoredCount: currentMonthScored.length,
    };
  }, [realRecords, currentMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">绩效分析看板</h1>
          <p className="text-gray-500 mt-1">团队趋势 · 标签画像 · 多维分析</p>
        </div>
        <div className="flex items-center gap-3">
          {hasDemoData && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <AlertTriangle className="w-3 h-3 mr-1" />
              库里仍有示例数据，但本看板已忽略
            </Badge>
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 没有数据时的提示 */}
      {realRecords.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无真实绩效数据</h3>
            <p className="text-gray-500 mb-4">
              当前真实打分还不足以生成看板。等经理完成月度评分后，团队趋势、四维分析和标签画像都会自动出来。
            </p>
            <div className="text-sm text-gray-400">本页现在只统计真实评分数据，不再建议用示例数据看分析结果。</div>
          </CardContent>
        </Card>
      )}

      {realRecords.length > 0 && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">团队人数</p>
                    <p className="text-2xl font-bold mt-1">{stats.teamSize}</p>
                    <p className="text-xs text-gray-400 mt-1">名下员工</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">本月已评</p>
                    <p className="text-2xl font-bold mt-1">{stats.currentCompleted}/{stats.teamSize}</p>
                    <p className="text-xs text-gray-400 mt-1">{currentMonth}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">团队均分</p>
                    <p className="text-2xl font-bold mt-1">{stats.currentAvg.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">本月平均</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">环比变化</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-2xl font-bold ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(2)}
                      </p>
                      {stats.change >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">对比上月</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.change >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    {stats.change >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Keyword tag snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">本月高频正面标签</p>
                    <p className="text-xs text-gray-400 mt-1">来自经理真实评分时勾选的标签</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Tags className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                {keywordStats.positive.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keywordStats.positive.map(([keyword, count]) => (
                      <Badge key={keyword} className="bg-emerald-100 text-emerald-700">
                        {keywordLabelMap.get(keyword) || keyword} · {count}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">本月经理还没有勾选正面标签。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">本月高频待改进标签</p>
                    <p className="text-xs text-gray-400 mt-1">可用于看团队共性问题与辅导重点</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Tags className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                {keywordStats.negative.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keywordStats.negative.map(([keyword, count]) => (
                      <Badge key={keyword} className="bg-orange-100 text-orange-700">
                        {keywordLabelMap.get(keyword) || keyword} · {count}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    本月经理还没有勾选待改进标签。
                    {keywordStats.currentMonthScoredCount > 0 ? ' 后续一边评分一边勾选，这里就会自动形成团队问题画像。' : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">高频问题类型</p>
                    <p className="text-xs text-gray-400 mt-1">来自经理本月结构化勾选</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <Tags className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                {structuredStats.issueTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {structuredStats.issueTypes.map(([tag, count]) => (
                      <Badge key={tag} className="bg-red-100 text-red-700">{tag} · {count}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">本月还没有沉淀问题类型标签。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">高频亮点贡献</p>
                    <p className="text-xs text-gray-400 mt-1">后续可沉淀优秀案例</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Tags className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                {structuredStats.highlights.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {structuredStats.highlights.map(([tag, count]) => (
                      <Badge key={tag} className="bg-emerald-100 text-emerald-700">{tag} · {count}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">本月还没有亮点贡献标签。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">员工反馈问题</p>
                    <p className="text-xs text-gray-400 mt-1">来自员工工作总结页的直接反馈</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Tags className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                {structuredStats.employeeIssues.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {structuredStats.employeeIssues.map(([tag, count]) => (
                      <Badge key={tag} className="bg-orange-100 text-orange-700">{tag} · {count}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">员工本月还没有勾选反馈问题。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">员工资源诉求</p>
                    <p className="text-xs text-gray-400 mt-1">便于提前安排培训、协同和资源</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Tags className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                {structuredStats.resourceNeeds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {structuredStats.resourceNeeds.map(([tag, count]) => (
                      <Badge key={tag} className="bg-blue-100 text-blue-700">{tag} · {count}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">员工本月还没有填写资源诉求标签。</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 mb-4">问题归因分布</p>
                {structuredStats.issueAttributions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {structuredStats.issueAttributions.map(([tag, count]) => (
                      <Badge key={tag} variant="outline">{tag} · {count}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">暂未形成问题归因分布。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 mb-4">工作负荷判断</p>
                {structuredStats.workloads.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {structuredStats.workloads.map(([tag, count]) => (
                      <Badge key={tag} className="bg-slate-100 text-slate-700">{tag} · {count}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">本月还没有工作负荷标签。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 mb-4">经理建议分布</p>
                {structuredStats.managerSuggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {structuredStats.managerSuggestions.map(([tag, count]) => (
                      <Badge key={tag} className="bg-violet-100 text-violet-700">{tag} · {count}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">本月还没有经理建议等级。</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 趋势图 */}
            <TrendChart
              data={trendData}
              lines={[
                { key: 'teamAvg', name: '团队平均分', color: '#3b82f6' }
              ]}
              title="团队绩效趋势"
              subtitle="展示团队月度平均分变化"
              referenceLine={{ value: 1.0, label: '基准线' }}
            />
            
            {/* 雷达图 */}
            <RadarChart
              current={radarData.current}
              previous={radarData.previous}
              title="四维评分分析"
              showComparison={true}
            />
          </div>

          {/* 人才九宫格 */}
          <TalentGrid
            employees={talentGridData}
            title="团队人才九宫格"
            showDepartment={false}
          />
        </>
      )}
    </div>
  );
}
