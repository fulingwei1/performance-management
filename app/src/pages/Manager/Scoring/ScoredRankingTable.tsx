import { Link } from 'react-router-dom';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getLevelLabel, getLevelColor, resolveGroupType } from '@/lib/config';
import { cn } from '@/lib/utils';

interface ScoredRankingTableProps {
  records: any[];
  onOpenDrawer: (record: any) => void;
}

export function ScoredRankingTable({ records, onOpenDrawer }: ScoredRankingTableProps) {
  const scoredRecords = records
    .filter(r => r.status === 'completed' || r.status === 'scored')
    .sort((a, b) => b.totalScore - a.totalScore);

  if (scoredRecords.length === 0) return null;

  const getGroupBadge = (groupType: 'high' | 'low' | null, level?: any) => {
    const resolved = resolveGroupType(groupType, level);
    if (!resolved) return <Badge variant="outline" className="text-gray-400">未分组</Badge>;
    return resolved === 'high'
      ? <Badge className="bg-purple-100 text-purple-700">高分组</Badge>
      : <Badge className="bg-green-100 text-green-700">低分组</Badge>;
  };

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          已评分员工排名（按综合得分排序）
          <Badge variant="outline" className="ml-2">{scoredRecords.length}人</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-16">排名</TableHead>
                <TableHead>员工姓名</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>分组</TableHead>
                <TableHead className="text-center">组内排名</TableHead>
                <TableHead className="text-center">跨部门排名</TableHead>
                <TableHead className="text-right">任务完成</TableHead>
                <TableHead className="text-right">主动性</TableHead>
                <TableHead className="text-right">项目反馈</TableHead>
                <TableHead className="text-right">质量改进</TableHead>
                <TableHead className="text-right">综合得分</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoredRecords.map((record, index) => (
                <TableRow key={record.id} className="cursor-pointer hover:bg-gray-50" onClick={() => onOpenDrawer(record)}>
                  <TableCell>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 && "bg-yellow-100 text-yellow-700",
                      index === 1 && "bg-gray-100 text-gray-700",
                      index === 2 && "bg-orange-100 text-orange-700",
                      index > 2 && "bg-blue-100 text-blue-700"
                    )}>{index + 1}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link to={`/manager/employee/${record.employeeId}`} className="font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-2">
                        {record.employeeName}<BarChart3 className="w-3 h-3" />
                      </Link>
                      {index < 3 && (
                        <Badge className={cn("text-xs",
                          index === 0 && "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
                          index === 1 && "bg-gray-100 text-gray-700 hover:bg-gray-100",
                          index === 2 && "bg-orange-100 text-orange-700 hover:bg-orange-100"
                        )}>
                          {index === 0 && '🥇'}{index === 1 && '🥈'}{index === 2 && '🥉'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: `${getLevelColor(record.employeeLevel)}20`, color: getLevelColor(record.employeeLevel) }}>
                      {getLevelLabel(record.employeeLevel)}
                    </span>
                  </TableCell>
                  <TableCell>{getGroupBadge(record.groupType, record.employeeLevel)}</TableCell>
                  <TableCell className="text-center">{record.groupRank || '—'}</TableCell>
                  <TableCell className="text-center">{record.crossDeptRank || '—'}</TableCell>
                  <TableCell className="text-right">{record.taskCompletion.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{record.initiative.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{record.projectFeedback.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{record.qualityImprovement.toFixed(2)}</TableCell>
                  <TableCell className="text-right"><ScoreDisplay score={record.totalScore} showLabel={false} size="sm" /></TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onOpenDrawer(record); }}>修改</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
