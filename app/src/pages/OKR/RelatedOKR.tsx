import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import type { Objective } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500',
};
const statusLabels: Record<string, string> = {
  draft: '草稿', active: '进行中', completed: '已完成', cancelled: '已取消',
};

function ObjectiveList({ objectives, emptyText }: { objectives: Objective[]; emptyText: string }) {
  if (objectives.length === 0) return <p className="text-gray-400 text-sm py-4 text-center">{emptyText}</p>;
  return (
    <div className="space-y-2">
      {objectives.map(obj => (
        <div key={obj.id} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{obj.title}</span>
              <Badge className={cn('text-xs', statusColors[obj.status])}>{statusLabels[obj.status]}</Badge>
            </div>
            {obj.ownerName && <span className="text-xs text-gray-400">{obj.ownerName}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Progress value={obj.progress} className="flex-1 h-2" />
            <span className="text-xs text-gray-500">{obj.progress}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RelatedOKR() {
  const { relatedOKR, fetchRelatedOKR, loading } = useOKRStore();

  useEffect(() => { fetchRelatedOKR(); }, [fetchRelatedOKR]);

  const sections = relatedOKR ? [
    { title: '我的目标', icon: Target, data: relatedOKR.myObjectives, empty: '暂无个人目标', color: 'text-purple-600' },
    { title: '上级目标', icon: ArrowUp, data: relatedOKR.parentObjectives, empty: '暂无上级目标', color: 'text-blue-600' },
    { title: '下属拆解', icon: ArrowDown, data: relatedOKR.childObjectives, empty: '暂无下属拆解', color: 'text-green-600' },
    { title: '同部门同事', icon: Users, data: relatedOKR.colleagueObjectives, empty: '暂无同事目标', color: 'text-orange-600' },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">我的关联OKR</h1>
        <p className="text-gray-500 mt-1">与我相关的所有目标</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <div className="grid gap-6">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className={cn('w-5 h-5', s.color)} />
                    {s.title}
                    <Badge variant="outline" className="ml-2">{s.data.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ObjectiveList objectives={s.data} emptyText={s.empty} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
