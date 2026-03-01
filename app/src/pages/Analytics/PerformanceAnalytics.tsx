import { useState, useEffect } from 'react';
import { analyticsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { AlertCircle, Download } from 'lucide-react';

export function PerformanceAnalytics() {
  const [distribution, setDistribution] = useState<any>(null);
  const [comparison, setComparison] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    month: new Date().toISOString().slice(0, 7),
    startMonth: '',
    endMonth: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [distRes, compRes, anomRes] = await Promise.all([
        analyticsApi.getPerformanceDistribution(filters.month),
        analyticsApi.getDepartmentComparison(filters.startMonth || undefined, filters.endMonth || undefined),
        analyticsApi.detectAnomalies(filters.month)
      ]);

      if (distRes.success) setDistribution(distRes.data);
      if (compRes.success) setComparison(compRes.data);
      if (anomRes.success) setAnomalies(anomRes.data);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      await analyticsApi.exportReport(filters.month);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">绩效分析报表</h1>

      {/* 筛选器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>分析月份</Label>
              <Input
                type="month"
                value={filters.month}
                onChange={(e) => setFilters({...filters, month: e.target.value})}
              />
            </div>
            <div>
              <Label>对比开始月份</Label>
              <Input
                type="month"
                value={filters.startMonth}
                onChange={(e) => setFilters({...filters, startMonth: e.target.value})}
              />
            </div>
            <div>
              <Label>对比结束月份</Label>
              <Input
                type="month"
                value={filters.endMonth}
                onChange={(e) => setFilters({...filters, endMonth: e.target.value})}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadData} disabled={loading}>
                {loading ? '加载中...' : '查询'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 绩效分布 */}
      <Card>
        <CardHeader>
          <CardTitle>绩效分布</CardTitle>
        </CardHeader>
        <CardContent>
          {distribution ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distribution.ranges}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="人数" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">总人数</p>
                  <p className="text-2xl font-bold">{distribution.total}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">平均分</p>
                  <p className="text-2xl font-bold">{distribution.avgScore?.toFixed(2)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">暂无数据</p>
          )}
        </CardContent>
      </Card>

      {/* 部门对比 */}
      <Card>
        <CardHeader>
          <CardTitle>部门对比</CardTitle>
        </CardHeader>
        <CardContent>
          {comparison.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgScore" fill="#3b82f6" name="平均分" />
                  <Bar dataKey="excellentRate" fill="#10b981" name="优秀率(%)" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">部门</th>
                      <th className="text-left p-2">平均分</th>
                      <th className="text-left p-2">优秀率</th>
                      <th className="text-left p-2">不合格率</th>
                      <th className="text-left p-2">人数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((dept, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{dept.department}</td>
                        <td className="p-2">{dept.avgScore}</td>
                        <td className="p-2">{dept.excellentRate}%</td>
                        <td className="p-2">{dept.poorRate}%</td>
                        <td className="p-2">{dept.totalCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">暂无数据</p>
          )}
        </CardContent>
      </Card>

      {/* 异常检测 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            绩效异常预警
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <p className="text-gray-500">未检测到异常</p>
          ) : (
            <div className="space-y-2">
              {anomalies.map((anomaly, i) => (
                <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-md text-sm">
                  <strong>{anomaly.employeeName}</strong> ({anomaly.department})
                  {' '}绩效大幅下降：{anomaly.previousScore} → {anomaly.currentScore}
                  （下降 {anomaly.drop} 分）
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 导出按钮 */}
      <div>
        <Button onClick={handleExportReport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          导出分析报告
        </Button>
      </div>
    </div>
  );
}
