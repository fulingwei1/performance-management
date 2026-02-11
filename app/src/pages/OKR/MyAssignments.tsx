import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function MyAssignments() {
  const { myAssignments, fetchMyAssignments, completeAssignment, loading } = useOKRStore();

  useEffect(() => { fetchMyAssignments(); }, [fetchMyAssignments]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">待拆解任务</h1>
        <p className="text-gray-500 mt-1">分配给我的目标拆解任务</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : myAssignments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">暂无待拆解任务</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myAssignments.map(a => (
            <Card key={a.id} className={cn('border-l-4', a.status === 'pending' ? 'border-l-orange-500' : 'border-l-green-500')}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{a.objectiveTitle}</span>
                      <Badge className={cn('text-xs', a.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700')}>
                        {a.status === 'pending' ? '待拆解' : '已完成'}
                      </Badge>
                    </div>
                    {a.objectiveDescription && <p className="text-sm text-gray-500">{a.objectiveDescription}</p>}
                    {a.message && <p className="text-sm text-gray-600 mt-1">备注：{a.message}</p>}
                    {a.deadline && <p className="text-xs text-gray-400 mt-1">截止日期：{new Date(a.deadline).toLocaleDateString()}</p>}
                  </div>
                  {a.status === 'pending' && (
                    <Button size="sm" onClick={() => completeAssignment(a.id)} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-1" /> 标记完成
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
