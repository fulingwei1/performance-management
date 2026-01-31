/**
 * 四维雷达图组件
 * 展示绩效四个维度的对比
 */

import { useMemo } from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

interface DimensionData {
  taskCompletion: number;
  initiative: number;
  projectFeedback: number;
  qualityImprovement: number;
}

interface RadarChartProps {
  current: DimensionData;
  previous?: DimensionData;
  title?: string;
  showComparison?: boolean;
}

const DIMENSION_LABELS: Record<string, string> = {
  taskCompletion: '任务完成',
  initiative: '主动性',
  projectFeedback: '项目反馈',
  qualityImprovement: '质量改进'
};

export function RadarChart({
  current,
  previous,
  title = '四维评分分析',
  showComparison = true
}: RadarChartProps) {
  const data = useMemo(() => {
    const dimensions = ['taskCompletion', 'initiative', 'projectFeedback', 'qualityImprovement'];
    
    return dimensions.map(dim => ({
      dimension: DIMENSION_LABELS[dim],
      current: current[dim as keyof DimensionData] || 0,
      previous: previous?.[dim as keyof DimensionData] || 0
    }));
  }, [current, previous]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <RechartsRadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis 
              dataKey="dimension" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 1.5]} 
              tick={{ fontSize: 10 }}
              tickCount={4}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value: number) => value.toFixed(2)}
            />
            {showComparison && previous && (
              <Radar
                name="上月"
                dataKey="previous"
                stroke="#9ca3af"
                fill="#9ca3af"
                fillOpacity={0.2}
                strokeDasharray="5 5"
              />
            )}
            <Radar
              name="本月"
              dataKey="current"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.4}
            />
            <Legend />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
