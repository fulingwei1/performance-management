/**
 * 部门对比柱状图组件
 * 展示各部门绩效对比
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

interface DepartmentData {
  department: string;
  avgScore: number;
  count: number;
}

interface DepartmentCompareChartProps {
  data: DepartmentData[];
  title?: string;
  companyAvg?: number;
  height?: number;
  onDepartmentClick?: (department: string) => void;
}

// 根据分数获取颜色
function getBarColor(score: number, companyAvg: number): string {
  if (score >= companyAvg + 0.1) return '#10b981'; // green
  if (score >= companyAvg - 0.1) return '#3b82f6'; // blue
  if (score >= companyAvg - 0.2) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

export function DepartmentCompareChart({
  data,
  title = '部门绩效对比',
  companyAvg = 1.0,
  height = 300,
  onDepartmentClick
}: DepartmentCompareChartProps) {
  // 按分数排序
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.avgScore - a.avgScore);
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={sortedData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              domain={[0.5, 1.5]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <YAxis 
              type="category" 
              dataKey="department" 
              tick={{ fontSize: 12 }}
              width={75}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value: number, _name: string) => [value.toFixed(2), '平均分']}
              labelFormatter={(label) => `${label}`}
            />
            <ReferenceLine 
              x={companyAvg} 
              stroke="#9ca3af" 
              strokeDasharray="5 5"
              label={{ value: '公司均值', fontSize: 10, fill: '#9ca3af', position: 'top' }}
            />
            <Bar 
              dataKey="avgScore" 
              radius={[0, 4, 4, 0]}
              onClick={(data) => onDepartmentClick?.(data.department)}
              cursor="pointer"
            >
              {sortedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.avgScore, companyAvg)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
