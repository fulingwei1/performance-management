import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Edit, Trash2 } from 'lucide-react';
import { useOKRStore, Objective, KeyResult } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  at_risk: 'bg-red-100 text-red-600',
};

const statusLabels: Record<string, string> = {
  draft: '草稿', active: '进行中', completed: '已完成', cancelled: '已取消',
  not_started: '未开始', in_progress: '进行中', at_risk: '有风险',
};

export function MyObjectives() {
  const { myObjectives, fetchMyObjectives, createObjective, updateKR, createKR, loading } = useOKRStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newObj, setNewObj] = useState({ title: '', description: '' });
  const [editingKR, setEditingKR] = useState<{ krId: string; value: number } | null>(null);

  useEffect(() => {
    fetchMyObjectives();
  }, [fetchMyObjectives]);

  const handleCreateObjective = async () => {
    if (!newObj.title) return;
    await createObjective({ title: newObj.title, description: newObj.description, level: 'personal' });
    setNewObj({ title: '', description: '' });
    setShowAddDialog(false);
  };

  const handleUpdateKRProgress = async (krId: string, value: number) => {
    await updateKR(krId, { currentValue: value });
    setEditingKR(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的目标</h1>
          <p className="text-gray-500 mt-1">管理个人 OKR 目标和关键结果</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              新建目标
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建个人目标</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>目标标题</Label>
                <Input value={newObj.title} onChange={e => setNewObj({ ...newObj, title: e.target.value })} placeholder="输入目标标题" />
              </div>
              <div>
                <Label>描述</Label>
                <Input value={newObj.description} onChange={e => setNewObj({ ...newObj, description: e.target.value })} placeholder="目标描述（选填）" />
              </div>
              <Button onClick={handleCreateObjective} className="w-full" disabled={!newObj.title}>确认创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : myObjectives.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">暂无个人目标</p>
            <p className="text-sm text-gray-400 mt-1">点击"新建目标"开始</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myObjectives.map(obj => (
            <Card key={obj.id} className="border-l-4 border-l-purple-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    {obj.title}
                  </CardTitle>
                  <Badge className={cn('text-xs', statusColors[obj.status])}>{statusLabels[obj.status]}</Badge>
                </div>
                {obj.description && <p className="text-sm text-gray-500">{obj.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Progress value={obj.progress} className="flex-1 h-2" />
                  <span className="text-sm font-medium text-gray-600">{obj.progress}%</span>
                </div>

                {/* Key Results */}
                {obj.keyResults && obj.keyResults.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">关键结果 (KR)</h4>
                    {obj.keyResults.map(kr => (
                      <div key={kr.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{kr.title}</span>
                          <Badge className={cn('text-xs', statusColors[kr.status])}>{statusLabels[kr.status]}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={kr.progress} className="flex-1 h-2" />
                          <span className="text-xs text-gray-500 w-24 text-right">
                            {editingKR?.krId === kr.id ? (
                              <Input
                                type="number"
                                className="h-6 w-16 text-xs inline"
                                value={editingKR.value}
                                onChange={e => setEditingKR({ ...editingKR, value: Number(e.target.value) })}
                                onBlur={() => handleUpdateKRProgress(kr.id, editingKR.value)}
                                onKeyDown={e => e.key === 'Enter' && handleUpdateKRProgress(kr.id, editingKR.value)}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:text-blue-600"
                                onClick={() => setEditingKR({ krId: kr.id, value: kr.currentValue })}
                              >
                                {kr.currentValue}/{kr.targetValue} {kr.unit}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">权重：{kr.weight}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
