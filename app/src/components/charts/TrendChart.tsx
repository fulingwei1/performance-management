/**
 * 趋势折线图组件
 * 支持多条线对比，用于展示团队/部门/公司的绩效趋势
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface TrendDataPoint {
  month: string;
  [key: string]: number | string | null | undefined;
}

interface TrendLine {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
  strokeWidth?: number;
  strokeDasharray?: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  lines: TrendLine[];
  title?: string;
  subtitle?: string;
  referenceLine?: { value: number; label: string };
  height?: number;
}

// 颜色调色板
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function TrendChart({
  data,
  lines,
  title = '绩效趋势',
  subtitle,
  referenceLine,
  height = 300
}: TrendChartProps) {
  // 格式化月份显示，并去重
  const formattedData = useMemo(() => {
    // 使用 Map 去重，以 month 为 key
    const uniqueMap = new Map<string, any>();
    data.forEach(item => {
      if (!uniqueMap.has(item.month)) {
        uniqueMap.set(item.month, {
          ...item,
          displayMonth: item.month.replace(/^\d{4}-/, '').replace(/^0/, '') + '月'
        });
      }
    });
    return Array.from(uniqueMap.values());
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          {title}
        </CardTitle>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayMonth" 
              tick={{ fontSize: 12 }}
              stroke="#888"
            />
            <YAxis 
              domain={[0.5, 1.5]}
              tick={{ fontSize: 12 }}
              stroke="#888"
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}
              formatter={(value: number) => [value.toFixed(2), '']}
            />
            <Legend />
            {referenceLine && (
              <ReferenceLine 
                y={referenceLine.value} 
                stroke="#9ca3af" 
                strokeDasharray="5 5"
                label={{ value: referenceLine.label, fontSize: 11, fill: '#9ca3af' }}
              />
            )}
            {lines.map((line, index) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color || COLORS[index % COLORS.length]}
                strokeWidth={line.strokeWidth || 2}
                strokeDasharray={line.strokeDasharray || (line.dashed ? '5 5' : undefined)}
                dot={{ r: 4, fill: line.color || COLORS[index % COLORS.length] }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// 简化版：单线趋势图
interface SimpleTrendChartProps {
  data: { month: string; value: number }[];
  title?: string;
  color?: string;
  height?: number;
}

export function SimpleTrendChart({
  data,
  title = '趋势',
  color = '#3b82f6',
  height = 200
}: SimpleTrendChartProps) {
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      displayMonth: item.month.replace(/^\d{4}-/, '').replace(/^0/, '') + '月'
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={formattedData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis 
              dataKey="displayMonth" 
              tick={{ fontSize: 10 }}
              stroke="#888"
            />
            <YAxis 
              domain={[0.5, 1.5]}
              tick={{ fontSize: 10 }}
              stroke="#888"
            />
            <Tooltip formatter={(value: number) => value.toFixed(2)} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
