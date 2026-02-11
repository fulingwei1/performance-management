import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, CheckCircle, Clock } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};
const statusLabels: Record<string, string> = { scheduled: '已安排', completed: '已完成', cancelled: '已取消' };

export function InterviewSchedule() {
  const { teamInterviews, fetchTeamInterviews, createInterview, updateInterview, loading } = useOKRStore();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ employeeId: '', scheduledAt: '', type: 'monthly' as const });

  useEffect(() => { fetchTeamInterviews(); }, [fetchTeamInterviews]);

  const handleCreate = async () => {
    if (!form.employeeId || !form.scheduledAt) return;
    await createInterview({ employeeId: form.employeeId, scheduledAt: form.scheduledAt, type: form.type });
    setForm({ employeeId: '', scheduledAt: '', type: 'monthly' });
    setShowDialog(false);
  };

  const handleComplete = async (id: string) => {
    await updateInterview(id, { status: 'completed', completedAt: new Date().toISOString() });
  };

  const scheduled = teamInterviews.filter(i => i.status === 'scheduled');
  const completed = teamInterviews.filter(i => i.status === 'completed');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">绩效面谈安排</h1>
          <p className="text-gray-500 mt-1">安排和管理下属绩效面谈</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />安排面谈</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>安排绩效面谈</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>员工ID</Label>
                <Input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} placeholder="输入员工ID" />
              </div>
              <div>
                <Label>面谈时间</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.employeeId || !form.scheduledAt}>确认安排</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">待面谈</p><p className="text-2xl font-bold text-blue-600">{scheduled.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">已完成</p><p className="text-2xl font-bold text-green-600">{completed.length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : teamInterviews.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">暂无面谈安排</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {teamInterviews.map(interview => (
            <Card key={interview.id} className={cn('border-l-4', interview.status === 'scheduled' ? 'border-l-blue-400' : 'border-l-green-400')}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {interview.status === 'scheduled' ? <Clock className="w-5 h-5 text-blue-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                    <div>
                      <span className="font-medium">{interview.employeeName || interview.employeeId}</span>
                      <p className="text-sm text-gray-500">{new Date(interview.scheduledAt).toLocaleString('zh-CN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', statusColors[interview.status])}>{statusLabels[interview.status]}</Badge>
                    {interview.status === 'scheduled' && (
                      <Button size="sm" variant="outline" onClick={() => handleComplete(interview.id)}>完成</Button>
                    )}
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
