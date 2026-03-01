import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { analyticsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export function EmployeeTrend() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [trend, setTrend] = useState<any[]>([]);

  useEffect(() => {
    if (employeeId) {
      analyticsApi.getPerformanceTrend(employeeId, 12).then(res => {
        if (res.success) setTrend(res.data);
      });
    }
  }, [employeeId]);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>12个月绩效趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="绩效分数" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">暂无趋势数据</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
