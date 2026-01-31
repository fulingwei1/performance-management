/**
 * 人才梯队表格组件
 * 展示Top员工、持续进步者、需关注员工、潜力股
 */

// React hooks - removed useMemo as unused
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, TrendingUp, AlertTriangle, Star, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TalentRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment?: string;
  level: string;
  currentScore: number;
  previousScore?: number;
  trend?: 'up' | 'down' | 'stable';
  consecutiveImproving?: number; // 连续进步月数
}

interface TalentTableProps {
  topPerformers: TalentRecord[];      // Top 10
  improvingTalents: TalentRecord[];   // 连续进步
  attentionNeeded: TalentRecord[];    // 需关注
  potentialStars: TalentRecord[];     // 潜力股
  onEmployeeClick?: (employeeId: string) => void;
}

const LEVEL_LABELS: Record<string, string> = {
  senior: '高级',
  mid: '中级',
  intermediate: '中级',
  junior: '初级',
  assistant: '助理'
};

function TalentList({ 
  data, 
  type, 
  onEmployeeClick 
}: { 
  data: TalentRecord[]; 
  type: 'top' | 'improving' | 'attention' | 'potential';
  onEmployeeClick?: (employeeId: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无数据
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          {type === 'top' && <TableHead className="w-12">排名</TableHead>}
          <TableHead>姓名</TableHead>
          <TableHead>部门</TableHead>
          <TableHead>级别</TableHead>
          <TableHead className="text-right">得分</TableHead>
          {type === 'improving' && <TableHead className="text-center">连续进步</TableHead>}
          {type === 'attention' && <TableHead className="text-center">变化</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((emp, index) => (
          <TableRow 
            key={emp.employeeId}
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => onEmployeeClick?.(emp.employeeId)}
          >
            {type === 'top' && (
              <TableCell>
                {index < 3 ? (
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                    index === 0 && "bg-yellow-500",
                    index === 1 && "bg-gray-400",
                    index === 2 && "bg-amber-600"
                  )}>
                    {index + 1}
                  </div>
                ) : (
                  <span className="text-gray-500 pl-2">{index + 1}</span>
                )}
              </TableCell>
            )}
            <TableCell className="font-medium">{emp.employeeName}</TableCell>
            <TableCell className="text-sm text-gray-600">
              {emp.subDepartment || emp.department}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {LEVEL_LABELS[emp.level] || emp.level}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <span className={cn(
                "font-semibold",
                emp.currentScore >= 1.3 && "text-purple-600",
                emp.currentScore >= 1.0 && emp.currentScore < 1.3 && "text-blue-600",
                emp.currentScore < 1.0 && "text-orange-600"
              )}>
                {emp.currentScore.toFixed(2)}
              </span>
            </TableCell>
            {type === 'improving' && (
              <TableCell className="text-center">
                <Badge className="bg-green-100 text-green-700">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {emp.consecutiveImproving}个月
                </Badge>
              </TableCell>
            )}
            {type === 'attention' && (
              <TableCell className="text-center">
                {emp.previousScore && (
                  <span className="text-red-600 font-medium">
                    {(emp.currentScore - emp.previousScore).toFixed(2)}
                  </span>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function TalentTable({
  topPerformers,
  improvingTalents,
  attentionNeeded,
  potentialStars,
  onEmployeeClick
}: TalentTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-600" />
          人才梯队分析
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="top" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="top" className="text-xs">
              <Medal className="w-3 h-3 mr-1" />
              Top 10
              <Badge variant="secondary" className="ml-1 text-xs px-1">{topPerformers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="improving" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              连续进步
              <Badge variant="secondary" className="ml-1 text-xs px-1">{improvingTalents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="attention" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              需关注
              <Badge variant="secondary" className="ml-1 text-xs px-1">{attentionNeeded.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="potential" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              潜力股
              <Badge variant="secondary" className="ml-1 text-xs px-1">{potentialStars.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="top" className="mt-4">
            <TalentList data={topPerformers} type="top" onEmployeeClick={onEmployeeClick} />
          </TabsContent>
          
          <TabsContent value="improving" className="mt-4">
            <TalentList data={improvingTalents} type="improving" onEmployeeClick={onEmployeeClick} />
          </TabsContent>
          
          <TabsContent value="attention" className="mt-4">
            <TalentList data={attentionNeeded} type="attention" onEmployeeClick={onEmployeeClick} />
          </TabsContent>
          
          <TabsContent value="potential" className="mt-4">
            <TalentList data={potentialStars} type="top" onEmployeeClick={onEmployeeClick} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
