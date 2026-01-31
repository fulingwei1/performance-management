import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import type { PerformanceRecord } from '@/types';
import { scoreToLevel, getLevelLabel, getLevelColor } from '@/lib/calculateScore';

interface DistributionChartProps {
  records: PerformanceRecord[];
  title?: string;
}

export function DistributionChart({ records, title }: DistributionChartProps) {
  const data = useMemo(() => {
    const distribution = {
      L5: 0,
      L4: 0,
      L3: 0,
      L2: 0,
      L1: 0
    };
    
    records.forEach(record => {
      const level = scoreToLevel(record.totalScore);
      distribution[level]++;
    });
    
    return Object.entries(distribution)
      .filter(([, count]) => count > 0)
      .map(([level, count]) => ({
        name: getLevelLabel(level as any),
        value: count,
        level,
        color: getLevelColor(level as any)
      }));
  }, [records]);
  
  const total = useMemo(() => 
    data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );
  
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string) => {
                const percentage = ((value / total) * 100).toFixed(1);
                return [`${value}人 (${percentage}%)`, name];
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value: string, entry: any) => (
                <span style={{ color: entry.color }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* 统计摘要 */}
      <div className="grid grid-cols-5 gap-2 mt-4">
        {data.map((item) => (
          <div key={item.level} className="text-center">
            <div 
              className="text-lg font-bold"
              style={{ color: item.color }}
            >
              {item.value}
            </div>
            <div className="text-xs text-gray-500">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
