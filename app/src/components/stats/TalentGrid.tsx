/**
 * 人才九宫格组件
 * 基于绩效（Performance）和潜力（Potential）两个维度
 * 
 * 潜力评估基于：
 * - 连续进步趋势
 * - 级别与得分的匹配度（初级高分=高潜力）
 * - 得分稳定性
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Grid3X3, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// 九宫格定义
const GRID_CONFIG = [
  // 第一行：高潜力
  { id: 'star', label: '明星', row: 0, col: 2, performance: 'high', potential: 'high', color: 'bg-purple-500', textColor: 'text-white', desc: '重点培养，快速晋升通道' },
  { id: 'high-potential', label: '高潜力', row: 0, col: 1, performance: 'mid', potential: 'high', color: 'bg-blue-500', textColor: 'text-white', desc: '加强历练，提升绩效' },
  { id: 'potential-gem', label: '潜力股', row: 0, col: 0, performance: 'low', potential: 'high', color: 'bg-blue-400', textColor: 'text-white', desc: '关注发展，给予机会' },
  // 第二行：中潜力
  { id: 'core-player', label: '核心骨干', row: 1, col: 2, performance: 'high', potential: 'mid', color: 'bg-green-500', textColor: 'text-white', desc: '稳定发展，适当激励' },
  { id: 'stable', label: '中坚力量', row: 1, col: 1, performance: 'mid', potential: 'mid', color: 'bg-green-400', textColor: 'text-white', desc: '保持稳定，持续提升' },
  { id: 'inconsistent', label: '待提升', row: 1, col: 0, performance: 'low', potential: 'mid', color: 'bg-yellow-400', textColor: 'text-gray-800', desc: '明确目标，加强辅导' },
  // 第三行：低潜力
  { id: 'solid', label: '稳定贡献者', row: 2, col: 2, performance: 'high', potential: 'low', color: 'bg-teal-400', textColor: 'text-white', desc: '维持现状，合理使用' },
  { id: 'average', label: '基本胜任', row: 2, col: 1, performance: 'mid', potential: 'low', color: 'bg-gray-400', textColor: 'text-white', desc: '观察改进，适时调整' },
  { id: 'underperformer', label: '需改进', row: 2, col: 0, performance: 'low', potential: 'low', color: 'bg-red-400', textColor: 'text-white', desc: '绩效改进计划或调整' },
];

interface TalentEmployee {
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment?: string;
  level: string;
  currentScore: number;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  consecutiveImproving: number;
  historyScores: number[];
}

interface TalentGridProps {
  employees: TalentEmployee[];
  title?: string;
  showDepartment?: boolean; // 是否显示部门列
  onEmployeeClick?: (employeeId: string) => void;
}

// 计算绩效等级
function getPerformanceLevel(score: number): 'high' | 'mid' | 'low' {
  if (score >= 1.15) return 'high';
  if (score >= 0.95) return 'mid';
  return 'low';
}

// 计算潜力等级
function getPotentialLevel(emp: TalentEmployee): 'high' | 'mid' | 'low' {
  let potentialScore = 0;
  
  // 1. 连续进步加分 (最高3分)
  potentialScore += Math.min(emp.consecutiveImproving, 3);
  
  // 2. 级别与得分匹配度 (最高3分)
  // 初级员工高分 = 高潜力
  const levelExpectation: Record<string, number> = {
    'junior': 0.9,
    'assistant': 0.85,
    'mid': 1.0,
    'intermediate': 1.0,
    'senior': 1.1
  };
  const expected = levelExpectation[emp.level] || 1.0;
  const overPerformance = emp.currentScore - expected;
  if (overPerformance > 0.2) potentialScore += 3;
  else if (overPerformance > 0.1) potentialScore += 2;
  else if (overPerformance > 0) potentialScore += 1;
  
  // 3. 趋势加分 (最高2分)
  if (emp.trend === 'up') potentialScore += 2;
  else if (emp.trend === 'stable' && emp.currentScore >= 1.0) potentialScore += 1;
  
  // 4. 得分稳定性（低波动+高分=稳定高产出）
  if (emp.historyScores.length >= 3) {
    const variance = calculateVariance(emp.historyScores);
    if (variance < 0.01 && emp.avgScore >= 1.0) potentialScore += 1;
  }
  
  // 转换为等级
  if (potentialScore >= 5) return 'high';
  if (potentialScore >= 2) return 'mid';
  return 'low';
}

function calculateVariance(scores: number[]): number {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
}

// 将员工分配到九宫格
function assignToGrid(employees: TalentEmployee[]): Map<string, TalentEmployee[]> {
  const gridMap = new Map<string, TalentEmployee[]>();
  
  // 初始化所有格子
  GRID_CONFIG.forEach(g => gridMap.set(g.id, []));
  
  employees.forEach(emp => {
    const perfLevel = getPerformanceLevel(emp.currentScore);
    const potLevel = getPotentialLevel(emp);
    
    const gridCell = GRID_CONFIG.find(
      g => g.performance === perfLevel && g.potential === potLevel
    );
    
    if (gridCell) {
      gridMap.get(gridCell.id)!.push(emp);
    }
  });
  
  return gridMap;
}

const LEVEL_LABELS: Record<string, string> = {
  senior: '高级',
  mid: '中级',
  intermediate: '中级',
  junior: '初级',
  assistant: '助理'
};

export function TalentGrid({
  employees,
  title = '人才九宫格',
  showDepartment = true,
  onEmployeeClick
}: TalentGridProps) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  
  const gridData = useMemo(() => assignToGrid(employees), [employees]);
  
  const selectedCellConfig = GRID_CONFIG.find(g => g.id === selectedCell);
  const selectedEmployees = selectedCell ? gridData.get(selectedCell) || [] : [];
  
  // 统计
  const stats = useMemo(() => {
    const total = employees.length;
    const stars = gridData.get('star')?.length || 0;
    const highPotentials = (gridData.get('star')?.length || 0) + 
                          (gridData.get('high-potential')?.length || 0) + 
                          (gridData.get('potential-gem')?.length || 0);
    const needsImprovement = gridData.get('underperformer')?.length || 0;
    
    return { total, stars, highPotentials, needsImprovement };
  }, [gridData, employees]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-purple-600" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-purple-500" />
              明星 {stats.stars}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              高潜力 {stats.highPotentials}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              需改进 {stats.needsImprovement}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 九宫格 */}
        <div className="relative">
          {/* Y轴标签 */}
          <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-around text-xs text-gray-500 w-16 -ml-14">
            <span className="text-center">高潜力</span>
            <span className="text-center">中潜力</span>
            <span className="text-center">低潜力</span>
          </div>
          
          {/* 网格 */}
          <div className="ml-4 grid grid-cols-3 gap-2">
            {/* 按行列顺序渲染 */}
            {[0, 1, 2].map(row => (
              [0, 1, 2].map(col => {
                const cell = GRID_CONFIG.find(g => g.row === row && g.col === col)!;
                const cellEmployees = gridData.get(cell.id) || [];
                const count = cellEmployees.length;
                
                return (
                  <button
                    key={cell.id}
                    onClick={() => count > 0 && setSelectedCell(cell.id)}
                    className={cn(
                      "relative p-3 rounded-lg transition-all min-h-[80px] flex flex-col items-center justify-center",
                      cell.color,
                      cell.textColor,
                      count > 0 ? "cursor-pointer hover:opacity-90 hover:scale-[1.02]" : "opacity-60 cursor-default"
                    )}
                  >
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-xs mt-1 opacity-90">{cell.label}</span>
                  </button>
                );
              })
            ))}
          </div>
          
          {/* X轴标签 */}
          <div className="ml-4 grid grid-cols-3 gap-2 mt-2 text-xs text-gray-500 text-center">
            <span>低绩效</span>
            <span>中绩效</span>
            <span>高绩效</span>
          </div>
        </div>
        
        {/* 详情弹窗 */}
        <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className={cn("w-4 h-4 rounded", selectedCellConfig?.color)} />
                {selectedCellConfig?.label}
                <Badge variant="outline" className="ml-2">{selectedEmployees.length}人</Badge>
              </DialogTitle>
              <p className="text-sm text-gray-500">{selectedCellConfig?.desc}</p>
            </DialogHeader>
            
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>姓名</TableHead>
                  {showDepartment && <TableHead>部门</TableHead>}
                  <TableHead>级别</TableHead>
                  <TableHead className="text-right">当前得分</TableHead>
                  <TableHead className="text-right">平均分</TableHead>
                  <TableHead className="text-center">趋势</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedEmployees
                  .sort((a, b) => b.currentScore - a.currentScore)
                  .map(emp => (
                    <TableRow 
                      key={emp.employeeId}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onEmployeeClick?.(emp.employeeId)}
                    >
                      <TableCell className="font-medium">{emp.employeeName}</TableCell>
                      {showDepartment && (
                        <TableCell className="text-sm text-gray-600">
                          {emp.subDepartment || emp.department}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {LEVEL_LABELS[emp.level] || emp.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {emp.currentScore.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {emp.avgScore.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mx-auto" />}
                        {emp.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 mx-auto rotate-180" />}
                        {emp.trend === 'stable' && <span className="text-gray-400">—</span>}
                        {emp.consecutiveImproving > 0 && (
                          <span className="text-xs text-green-600 ml-1">+{emp.consecutiveImproving}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
