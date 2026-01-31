import { useMemo } from 'react';
import {
  BarChart3,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { PerformanceChart } from '@/components/charts/PerformanceChart';
import { DistributionChart } from '@/components/charts/DistributionChart';
import { RankTable } from '@/components/stats/RankTable';
import { groupConfig } from '@/lib/config';
import { scoreToLevel } from '@/lib/calculateScore';
import type { PerformanceRecord } from '@/types';
import { cn } from '@/lib/utils';

interface AdvancedDashboardProps {
  records: PerformanceRecord[];
  totalTeamMembers?: number;
  title?: string;
}

export function AdvancedDashboard({ records, totalTeamMembers, title = '绩效分析看板' }: AdvancedDashboardProps) {
  // 统计数据
  const stats = useMemo(() => {
    const highGroupRecords = records.filter(r => r.groupType === 'high');
    const lowGroupRecords = records.filter(r => r.groupType === 'low');
    const completedRecords = records.filter(r => r.status === 'completed' || r.status === 'scored');
    
    const highAvg = highGroupRecords.length > 0 
      ? highGroupRecords.reduce((sum, r) => sum + r.totalScore, 0) / highGroupRecords.length 
      : 0;
    const lowAvg = lowGroupRecords.length > 0 
      ? lowGroupRecords.reduce((sum, r) => sum + r.totalScore, 0) / lowGroupRecords.length 
      : 0;
    
    const excellentCount = records.filter(r => {
      const level = scoreToLevel(r.totalScore);
      return level === 'L4' || level === 'L5';
    }).length;
    
    return {
      totalEmployees: totalTeamMembers || 0,
      completedCount: completedRecords.length,
      highGroupCount: highGroupRecords.length,
      lowGroupCount: lowGroupRecords.length,
      highGroupAvg: highAvg,
      lowGroupAvg: lowAvg,
      overallAvg: records.length > 0 ? records.reduce((sum, r) => sum + r.totalScore, 0) / records.length : 0,
      excellentRate: records.length > 0 ? (excellentCount / records.length) * 100 : 0
    };
  }, [records, totalTeamMembers]);
  
  // 分组记录
  const highGroupRecords = useMemo(() => 
    records.filter(r => r.groupType === 'high').sort((a, b) => b.totalScore - a.totalScore),
    [records]
  );
  
  const lowGroupRecords = useMemo(() => 
    records.filter(r => r.groupType === 'low').sort((a, b) => b.totalScore - a.totalScore),
    [records]
  );
  
  // 跨部门排名记录
  const crossDeptHighRecords = useMemo(() => 
    records.filter(r => 
      r.groupType === 'high' && 
      groupConfig.crossDeptGroups.includes(r.subDepartment)
    ).sort((a, b) => b.totalScore - a.totalScore),
    [records]
  );
  
  const crossDeptLowRecords = useMemo(() => 
    records.filter(r => 
      r.groupType === 'low' && 
      groupConfig.crossDeptGroups.includes(r.subDepartment)
    ).sort((a, b) => b.totalScore - a.totalScore),
    [records]
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1">分组排名 · 跨部门对比 · 智能分析</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-purple-100 text-purple-700">
            <Zap className="w-3 h-3 mr-1" />
            AI增强
          </Badge>
        </div>
      </div>
      

      {/* Group Comparison */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            分组对比分析
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* High Group */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="font-medium">高分组</span>
                  <Badge variant="outline" className="text-xs">
                    高级/中级工程师
                  </Badge>
                </div>
                <ScoreDisplay score={stats.highGroupAvg} showLabel={false} size="sm" />
              </div>
              <Progress value={(stats.highGroupAvg / 1.5) * 100} className="h-2" />
              <p className="text-sm text-gray-500">
                包含高级工程师和中级工程师，共 {stats.highGroupCount} 人
              </p>
            </div>
            
            {/* Low Group */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="font-medium">低分组</span>
                  <Badge variant="outline" className="text-xs">
                    初级/助理工程师
                  </Badge>
                </div>
                <ScoreDisplay score={stats.lowGroupAvg} showLabel={false} size="sm" />
              </div>
              <Progress value={(stats.lowGroupAvg / 1.5) * 100} className="h-2" />
              <p className="text-sm text-gray-500">
                包含初级工程师和助理工程师，共 {stats.lowGroupCount} 人
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Rankings Tabs */}
      <Tabs defaultValue="dept-high" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="dept-high">部门高分组</TabsTrigger>
          <TabsTrigger value="dept-low">部门低分组</TabsTrigger>
          <TabsTrigger value="cross-high">跨部门高分</TabsTrigger>
          <TabsTrigger value="cross-low">跨部门低分</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dept-high">
          <RankTable 
            records={highGroupRecords} 
            title="部门内高分组排名（高级/中级工程师）"
            showGroupInfo
          />
        </TabsContent>
        
        <TabsContent value="dept-low">
          <RankTable 
            records={lowGroupRecords} 
            title="部门内低分组排名（初级/助理工程师）"
            showGroupInfo
          />
        </TabsContent>
        
        <TabsContent value="cross-high">
          <RankTable 
            records={crossDeptHighRecords} 
            title="跨部门高分组排名（机械/测试/PLC）"
            showGroupInfo
            isCrossDept
          />
        </TabsContent>
        
        <TabsContent value="cross-low">
          <RankTable 
            records={crossDeptLowRecords} 
            title="跨部门低分组排名（机械/测试/PLC）"
            showGroupInfo
            isCrossDept
          />
        </TabsContent>
      </Tabs>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart records={records} title="绩效趋势分析" />
        <DistributionChart records={records} title="评分等级分布" />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red';
  trend?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, color, trend }: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <span className="text-xs text-green-600 font-medium">{trend}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
