import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Target, TrendingUp } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

export function OKRDashboard() {
  const { objectiveTree, strategicObjectives, fetchObjectiveTree, fetchStrategicObjectives, loading } = useOKRStore();

  useEffect(() => {
    fetchObjectiveTree();
    fetchStrategicObjectives();
  }, [fetchObjectiveTree, fetchStrategicObjectives]);

  // Compute department progress from tree
  const deptData = objectiveTree
    .filter(o => o.level === 'company')
    .flatMap(o => o.children || [])
    .filter(o => o.level === 'department')
    .map(o => ({
      name: o.department || o.ownerName || o.title,
      progress: o.progress,
      count: (o.children?.length || 0) + 1,
    }));

  // Heatmap-style data for strategic objectives
  const strategicData = strategicObjectives.map(s => ({
    name: s.title.length > 12 ? s.title.slice(0, 12) + '...' : s.title,
    progress: s.progress,
    priority: s.priority,
  }));

  const overallProgress = objectiveTree.length > 0
    ? Math.round(objectiveTree.reduce((s, o) => s + o.progress, 0) / objectiveTree.length)
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">OKR 总览</h1>
        <p className="text-gray-500 mt-1">OKR 完成情况总览</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">战略目标</p>
            <p className="text-2xl font-bold">{strategicObjectives.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">公司目标</p>
            <p className="text-2xl font-bold text-blue-600">{objectiveTree.filter(o => o.level === 'company').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">部门目标</p>
            <p className="text-2xl font-bold text-green-600">{deptData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">整体进度</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-purple-600">{overallProgress}%</p>
              <Progress value={overallProgress} className="flex-1 h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Comparison Chart */}
      {deptData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" /> 部门 OKR 进度对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                    {deptData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Objectives Progress (Heatmap style) */}
      {strategicData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" /> 战略目标进度热力图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {strategicData.map((s, i) => {
                const intensity = s.progress / 100;
                const bgColor = s.progress >= 80 ? 'bg-green-100' : s.progress >= 50 ? 'bg-blue-100' : s.progress >= 20 ? 'bg-yellow-100' : 'bg-red-100';
                const textColor = s.progress >= 80 ? 'text-green-700' : s.progress >= 50 ? 'text-blue-700' : s.progress >= 20 ? 'text-yellow-700' : 'text-red-700';
                return (
                  <div key={i} className={cn('rounded-lg p-4 text-center', bgColor)}>
                    <p className={cn('text-sm font-medium', textColor)}>{s.name}</p>
                    <p className={cn('text-2xl font-bold mt-1', textColor)}>{s.progress}%</p>
                    <p className="text-xs text-gray-400 mt-1">P{s.priority}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <div className="text-center py-4 text-gray-400">加载中...</div>}
    </motion.div>
  );
}
