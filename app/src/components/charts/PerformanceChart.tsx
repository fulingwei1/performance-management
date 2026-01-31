import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { PerformanceRecord } from '@/types';
import { formatScore } from '@/lib/calculateScore';

interface PerformanceChartProps {
  records: PerformanceRecord[];
  title?: string;
}

export function PerformanceChart({ records, title }: PerformanceChartProps) {
  const data = useMemo(() => {
    // 按月份分组计算平均分
    const monthMap = new Map<string, { total: number; count: number }>();
    
    records.forEach(record => {
      const existing = monthMap.get(record.month);
      if (existing) {
        existing.total += record.totalScore;
        existing.count += 1;
      } else {
        monthMap.set(record.month, { total: record.totalScore, count: 1 });
      }
    });
    
    // 转换为数组并排序
    const sortedMonths = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, { total, count }]) => ({
        month: month.slice(5), // 只显示月份部分
        average: parseFloat((total / count).toFixed(2)),
        count
      }));
    
    return sortedMonths;
  }, [records]);
  
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="month" 
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 1.6]}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [formatScore(value), '平均分']}
              labelFormatter={(label) => `${label}月`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="average"
              name="平均绩效得分"
              stroke="#2563EB"
              strokeWidth={3}
              dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
