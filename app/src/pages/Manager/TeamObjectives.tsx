import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { useOKRStore, Objective } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};
const statusLabels: Record<string, string> = { draft: '草稿', active: '进行中', completed: '已完成', cancelled: '已取消' };

export function TeamObjectives() {
  const { objectiveTree, fetchObjectiveTree, createObjective, loading } = useOKRStore();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', parentId: '', level: 'personal' as 'department' | 'personal', startDate: '', endDate: '', feedbackCycle: 'monthly' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { fetchObjectiveTree(); }, [fetchObjectiveTree]);

  // Flatten department objectives for parent selection
  const deptObjectives = objectiveTree.flatMap(o =>
    o.level === 'department' ? [o] : (o.children?.filter(c => c.level === 'department') || [])
  );

  const handleCreate = async () => {
    if (!form.title) return;
    await createObjective({
      title: form.title,
      description: form.description,
      level: form.level,
      parentId: form.parentId || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      feedbackCycle: form.feedbackCycle || undefined,
    });
    setForm({ title: '', description: '', parentId: '', level: 'personal', startDate: '', endDate: '', feedbackCycle: 'monthly' });
    setShowDialog(false);
  };

  const toggle = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  const renderObjective = (obj: Objective, depth = 0) => {
    const hasChildren = obj.children && obj.children.length > 0;
    const isExpanded = expanded.has(obj.id);
    return (
      <div key={obj.id} className={cn(depth > 0 && 'ml-6')}>
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border mb-2 hover:shadow-sm transition-shadow">
          {hasChildren ? (
            <button onClick={() => toggle(obj.id)} className="text-gray-400 hover:text-gray-600">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : <div className="w-4" />}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{obj.title}</span>
              <Badge className={cn('text-xs', obj.level === 'department' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700')}>
                {obj.level === 'department' ? '部门' : '个人'}
              </Badge>
              <Badge className={cn('text-xs', statusColors[obj.status])}>{statusLabels[obj.status]}</Badge>
            </div>
            {obj.ownerName && <span className="text-xs text-gray-400">负责人：{obj.ownerName}</span>}
          </div>
          <div className="flex items-center gap-2 w-32">
            <Progress value={obj.progress} className="flex-1 h-2" />
            <span className="text-xs text-gray-500">{obj.progress}%</span>
          </div>
        </div>
        {isExpanded && hasChildren && obj.children!.map(c => renderObjective(c, depth + 1))}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">团队目标管理</h1>
          <p className="text-gray-500 mt-1">管理和分解团队目标</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" />分解目标</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>分解目标给下属</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>上级目标</Label>
                <Select value={form.parentId} onValueChange={v => setForm({ ...form, parentId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择上级目标" /></SelectTrigger>
                  <SelectContent>
                    {deptObjectives.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>目标标题</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="输入目标标题" />
              </div>
              <div>
                <Label>描述</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="选填" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>开始日期</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label>结束日期</Label>
                  <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>反馈周期</Label>
                <Select value={form.feedbackCycle} onValueChange={v => setForm({ ...form, feedbackCycle: v })}>
                  <SelectTrigger><SelectValue placeholder="选择反馈周期" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="biweekly">每两周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                    <SelectItem value="quarterly">每季度</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.title}>确认创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : objectiveTree.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">暂无团队目标</p>
        </CardContent></Card>
      ) : (
        <div>{objectiveTree.map(o => renderObjective(o))}</div>
      )}
    </motion.div>
  );
}
