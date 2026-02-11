import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, TrendingUp, Building2, Users, User } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const levelConfig = {
  company: { color: 'bg-blue-100 text-blue-700', icon: Building2, label: '公司' },
  department: { color: 'bg-green-100 text-green-700', icon: Users, label: '部门' },
  personal: { color: 'bg-purple-100 text-purple-700', icon: User, label: '个人' },
};

export function StrategicOverview() {
  const { strategicObjectives, objectiveTree, fetchStrategicObjectives, fetchObjectiveTree, loading } = useOKRStore();

  useEffect(() => {
    fetchStrategicObjectives();
    fetchObjectiveTree();
  }, [fetchStrategicObjectives, fetchObjectiveTree]);

  // Count objectives by level
  const countByLevel = (objectives: typeof objectiveTree): Record<string, number> => {
    const counts: Record<string, number> = { company: 0, department: 0, personal: 0 };
    const traverse = (objs: typeof objectiveTree) => {
      objs.forEach(o => {
        counts[o.level] = (counts[o.level] || 0) + 1;
        if (o.children) traverse(o.children);
      });
    };
    traverse(objectives);
    return counts;
  };
  const counts = countByLevel(objectiveTree);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">战略总览</h1>
        <p className="text-gray-500 mt-1">公司战略目标与分解进度一览</p>
      </div>

      {/* Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(levelConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{config.label}目标</p>
                    <p className="text-2xl font-bold">{counts[key] || 0}</p>
                  </div>
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.color.split(' ')[0])}>
                    <Icon className={cn('w-5 h-5', config.color.split(' ')[1])} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Strategic Objectives with decomposition */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <div className="space-y-6">
          {strategicObjectives.map(so => (
            <Card key={so.id} className="border-t-4 border-t-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crosshair className="w-5 h-5 text-blue-600" />
                    {so.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{so.year}</Badge>
                    <Badge className={cn('text-xs', so.progress >= 80 ? 'bg-green-100 text-green-700' : so.progress >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700')}>
                      {so.progress}%
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{so.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Progress value={so.progress} className="flex-1 h-3" />
                  <span className="text-sm font-medium">{so.progress}%</span>
                </div>

                {/* Related company objectives */}
                {objectiveTree.filter(o => o.strategicObjectiveId === so.id).map(obj => (
                  <div key={obj.id} className="ml-4 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">{obj.title}</span>
                      <Badge className="text-xs bg-blue-100 text-blue-700">公司</Badge>
                      <span className="text-xs text-gray-400 ml-auto">{obj.progress}%</span>
                    </div>
                    <Progress value={obj.progress} className="h-1.5 ml-6" />
                    {/* Department children */}
                    {obj.children?.map(dept => (
                      <div key={dept.id} className="ml-10 mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-3 h-3 text-green-500" />
                          <span className="text-xs font-medium">{dept.title}</span>
                          <Badge className="text-[10px] bg-green-100 text-green-700">部门</Badge>
                          <span className="text-xs text-gray-400 ml-auto">{dept.progress}%</span>
                        </div>
                        <Progress value={dept.progress} className="h-1 ml-5" />
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {strategicObjectives.length === 0 && (
            <Card><CardContent className="py-16 text-center">
              <Crosshair className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">暂无战略目标</p>
            </CardContent></Card>
          )}
        </div>
      )}
    </motion.div>
  );
}
