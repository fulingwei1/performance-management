import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardApi } from '../../api/dashboardApi';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, Users, Award } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const RISK_COLORS = {
  low: '#00C49F',
  medium: '#FFBB28',
  high: '#FF8042',
};

export default function ProgressDashboard() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  
  // 数据状态
  const [overview, setOverview] = useState<any>(null);
  const [myProgress, setMyProgress] = useState<any>(null);
  const [rankings, setRankings] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);

  const isManagerOrGM = user?.role === 'manager' || user?.role === 'gm' || user?.role === 'hr';

  // 加载数据
  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, myProgressRes, rankingsRes, trendsRes] = await Promise.all([
        isManagerOrGM ? dashboardApi.getOverview(year) : Promise.resolve(null),
        dashboardApi.getMyProgress(year),
        isManagerOrGM ? dashboardApi.getRankings(year, 10) : Promise.resolve(null),
        dashboardApi.getTrends(year),
      ]);

      setOverview(overviewRes?.data);
      setMyProgress(myProgressRes?.data);
      setRankings(rankingsRes?.data);
      setTrends(trendsRes?.data);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 总览卡片
  const OverviewCards = () => {
    if (!overview?.summary) return null;

    const { summary } = overview;
    const statusData = [
      { name: '已完成', value: summary.completedObjectives, color: COLORS[1] },
      { name: '进行中', value: summary.inProgressObjectives, color: COLORS[2] },
      { name: '未开始', value: summary.notStartedObjectives, color: COLORS[3] },
    ];

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总目标数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalObjectives}</div>
            <p className="text-xs text-muted-foreground">
              完成率 {summary.completionRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均进度</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgProgress.toFixed(1)}%</div>
            <Progress value={summary.avgProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.completedObjectives}
            </div>
            <p className="text-xs text-muted-foreground">
              占比 {summary.totalObjectives > 0
                ? ((summary.completedObjectives / summary.totalObjectives) * 100).toFixed(1)
                : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">目标状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={60}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={15}
                  outerRadius={25}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  // 部门进度表
  const DepartmentProgress = () => {
    if (!overview?.departmentStats) return null;

    const getRiskLevel = (progress: number) => {
      if (progress >= 70) return { level: 'low', text: '正常', color: 'bg-green-100 text-green-800' };
      if (progress >= 40) return { level: 'medium', text: '注意', color: 'bg-yellow-100 text-yellow-800' };
      return { level: 'high', text: '风险', color: 'bg-red-100 text-red-800' };
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>部门进度总览</CardTitle>
          <CardDescription>各部门目标完成情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overview.departmentStats.map((dept: any, index: number) => {
              const risk = getRiskLevel(dept.avgProgress);
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dept.department}</span>
                      <Badge variant="outline" className={risk.color}>
                        {risk.text}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {dept.completedCount}/{dept.totalObjectives} 完成
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={dept.avgProgress} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {dept.avgProgress.toFixed(1)}%
                    </span>
                  </div>
                  {dept.riskCount > 0 && (
                    <p className="text-xs text-red-600">
                      ⚠️ {dept.riskCount} 个目标进度滞后（&lt;50%）
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 排行榜
  const RankingsTable = () => {
    if (!rankings) return null;

    const RankingList = ({ title, data, isTop }: any) => (
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          {isTop ? (
            <>
              <Award className="h-4 w-4 text-yellow-500" />
              {title}
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 text-red-500" />
              {title}
            </>
          )}
        </h4>
        <div className="space-y-2">
          {data.map((emp: any, index: number) => (
            <div
              key={emp.employeeId}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold w-6 ${
                  isTop && index < 3 ? 'text-yellow-600' : 'text-muted-foreground'
                }`}>
                  #{index + 1}
                </span>
                <div>
                  <div className="font-medium">{emp.employeeName}</div>
                  <div className="text-xs text-muted-foreground">{emp.department}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{emp.avgProgress.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  {emp.completedCount}/{emp.objectivesCount} 完成
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle>目标完成度排行</CardTitle>
          <CardDescription>员工目标完成情况排名</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="top" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="top">Top 10</TabsTrigger>
              <TabsTrigger value="bottom">待提升</TabsTrigger>
            </TabsList>
            <TabsContent value="top" className="mt-4">
              <RankingList
                title="表现优秀"
                data={rankings.topPerformers}
                isTop={true}
              />
            </TabsContent>
            <TabsContent value="bottom" className="mt-4">
              <RankingList
                title="需要关注"
                data={rankings.bottomPerformers}
                isTop={false}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  // 趋势图
  const TrendsChart = () => {
    if (!trends?.trends) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>季度进度趋势</CardTitle>
          <CardDescription>{year}年目标完成度变化</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgProgress"
                stroke="#8884d8"
                strokeWidth={2}
                name="平均进度 (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // 我的进度（员工视角）
  const MyProgressView = () => {
    if (!myProgress) return null;

    const { summary, quarterlyProgress, comparison, objectives } = myProgress;

    return (
      <div className="space-y-6">
        {/* 个人总览 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>我的目标</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.totalObjectives}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {summary.completed} 已完成 · {summary.inProgress} 进行中
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>平均进度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.avgProgress.toFixed(1)}%</div>
              <Progress value={summary.avgProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>部门对比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {comparison.difference >= 0 ? '+' : ''}
                  {comparison.difference.toFixed(1)}%
                </span>
                {comparison.difference >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                部门平均: {comparison.departmentAvg.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 季度进度 */}
        <Card>
          <CardHeader>
            <CardTitle>季度进度</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={quarterlyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgProgress" fill="#8884d8" name="平均进度 (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 目标列表 */}
        <Card>
          <CardHeader>
            <CardTitle>我的目标列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {objectives.map((obj: any) => (
                <div key={obj.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{obj.title}</h4>
                      {obj.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {obj.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={obj.progress >= 100 ? 'default' : 'outline'}>
                      {obj.status === 'completed' ? '已完成' : obj.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={obj.progress} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {obj.progress.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题和筛选 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">进度仪表板</h1>
          <p className="text-muted-foreground mt-1">
            {isManagerOrGM ? '团队目标完成情况总览' : '我的目标进度追踪'}
          </p>
        </div>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 管理层视图 */}
      {isManagerOrGM && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="my">我的进度</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewCards />
            <div className="grid gap-6 md:grid-cols-2">
              <DepartmentProgress />
              <RankingsTable />
            </div>
            <TrendsChart />
          </TabsContent>

          <TabsContent value="my">
            <MyProgressView />
          </TabsContent>
        </Tabs>
      )}

      {/* 员工视图 */}
      {!isManagerOrGM && <MyProgressView />}
    </div>
  );
}
