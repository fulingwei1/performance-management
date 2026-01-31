/**
 * 员工成长表格组件
 * 展示员工的绩效变化趋势
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeeGrowth {
  employeeId: string;
  employeeName: string;
  level: string;
  currentScore: number;
  previousScore: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'improving' | 'stable' | 'attention' | 'warning';
  history: number[]; // 最近几个月的分数
}

interface GrowthTableProps {
  data: EmployeeGrowth[];
  title?: string;
  onEmployeeClick?: (employeeId: string) => void;
}

// 状态配置
const STATUS_CONFIG = {
  excellent: { label: '优秀', color: 'bg-purple-100 text-purple-700', icon: Star },
  improving: { label: '持续进步', color: 'bg-green-100 text-green-700', icon: TrendingUp },
  stable: { label: '稳定', color: 'bg-blue-100 text-blue-700', icon: Minus },
  attention: { label: '需关注', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  warning: { label: '预警', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
};

// 级别颜色
const LEVEL_COLORS: Record<string, string> = {
  senior: '#8b5cf6',
  mid: '#3b82f6',
  intermediate: '#3b82f6',
  junior: '#10b981',
  assistant: '#6b7280'
};

const LEVEL_LABELS: Record<string, string> = {
  senior: '高级',
  mid: '中级',
  intermediate: '中级',
  junior: '初级',
  assistant: '助理'
};

// 迷你趋势图
function MiniTrend({ history }: { history: number[] }) {
  if (history.length < 2) return null;
  
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  const height = 24;
  const width = 60;
  const points = history.map((v, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const isUp = history[history.length - 1] > history[0];
  const color = isUp ? '#10b981' : history[history.length - 1] < history[0] ? '#ef4444' : '#6b7280';
  
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
}

export function GrowthTable({ data, title = '员工成长追踪', onEmployeeClick }: GrowthTableProps) {
  // 按变化排序，进步最大的在前
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.change - a.change);
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          {title}
          <Badge variant="outline" className="ml-2">{data.length}人</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-28">姓名</TableHead>
                <TableHead className="w-20">级别</TableHead>
                <TableHead className="w-20 text-right">本月</TableHead>
                <TableHead className="w-20 text-right">上月</TableHead>
                <TableHead className="w-24 text-center">变化</TableHead>
                <TableHead className="w-20 text-center">趋势</TableHead>
                <TableHead className="w-24 text-center">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((emp) => {
                const StatusIcon = STATUS_CONFIG[emp.status].icon;
                return (
                  <TableRow 
                    key={emp.employeeId}
                    className={cn(
                      "cursor-pointer hover:bg-gray-50",
                      emp.status === 'warning' && "bg-red-50/50",
                      emp.status === 'attention' && "bg-orange-50/50"
                    )}
                    onClick={() => onEmployeeClick?.(emp.employeeId)}
                  >
                    <TableCell className="font-medium">{emp.employeeName}</TableCell>
                    <TableCell>
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: `${LEVEL_COLORS[emp.level] || '#6b7280'}20`,
                          color: LEVEL_COLORS[emp.level] || '#6b7280'
                        }}
                      >
                        {LEVEL_LABELS[emp.level] || emp.level}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {emp.currentScore.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-gray-500">
                      {emp.previousScore > 0 ? emp.previousScore.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {emp.trend === 'up' && (
                          <>
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 font-medium">+{emp.change.toFixed(2)}</span>
                          </>
                        )}
                        {emp.trend === 'down' && (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <span className="text-red-600 font-medium">{emp.change.toFixed(2)}</span>
                          </>
                        )}
                        {emp.trend === 'stable' && (
                          <>
                            <Minus className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">0.00</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <MiniTrend history={emp.history} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("gap-1", STATUS_CONFIG[emp.status].color)}>
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_CONFIG[emp.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {sortedData.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            暂无数据
          </div>
        )}
      </CardContent>
    </Card>
  );
}
