/**
 * 总经理绩效看板
 * 展示全公司绩效概览、部门横向对比、人才梯队、趋势预警
 */

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { performanceApi, employeeApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/charts/TrendChart';
import { DepartmentCompareChart } from '@/components/charts/DepartmentCompareChart';
import { TalentTable } from '@/components/stats/TalentTable';
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
  RefreshCw,
  Award,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// 时间范围选项
const TIME_RANGE_OPTIONS = [
  { value: '3', label: '最近3个月' },
  { value: '6', label: '最近6个月' },
  { value: '12', label: '最近12个月' },
];

export function GMAnalytics() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
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
        const [recordsRes, employeesRes, demoStatusRes] = await Promise.all([
          performanceApi.getAllRecords(parseInt(timeRange)),
          employeeApi.getAll(),
          performanceApi.getDemoDataStatus()
        ]);
        
        if (recordsRes.success) setRecords(recordsRes.data);
        if (employeesRes.success) setEmployees(employeesRes.data);
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
        const recordsRes = await performanceApi.getAllRecords(parseInt(timeRange));
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
        const recordsRes = await performanceApi.getAllRecords(parseInt(timeRange));
        if (recordsRes.success) setRecords(recordsRes.data);
      }
    } catch (error: any) {
      toast.error(error.message || '清除失败');
    }
  };

  // 员工映射
  const employeeMap = useMemo(() => {
    const map = new Map<string, any>();
    employees.forEach(emp => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // 计算全公司统计数据
  const stats = useMemo(() => {
    // 找到最近有评分的月份（解决月初未评分问题）
    const monthsSet = new Set(records.map(r => r.month));
    const months = Array.from(monthsSet).sort();
    
    let currentMonthWithScore = currentMonth;
    let previousMonthWithScore = '';
    
    // 找最近有评分的月份
    for (let i = months.length - 1; i >= 0; i--) {
      const monthRecords = records.filter(r => r.month === months[i] && r.totalScore > 0);
      if (monthRecords.length > 0) {
        if (!currentMonthWithScore || currentMonthWithScore === currentMonth) {
          currentMonthWithScore = months[i];
        } else if (!previousMonthWithScore && months[i] < currentMonthWithScore) {
          previousMonthWithScore = months[i];
          break;
        }
      }
    }
    
    // 只获取有评分的记录
    const currentMonthRecords = records.filter(r => r.month === currentMonthWithScore && r.totalScore > 0);
    const previousMonthRecords = previousMonthWithScore 
      ? records.filter(r => r.month === previousMonthWithScore && r.totalScore > 0)
      : [];
    
    const currentAvg = currentMonthRecords.length > 0
      ? currentMonthRecords.reduce((sum, r) => sum + r.totalScore, 0) / currentMonthRecords.length
      : 0;
    const previousAvg = previousMonthRecords.length > 0
      ? previousMonthRecords.reduce((sum, r) => sum + r.totalScore, 0) / previousMonthRecords.length
      : currentAvg;
    
    // 优秀率（得分>=1.2）
    const excellentCount = currentMonthRecords.filter(r => r.totalScore >= 1.2).length;
    const excellentRate = currentMonthRecords.length > 0 
      ? (excellentCount / currentMonthRecords.length * 100)
      : 0;
    
    // 需要被考评的人员：员工 + 部门经理（排除总经理和HR）
    const assessableEmployees = employees.filter(e => e.role === 'employee' || e.role === 'manager');
    
    return {
      totalEmployees: assessableEmployees.length,
      currentCompleted: currentMonthRecords.filter(r => r.status === 'completed' || r.status === 'scored').length,
      currentAvg,
      previousAvg,
      change: currentAvg - previousAvg,
      excellentRate
    };
  }, [records, employees, currentMonth]);

  // 部门对比数据
  const departmentData = useMemo(() => {
    // 找到最近有评分的月份（解决月初未评分问题）
    const monthsSet = new Set(records.map(r => r.month));
    const months = Array.from(monthsSet).sort();
    let targetMonth = currentMonth;
    
    // 检查当前月份是否有评分数据
    const currentMonthScored = records.filter(r => r.month === currentMonth && r.totalScore > 0);
    if (currentMonthScored.length === 0) {
      // 如果当前月份没有评分，找最近有评分的月份
      for (let i = months.length - 1; i >= 0; i--) {
        const monthRecords = records.filter(r => r.month === months[i] && r.totalScore > 0);
        if (monthRecords.length > 0) {
          targetMonth = months[i];
          break;
        }
      }
    }
    
    const targetMonthRecords = records.filter(r => r.month === targetMonth && r.totalScore > 0);
    const deptMap = new Map<string, { scores: number[]; count: number }>();
    
    targetMonthRecords.forEach(r => {
      const emp = employeeMap.get(r.employeeId);
      const dept = emp?.department || '未知部门';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { scores: [], count: 0 });
      }
      const deptData = deptMap.get(dept)!;
      deptData.scores.push(r.totalScore);
      deptData.count++;
    });
    
    return Array.from(deptMap.entries()).map(([department, data]) => ({
      department,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      count: data.count
    }));
  }, [records, employeeMap, currentMonth]);

  // 部门趋势数据（多线折线图）
  const departmentTrendData = useMemo(() => {
    const monthsSet = new Set(records.map(r => r.month));
    const months = Array.from(monthsSet).sort();
    const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
    
    return months.map(month => {
      // 只获取有评分的记录（解决月初未评分问题）
      const monthRecords = records.filter(r => r.month === month && r.totalScore > 0);
      const result: any = { month };
      
      departments.forEach(dept => {
        const deptRecords = monthRecords.filter(r => {
          const emp = employeeMap.get(r.employeeId);
          return emp?.department === dept;
        });
        result[dept] = deptRecords.length > 0
          ? Math.round(deptRecords.reduce((sum, r) => sum + r.totalScore, 0) / deptRecords.length * 100) / 100
          : null;
      });
      
      // 公司平均
      result['公司平均'] = monthRecords.length > 0
        ? Math.round(monthRecords.reduce((sum, r) => sum + r.totalScore, 0) / monthRecords.length * 100) / 100
        : null;
      
      return result;
    });
  }, [records, employees, employeeMap]);

  // 部门趋势线配置
  const trendLines = useMemo(() => {
    const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    return [
      { key: '公司平均', name: '公司平均', color: '#1f2937', strokeWidth: 2, strokeDasharray: '5 5' },
      ...departments.map((dept, i) => ({
        key: dept,
        name: dept,
        color: colors[i % colors.length]
      }))
    ];
  }, [employees]);

  // 人才梯队数据
  const talentData = useMemo(() => {
    const monthsSet = new Set(records.map(r => r.month));
    const months = Array.from(monthsSet).sort();
    
    // 按员工分组
    const employeeRecords = new Map<string, any[]>();
    records.forEach(r => {
      if (!employeeRecords.has(r.employeeId)) {
        employeeRecords.set(r.employeeId, []);
      }
      employeeRecords.get(r.employeeId)!.push(r);
    });
    
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
    
    // 包含员工和经理（排除总经理和HR）
    const allEmployeeData = employees
      .filter(emp => emp.role === 'employee' || emp.role === 'manager')
      .map(emp => {
        const empRecords = employeeRecords.get(emp.id) || [];
        const sortedRecords = empRecords.sort((a, b) => a.month.localeCompare(b.month));
        
        // 获取最近有评分的记录
        const scoredRecords = sortedRecords.filter(r => r.totalScore > 0);
        const currentRecord = scoredRecords.length > 0 
          ? scoredRecords[scoredRecords.length - 1]  // 最近有评分的记录
          : null;
        const previousRecord = scoredRecords.length > 1 
          ? scoredRecords[scoredRecords.length - 2]  // 上一条有评分的记录
          : null;
        
        const currentScore = currentRecord?.totalScore || 0;
        const previousScore = previousRecord?.totalScore || 0;
        
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
          previousScore,
          trend: currentScore > previousScore ? 'up' as const : currentScore < previousScore ? 'down' as const : 'stable' as const,
          consecutiveImproving
        };
      })
      .filter(emp => emp.currentScore > 0);
    
    // Top 10
    const topPerformers = [...allEmployeeData]
      .sort((a, b) => b.currentScore - a.currentScore)
      .slice(0, 10);
    
    // 连续进步（至少2个月）
    const improvingTalents = allEmployeeData
      .filter(emp => emp.consecutiveImproving >= 2)
      .sort((a, b) => b.consecutiveImproving - a.consecutiveImproving);
    
    // 需关注（下滑或低分）
    const attentionNeeded = allEmployeeData
      .filter(emp => emp.currentScore < 0.9 || (emp.trend === 'down' && emp.previousScore - emp.currentScore > 0.1))
      .sort((a, b) => a.currentScore - b.currentScore);
    
    // 潜力股（初级但高分）
    const potentialStars = allEmployeeData
      .filter(emp => (emp.level === 'junior' || emp.level === 'assistant') && emp.currentScore >= 1.1)
      .sort((a, b) => b.currentScore - a.currentScore);
    
    return {
      topPerformers,
      improvingTalents,
      attentionNeeded,
      potentialStars,
      allEmployeeData // 用于九宫格
    };
  }, [records, employees]);

  // 九宫格数据（从talentData转换）
  const talentGridData = useMemo(() => {
    return talentData.allEmployeeData?.map(emp => {
      // 按员工分组获取历史记录
      const empRecords = records.filter(r => r.employeeId === emp.employeeId);
      const sortedRecords = empRecords.sort((a, b) => a.month.localeCompare(b.month));
      const historyScores = sortedRecords.map(r => r.totalScore);
      const avgScore = historyScores.length > 0 
        ? historyScores.reduce((a, b) => a + b, 0) / historyScores.length 
        : emp.currentScore;
      
      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        department: emp.department,
        subDepartment: emp.subDepartment,
        level: emp.level,
        currentScore: emp.currentScore,
        avgScore,
        trend: emp.trend,
        consecutiveImproving: emp.consecutiveImproving,
        historyScores
      };
    }) || [];
  }, [talentData, records]);

  // 异常检测
  const anomalies = useMemo(() => {
    // 只获取有评分的记录（解决月初未评分问题）
    const currentMonthRecords = records.filter(r => r.month === currentMonth && r.totalScore > 0);
    const result: { type: string; message: string; severity: 'warning' | 'error' }[] = [];
    
    // 部门差异过大
    if (departmentData.length >= 2) {
      const scores = departmentData.map(d => d.avgScore);
      const maxDiff = Math.max(...scores) - Math.min(...scores);
      if (maxDiff > 0.3) {
        const maxDept = departmentData.find(d => d.avgScore === Math.max(...scores))?.department;
        const minDept = departmentData.find(d => d.avgScore === Math.min(...scores))?.department;
        result.push({
          type: 'department_gap',
          message: `部门差异较大：${maxDept}(${Math.max(...scores).toFixed(2)}) vs ${minDept}(${Math.min(...scores).toFixed(2)})`,
          severity: 'warning'
        });
      }
    }
    
    // 优秀率过低
    if (stats.excellentRate < 10 && currentMonthRecords.length >= 5) {
      result.push({
        type: 'low_excellence',
        message: `本月优秀率仅 ${stats.excellentRate.toFixed(1)}%，建议关注团队激励`,
        severity: 'warning'
      });
    }
    
    // 环比下降
    if (stats.change < -0.1) {
      result.push({
        type: 'declining',
        message: `本月均分环比下降 ${Math.abs(stats.change).toFixed(2)}，建议排查原因`,
        severity: 'error'
      });
    }
    
    return result;
  }, [records, departmentData, stats, currentMonth]);

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
          <h1 className="text-2xl font-bold text-gray-900">公司绩效看板</h1>
          <p className="text-gray-500 mt-1">全局视角 · 部门对比 · 人才洞察</p>
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
          {/* Stats Cards - 5 columns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">考评人数</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalEmployees}</p>
                    <p className="text-xs text-gray-400 mt-1">不含总经理/HR</p>
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
                    <p className="text-2xl font-bold mt-1">{stats.currentCompleted}</p>
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
                    <p className="text-sm text-gray-500">公司均分</p>
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
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">优秀率</p>
                    <p className="text-2xl font-bold mt-1">{stats.excellentRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-400 mt-1">得分≥1.2</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 异常检测卡片 */}
          {anomalies.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  异常检测
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {anomalies.map((anomaly, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-2 text-sm p-2 rounded ${
                        anomaly.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      <Target className="w-4 h-4 flex-shrink-0" />
                      {anomaly.message}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 部门对比柱状图 */}
            <DepartmentCompareChart
              data={departmentData}
              title="部门绩效横向对比"
              companyAvg={stats.currentAvg}
            />
            
            {/* 部门趋势折线图 */}
            <TrendChart
              data={departmentTrendData}
              lines={trendLines}
              title="部门趋势对比"
              subtitle="各部门月度均分变化"
              referenceLine={{ value: 1.0, label: '基准线' }}
            />
          </div>

          {/* 人才九宫格 */}
          <TalentGrid
            employees={talentGridData}
            title="公司人才九宫格"
            showDepartment={true}
          />

          {/* 人才梯队 */}
          <TalentTable
            topPerformers={talentData.topPerformers}
            improvingTalents={talentData.improvingTalents}
            attentionNeeded={talentData.attentionNeeded}
            potentialStars={talentData.potentialStars}
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
