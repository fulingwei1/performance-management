import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Pencil, Trash2 } from 'lucide-react';
import { useOKRStore, StrategicObjective } from '@/stores/okrStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = { active: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500' };
const statusLabels: Record<string, string> = { active: '进行中', completed: '已完成', cancelled: '已取消' };

export function StrategicObjectives() {
  const { strategicObjectives, fetchStrategicObjectives, createStrategicObjective, updateStrategicObjective, deleteStrategicObjective, loading } = useOKRStore();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', year: new Date().getFullYear(), priority: 1 });

  useEffect(() => { fetchStrategicObjectives(); }, [fetchStrategicObjectives]);

  const handleCreate = async () => {
    if (!form.title) return;
    await createStrategicObjective(form);
    setForm({ title: '', description: '', year: new Date().getFullYear(), priority: 1 });
    setShowDialog(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">战略目标管理</h1>
          <p className="text-gray-500 mt-1">管理公司年度战略目标</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />新建战略目标</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新建战略目标</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>标题</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="战略目标标题" /></div>
              <div><Label>描述</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="详细描述" /></div>
              <div><Label>年度</Label><Input type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} /></div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.title}>创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : strategicObjectives.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">暂无战略目标</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {strategicObjectives.map((obj) => (
            <Card key={obj.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold text-lg">{obj.title}</span>
                      <Badge className={cn('text-xs', statusColors[obj.status])}>{statusLabels[obj.status]}</Badge>
                      <span className="text-sm text-gray-400">{obj.year}</span>
                    </div>
                    {obj.description && <p className="text-sm text-gray-600 ml-7">{obj.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateStrategicObjective(obj.id, { status: obj.status === 'active' ? 'completed' : 'active' })}>
                      {obj.status === 'active' ? '完成' : '激活'}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500" onClick={() => deleteStrategicObjective(obj.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
