import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, BarChart3 } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = { active: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500' };

export function StrategicOverview() {
  const { strategicObjectives, objectiveTree, fetchStrategicObjectives, fetchObjectiveTree, loading } = useOKRStore();

  useEffect(() => {
    fetchStrategicObjectives();
    fetchObjectiveTree();
  }, [fetchStrategicObjectives, fetchObjectiveTree]);

  // Company-level objectives from tree
  const companyObjectives = objectiveTree.filter(o => o.level === 'company');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">战略目标总览</h1>
        <p className="text-gray-500 mt-1">公司战略目标及分解情况</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Target className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">战略目标</p><p className="text-2xl font-bold">{strategicObjectives.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BarChart3 className="w-8 h-8 text-green-500" /><div><p className="text-sm text-gray-500">公司级OKR</p><p className="text-2xl font-bold">{companyObjectives.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="w-8 h-8 text-purple-500" /><div><p className="text-sm text-gray-500">完成率</p><p className="text-2xl font-bold">{strategicObjectives.length > 0 ? Math.round(strategicObjectives.filter(s => s.status === 'completed').length / strategicObjectives.length * 100) : 0}%</p></div></div></CardContent></Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>战略目标</CardTitle></CardHeader>
            <CardContent>
              {strategicObjectives.length === 0 ? (
                <p className="text-gray-400 text-center py-6">暂无战略目标</p>
              ) : (
                <div className="space-y-4">
                  {strategicObjectives.map(so => (
                    <div key={so.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-blue-500" />
                          <span className="font-semibold text-lg">{so.title}</span>
                        </div>
                        <Badge className={cn('text-xs', statusColors[so.status])}>{so.status === 'active' ? '进行中' : so.status === 'completed' ? '已完成' : '已取消'}</Badge>
                      </div>
                      {so.description && <p className="text-sm text-gray-600 mb-2">{so.description}</p>}
                      <div className="flex items-center gap-2">
                        <Progress value={so.progress || 0} className="flex-1 h-2" />
                        <span className="text-sm text-gray-500">{so.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>公司级 OKR</CardTitle></CardHeader>
            <CardContent>
              {companyObjectives.length === 0 ? (
                <p className="text-gray-400 text-center py-6">暂无公司级OKR</p>
              ) : (
                <div className="space-y-3">
                  {companyObjectives.map(obj => (
                    <div key={obj.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{obj.title}</span>
                        <span className="text-sm text-gray-500">{obj.children?.length || 0} 个子目标</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={obj.progress} className="flex-1 h-2" />
                        <span className="text-sm text-gray-500">{obj.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}
