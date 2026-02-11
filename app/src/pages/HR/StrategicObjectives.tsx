import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Plus, Edit, Trash2 } from 'lucide-react';
import { useOKRStore, StrategicObjective } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-600' },
};

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
              <div className="grid grid-cols-2 gap-4">
                <div><Label>年份</Label><Input type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} /></div>
                <div><Label>优先级</Label><Input type="number" min={1} max={10} value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.title}>确认创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : strategicObjectives.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Crosshair className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">暂无战略目标</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategicObjectives.map(obj => {
            const status = statusMap[obj.status] || statusMap.active;
            return (
              <Card key={obj.id} className="border-t-4 border-t-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-blue-600" />
                      {obj.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>
                      <Badge variant="outline" className="text-xs">{obj.year}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">{obj.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <Progress value={obj.progress} className="flex-1 h-2" />
                    <span className="text-sm font-medium">{obj.progress}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>优先级：P{obj.priority}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => updateStrategicObjective(obj.id, { status: 'completed' })}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => deleteStrategicObjective(obj.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
