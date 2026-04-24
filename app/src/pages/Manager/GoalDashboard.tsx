import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { AlertCircle } from 'lucide-react';
import { goalDashboardApi } from '@/services/api';

const COLORS = {
  onTrack: '#10b981',
  atRisk: '#f59e0b',
  critical: '#ef4444'
};

export default function GoalDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [progressRes, trendRes] = await Promise.all([
        goalDashboardApi.getTeamProgress(),
        goalDashboardApi.getProgressTrend()
      ]);
      if (progressRes.success) setData(progressRes.data);
      if (trendRes.success) setTrend(trendRes.data);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">加载中...</div>;
  }

  const { stats, objectives, byEmployee } = data || {};

  const pieData = [
    { name: '进度正常', value: stats?.onTrack || 0 },
    { name: '需要关注', value: stats?.atRisk || 0 },
    { name: '严重滞后', value: stats?.critical || 0 }
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">团队目标进度仪表板</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">总目标数</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalObjectives || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardHeader><CardTitle className="text-sm text-green-700">进度正常</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{stats?.onTrack || 0}</div>
            <p className="text-xs text-gray-500">≥50% 进度</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardHeader><CardTitle className="text-sm text-yellow-700">需要关注</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700">{stats?.atRisk || 0}</div>
            <p className="text-xs text-gray-500">25-50% 进度</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardHeader><CardTitle className="text-sm text-red-700">严重滞后</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{stats?.critical || 0}</div>
            <p className="text-xs text-gray-500">&lt;25% 进度</p>
          </CardContent>
        </Card>
      </div>

      {/* 进度分布饼图 */}
      <Card>
        <CardHeader><CardTitle>目标进度分布</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                dataKey="value"
              >
                <Cell fill={COLORS.onTrack} />
                <Cell fill={COLORS.atRisk} />
                <Cell fill={COLORS.critical} />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 员工进度对比柱状图 */}
      <Card>
        <CardHeader><CardTitle>各员工目标完成进度</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={byEmployee || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="employeeName" />
              <YAxis label={{ value: '平均进度 (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="avgProgress" fill="#3b82f6">
                {(byEmployee || []).map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.avgProgress >= 50 ? COLORS.onTrack :
                          entry.avgProgress >= 25 ? COLORS.atRisk : COLORS.critical}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 趋势折线图 */}
      <Card>
        <CardHeader><CardTitle>最近3个月进度趋势</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: '平均进度 (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgProgress" stroke="#3b82f6" strokeWidth={2} name="平均进度" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 风险预警列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            需要关注的目标
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(objectives || []).filter((o: any) => o.progress < 50).length === 0 && (
              <p className="text-gray-500 text-sm">暂无需要关注的目标 🎉</p>
            )}
            {(objectives || []).filter((o: any) => o.progress < 50).map((obj: any) => (
              <div key={obj.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{obj.title}</p>
                  <p className="text-sm text-gray-500">负责人: {obj.ownerName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      obj.progress < 25 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {obj.progress}%
                    </div>
                    <p className="text-xs text-gray-500">完成进度</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/manager/team-objectives')}>
                    查看详情
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
