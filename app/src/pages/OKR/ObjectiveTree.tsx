import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, ChevronDown, ChevronRight, Building2, Users, User, Plus } from 'lucide-react';
import { useOKRStore, Objective } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const levelConfig = {
  company: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Building2, label: '公司', cardBorder: 'border-l-blue-500' },
  department: { color: 'bg-green-100 text-green-700 border-green-200', icon: Users, label: '部门', cardBorder: 'border-l-green-500' },
  personal: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: User, label: '个人', cardBorder: 'border-l-purple-500' },
};

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
  active: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-600' },
};

function ObjectiveNode({ objective, depth = 0 }: { objective: Objective; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const config = levelConfig[objective.level] || levelConfig.personal;
  const status = statusMap[objective.status] || statusMap.draft;
  const Icon = config.icon;
  const hasChildren = objective.children && objective.children.length > 0;

  return (
    <div className={cn('ml-0', depth > 0 && 'ml-6')}>
      <Card className={cn('border-l-4 mb-3', config.cardBorder)}>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} className="mt-1 text-gray-400 hover:text-gray-600">
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-4" />
            )}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50">
              <Icon className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 text-sm">{objective.title}</span>
                <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>
                <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>
              </div>
              {objective.description && (
                <p className="text-xs text-gray-500 mb-2">{objective.description}</p>
              )}
              {objective.ownerName && (
                <p className="text-xs text-gray-400 mb-2">负责人：{objective.ownerName}</p>
              )}
              <div className="flex items-center gap-2">
                <Progress value={objective.progress} className="flex-1 h-2" />
                <span className="text-xs text-gray-500 w-10 text-right">{objective.progress}%</span>
              </div>
              {/* KR list */}
              {objective.keyResults && objective.keyResults.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {objective.keyResults.map(kr => (
                    <div key={kr.id} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5">
                      <Target className="w-3 h-3 text-gray-400" />
                      <span className="flex-1">{kr.title}</span>
                      <span className="text-gray-400">{kr.currentValue}/{kr.targetValue} {kr.unit}</span>
                      <Progress value={kr.progress} className="w-16 h-1.5" />
                      <span className="w-8 text-right">{kr.progress}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {expanded && hasChildren && (
        <div>
          {objective.children!.map(child => (
            <ObjectiveNode key={child.id} objective={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ObjectiveTree() {
  const { objectiveTree, fetchObjectiveTree, loading } = useOKRStore();

  useEffect(() => {
    fetchObjectiveTree();
  }, [fetchObjectiveTree]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">目标级联树</h1>
          <p className="text-gray-500 mt-1">公司 → 部门 → 个人 目标分解视图</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {Object.entries(levelConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded', config.color.split(' ')[0])} />
            <span className="text-xs text-gray-500">{config.label}目标</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : objectiveTree.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">暂无目标数据</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          {objectiveTree.map(obj => (
            <ObjectiveNode key={obj.id} objective={obj} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
