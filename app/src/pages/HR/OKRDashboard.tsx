import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Target, TrendingUp, Users } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function OKRDashboard() {
  const { objectiveTree, strategicObjectives, fetchObjectiveTree, fetchStrategicObjectives, loading } = useOKRStore();

  useEffect(() => {
    fetchObjectiveTree();
    fetchStrategicObjectives();
  }, [fetchObjectiveTree, fetchStrategicObjectives]);

  // Flatten all objectives
  const flatObjectives: any[] = [];
  const flatten = (objs: any[]) => {
    for (const o of objs) {
      flatObjectives.push(o);
      if (o.children) flatten(o.children);
    }
  };
  flatten(objectiveTree);

  const stats = {
    total: flatObjectives.length,
    completed: flatObjectives.filter(o => o.status === 'completed').length,
    active: flatObjectives.filter(o => o.status === 'active').length,
    avgProgress: flatObjectives.length > 0
      ? Math.round(flatObjectives.reduce((sum, o) => sum + (o.progress || 0), 0) / flatObjectives.length)
      : 0,
  };

  // Group by department
  const deptMap = new Map<string, { count: number; progress: number }>();
  flatObjectives.forEach(o => {
    const dept = o.department || '未分配';
    const existing = deptMap.get(dept) || { count: 0, progress: 0 };
    existing.count++;
    existing.progress += o.progress || 0;
    deptMap.set(dept, existing);
  });
  const deptStats = Array.from(deptMap.entries()).map(([dept, d]) => ({
    department: dept, count: d.count, avgProgress: Math.round(d.progress / d.count)
  })).sort((a, b) => b.avgProgress - a.avgProgress);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">OKR 总览</h1>
        <p className="text-gray-500 mt-1">全公司 OKR 完成率概览</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Target className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">目标总数</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="w-8 h-8 text-green-500" /><div><p className="text-sm text-gray-500">已完成</p><p className="text-2xl font-bold text-green-600">{stats.completed}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BarChart3 className="w-8 h-8 text-orange-500" /><div><p className="text-sm text-gray-500">进行中</p><p className="text-2xl font-bold text-orange-600">{stats.active}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="w-8 h-8 text-purple-500" /><div><p className="text-sm text-gray-500">平均进度</p><p className="text-2xl font-bold text-purple-600">{stats.avgProgress}%</p></div></div></CardContent></Card>
      </div>

      {/* Strategic objectives */}
      <Card>
        <CardHeader><CardTitle>战略目标</CardTitle></CardHeader>
        <CardContent>
          {strategicObjectives.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无战略目标</p>
          ) : (
            <div className="space-y-3">
              {strategicObjectives.map(so => (
                <div key={so.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{so.title}</span>
                    <span className="text-sm text-gray-400 ml-2">{so.year}</span>
                  </div>
                  <Badge className={cn('text-xs', so.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                    {so.status === 'active' ? '进行中' : '已完成'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department progress */}
      <Card>
        <CardHeader><CardTitle>各部门OKR进度</CardTitle></CardHeader>
        <CardContent>
          {deptStats.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无数据</p>
          ) : (
            <div className="space-y-4">
              {deptStats.map(dept => (
                <div key={dept.department}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{dept.department}</span>
                    <span className="text-sm text-gray-500">{dept.count}个目标 · {dept.avgProgress}%</span>
                  </div>
                  <Progress value={dept.avgProgress} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
