/**
 * 部门经理绩效看板
 * 展示团队绩效趋势、个人成长、四维分析等
 */

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { performanceApi, employeeApi } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/charts/TrendChart';
import { RadarChart } from '@/components/charts/RadarChart';
import { GrowthTable } from '@/components/stats/GrowthTable';
import { TalentGrid } from '@/components/stats/TalentGrid';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2, 
  BarChart3,
  Calendar,
  AlertTriangle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
  const [generatingDemo, setGeneratingDemo] = useState(false);

  const currentMonth = format(new Date(), 'yyyy-MM');

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

  // 生成模拟数据
  const handleGenerateDemo = async () => {
    setGeneratingDemo(true);
    try {
      const res = await performanceApi.generateDemoData();
      if (res.success) {
        toast.success(res.message);
        setHasDemoData(true);
        // 重新获取数据
        const recordsRes = await performanceApi.getTeamRecords(undefined, parseInt(timeRange));
        if (recordsRes.success) setRecords(recordsRes.data);
      }
    } catch (error: any) {
      toast.error(error.message || '生成失败');
    } finally {
      setGeneratingDemo(false);
    }
  };

  // 清除模拟数据
  const handleClearDemo = async () => {
    try {
      const res = await performanceApi.clearDemoData();
      if (res.success) {
        toast.success(res.message);
        setHasDemoData(false);
        // 重新获取数据
        const recordsRes = await performanceApi.getTeamRecords(undefined, parseInt(timeRange));
        if (recordsRes.success) setRecords(recordsRes.data);
      }
    } catch (error: any) {
      toast.error(error.message || '清除失败');
    }
  };

  // 计算统计数据
  const stats = useMemo(() => {
    // 只获取有评分的记录（解决月初未评分问题）
    const currentMonthRecords = records.filter(r => r.month === currentMonth && r.totalScore > 0);
    const previousMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM');
    const previousMonthRecords = records.filter(r => r.month === previousMonth && r.totalScore > 0);
    
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
  }, [records, subordinates, currentMonth]);

  // 生成趋势图数据
  const trendData = useMemo(() => {
    const monthsSet = new Set(records.map(r => r.month));
    const months = Array.from(monthsSet).sort();
    
    return months.map(month => {
      // 只获取有评分的记录（解决月初未评分问题）
      const monthRecords = records.filter(r => r.month === month && r.totalScore > 0);
      const avgScore = monthRecords.length > 0
        ? monthRecords.reduce((sum, r) => sum + r.totalScore, 0) / monthRecords.length
        : null; // 没有评分数据时返回null，图表会断开
      return {
        month,
        teamAvg: avgScore !== null ? Math.round(avgScore * 100) / 100 : null
      };
    });
  }, [records]);

  // 四维分析数据
  const radarData = useMemo(() => {
    // 只获取有评分的记录（解决月初未评分问题）
    const currentMonthRecords = records.filter(r => r.month === currentMonth && r.totalScore > 0);
    const previousMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM');
    const previousMonthRecords = records.filter(r => r.month === previousMonth && r.totalScore > 0);
    
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
  }, [records, currentMonth]);

  // 员工成长数据
  const growthData = useMemo(() => {
    const monthsSet = new Set(records.map(r => r.month));
    const months = Array.from(monthsSet).sort();
    
    // 找到最近有评分的月份（解决月初未评分问题）
    let currentMonth = months[months.length - 1];
    
    // 检查最新月份是否有评分数据
    const latestMonthRecords = records.filter(r => r.month === currentMonth && r.totalScore > 0);
    if (latestMonthRecords.length === 0 && months.length >= 2) {
      // 如果最新月份没有评分，使用上一个有评分的月份
      for (let i = months.length - 1; i >= 0; i--) {
        const monthRecords = records.filter(r => r.month === months[i] && r.totalScore > 0);
        if (monthRecords.length > 0) {
          currentMonth = months[i];
          break;
        }
      }
    }
    
    // 按员工分组
    const employeeRecords = new Map<string, any[]>();
    records.forEach(r => {
      if (!employeeRecords.has(r.employeeId)) {
        employeeRecords.set(r.employeeId, []);
      }
      employeeRecords.get(r.employeeId)!.push(r);
    });
    
    return subordinates.map(emp => {
      const empRecords = employeeRecords.get(emp.id) || [];
      // 只获取有评分的历史记录
      const sortedRecords = empRecords.filter(r => r.totalScore > 0).sort((a, b) => a.month.localeCompare(b.month));
      
      const currentRecord = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1] : null;
      const previousRecord = sortedRecords.length > 1 ? sortedRecords[sortedRecords.length - 2] : null;
      
      const currentScore = currentRecord?.totalScore || 0;
      const previousScore = previousRecord?.totalScore || 0;
      const change = currentScore - previousScore;
      
      // 判断趋势
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (change > 0.05) trend = 'up';
      else if (change < -0.05) trend = 'down';
      
      // 判断状态
      let status: 'excellent' | 'improving' | 'stable' | 'attention' | 'warning' = 'stable';
      if (currentScore >= 1.3) status = 'excellent';
      else if (trend === 'up' && sortedRecords.length >= 2) status = 'improving';
      else if (currentScore < 0.8 || (trend === 'down' && sortedRecords.length >= 2)) status = 'warning';
      else if (change < -0.1) status = 'attention';
      
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        level: emp.level,
        currentScore,
        previousScore,
        change,
        trend,
        status,
        history: sortedRecords.slice(-6).map(r => r.totalScore)
      };
    }).filter(emp => emp.currentScore > 0 || emp.history.length > 0);
  }, [records, subordinates]);

  // 九宫格数据
  const talentGridData = useMemo(() => {
    // 按员工分组
    const employeeRecords = new Map<string, any[]>();
    records.forEach(r => {
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
  }, [records, subordinates]);

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
          <p className="text-gray-500 mt-1">团队趋势 · 个人成长 · 多维分析</p>
        </div>
        <div className="flex items-center gap-3">
          {hasDemoData && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <Sparkles className="w-3 h-3 mr-1" />
              含示例数据
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
      {records.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无绩效数据</h3>
            <p className="text-gray-500 mb-4">
              可以生成示例数据来预览看板效果
            </p>
            <Button onClick={handleGenerateDemo} disabled={generatingDemo}>
              {generatingDemo ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成示例数据
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {records.length > 0 && (
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

          {/* 员工成长表格 */}
          <GrowthTable
            data={growthData}
            title="员工成长追踪"
          />

          {/* 模拟数据管理 */}
          {hasDemoData && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-orange-700">
                      当前数据包含示例数据，仅供演示使用
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearDemo}>
                    清除示例数据
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
