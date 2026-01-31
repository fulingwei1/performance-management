import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Scale
} from 'lucide-react';
import { useHRStore } from '@/stores/hrStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { calculateManagerStats, calculateGlobalStats, normalizeScore, getManagerStrictnessLevel } from '@/lib/scoreNormalization';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { cn } from '@/lib/utils';

export function NormalizationReport() {
  const { allPerformanceRecords } = useHRStore();
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // 计算统计数据
  const managerStats = calculateManagerStats(allPerformanceRecords);
  const globalStats = calculateGlobalStats(allPerformanceRecords);
  const report = managerStats.map(stat => ({
    ...stat,
    strictness: getManagerStrictnessLevel(stat, globalStats.averageScore)
  }));
  
  const needsAdjustment = report.filter(r => r.strictness.level !== 'normal');
  
  // 获取选中经理的详细记录
  const managerRecords = selectedManager 
    ? allPerformanceRecords.filter(r => r.assessorId === selectedManager)
    : [];
  
  const selectedManagerData = managerStats.find(m => m.managerId === selectedManager);
  
  return (
    <div className="space-y-6">
      {/* 说明卡片 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">分数标准化说明</h4>
              <p className="text-sm text-blue-700 mt-1">
                系统使用Z-Score标准化算法，消除不同经理打分习惯的差异。将每位经理的分数映射到统一尺度，确保跨部门比较的公平性。
              </p>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-blue-700">偏严格</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-blue-700">正常</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-blue-700">偏宽松</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 全局统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">全公司平均分</p>
                <p className="text-2xl font-bold">{globalStats.averageScore.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">标准差</p>
                <p className="text-2xl font-bold">{globalStats.stdDeviation.toFixed(3)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">正常打分经理</p>
                <p className="text-2xl font-bold">{report.length - needsAdjustment.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">需调整经理</p>
                <p className="text-2xl font-bold">{needsAdjustment.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 经理打分习惯分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-600" />
            经理打分习惯分析
          </CardTitle>
          <CardDescription>
            点击经理名称查看详细记录和标准化后的分数
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>经理姓名</TableHead>
                  <TableHead>打分严格度</TableHead>
                  <TableHead>平均分</TableHead>
                  <TableHead>标准差</TableHead>
                  <TableHead>最低分</TableHead>
                  <TableHead>最高分</TableHead>
                  <TableHead>评分人数</TableHead>
                  <TableHead>与全局差异</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.map((manager) => (
                  <TableRow 
                    key={manager.managerId}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setSelectedManager(manager.managerId);
                      setShowDetails(true);
                    }}
                  >
                    <TableCell className="font-medium">{manager.managerName}</TableCell>
                    <TableCell>
                      <Badge 
                        className="text-white"
                        style={{ backgroundColor: manager.strictness.color }}
                      >
                        {manager.strictness.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-medium",
                        manager.averageScore < globalStats.averageScore - 0.1 && "text-red-600",
                        manager.averageScore > globalStats.averageScore + 0.1 && "text-green-600"
                      )}>
                        {manager.averageScore.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>{manager.stdDeviation.toFixed(3)}</TableCell>
                    <TableCell>{manager.minScore.toFixed(2)}</TableCell>
                    <TableCell>{manager.maxScore.toFixed(2)}</TableCell>
                    <TableCell>{manager.count}</TableCell>
                    <TableCell>
                      <span className={cn(
                        manager.averageScore - globalStats.averageScore > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {manager.averageScore - globalStats.averageScore > 0 ? '+' : ''}
                        {(manager.averageScore - globalStats.averageScore).toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* 详情弹窗 */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedManagerData?.managerName} - 评分详情
              {selectedManagerData && (
                <Badge 
                  className="text-white"
                  style={{ 
                    backgroundColor: getManagerStrictnessLevel(selectedManagerData, globalStats.averageScore).color 
                  }}
                >
                  {getManagerStrictnessLevel(selectedManagerData, globalStats.averageScore).label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 统计摘要 */}
            {selectedManagerData && (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">平均分</p>
                  <p className="text-xl font-bold">{selectedManagerData.averageScore.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">标准差</p>
                  <p className="text-xl font-bold">{selectedManagerData.stdDeviation.toFixed(3)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">最低分</p>
                  <p className="text-xl font-bold">{selectedManagerData.minScore.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">最高分</p>
                  <p className="text-xl font-bold">{selectedManagerData.maxScore.toFixed(2)}</p>
                </div>
              </div>
            )}
            
            {/* 评分记录 */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">评分记录对比</h4>
              {managerRecords.map((record) => {
                const normalized = normalizeScore(record, managerStats, globalStats);
                
                return (
                  <div key={record.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{record.employeeName}</span>
                        <Badge variant="outline">{record.month}</Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-500 mb-1">原始分数</p>
                        <div className="flex items-center gap-2">
                          <ScoreDisplay score={record.totalScore} showLabel={false} size="sm" />
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-2 rounded">
                        <p className="text-xs text-gray-500 mb-1">标准化分数</p>
                        <div className="flex items-center gap-2">
                          <ScoreDisplay score={normalized.normalizedScore} showLabel={false} size="sm" />
                          <Badge className={cn(
                            normalized.adjustment > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            {normalized.adjustment > 0 ? '+' : ''}{normalized.adjustment.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
