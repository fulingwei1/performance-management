import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, MessageCircle, CheckCircle2, Clock } from 'lucide-react';
import { useOKRStore, Interview } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const statusMap: Record<string, { label: string; color: string }> = {
  scheduled: { label: '已安排', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-600' },
};
const typeLabels: Record<string, string> = { monthly: '月度面谈', quarterly: '季度面谈', annual: '年度面谈' };

export function InterviewSchedule() {
  const { teamInterviews, fetchTeamInterviews, createInterview, updateInterview, loading } = useOKRStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showRecord, setShowRecord] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeId: '', scheduledAt: '', type: 'monthly' as Interview['type'] });
  const [record, setRecord] = useState({ summary: '', actionItems: [''] });

  useEffect(() => { fetchTeamInterviews(); }, [fetchTeamInterviews]);

  const handleCreate = async () => {
    if (!form.employeeId || !form.scheduledAt) return;
    await createInterview(form);
    setForm({ employeeId: '', scheduledAt: '', type: 'monthly' });
    setShowCreate(false);
  };

  const handleComplete = async () => {
    if (!showRecord || !record.summary) return;
    await updateInterview(showRecord, {
      summary: record.summary,
      actionItems: record.actionItems.filter(a => a.trim()),
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    setShowRecord(null);
    setRecord({ summary: '', actionItems: [''] });
  };

  const scheduled = teamInterviews.filter(i => i.status === 'scheduled').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const completed = teamInterviews.filter(i => i.status === 'completed');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">绩效面谈</h1>
          <p className="text-gray-500 mt-1">安排和记录绩效面谈</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
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
              <div>
                <Label>类型</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">月度面谈</SelectItem>
                    <SelectItem value="quarterly">季度面谈</SelectItem>
                    <SelectItem value="annual">年度面谈</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.employeeId || !form.scheduledAt}>确认安排</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> 待进行面谈 ({scheduled.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : scheduled.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无待进行面谈</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduled.map(interview => (
                  <TableRow key={interview.id}>
                    <TableCell className="font-medium">{interview.employeeName || interview.employeeId}</TableCell>
                    <TableCell>{typeLabels[interview.type]}</TableCell>
                    <TableCell>{new Date(interview.scheduledAt).toLocaleString()}</TableCell>
                    <TableCell><Badge className={statusMap[interview.status]?.color}>{statusMap[interview.status]?.label}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setShowRecord(interview.id); setRecord({ summary: '', actionItems: [''] }); }}>
                        <MessageCircle className="w-3 h-3 mr-1" /> 记录
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Completed */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" /> 已完成面谈 ({completed.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completed.map(interview => (
                <div key={interview.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{interview.employeeName || interview.employeeId}</span>
                      <Badge className="text-xs bg-gray-100 text-gray-600">{typeLabels[interview.type]}</Badge>
                    </div>
                    <span className="text-xs text-gray-400">{interview.completedAt ? new Date(interview.completedAt).toLocaleDateString() : ''}</span>
                  </div>
                  {interview.summary && <p className="text-sm text-gray-600">{interview.summary}</p>}
                  {interview.actionItems && interview.actionItems.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-500">行动项：</span>
                      <ul className="list-disc list-inside text-sm text-gray-500">
                        {interview.actionItems.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Dialog */}
      <Dialog open={!!showRecord} onOpenChange={() => setShowRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>面谈记录</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>面谈总结</Label>
              <textarea className="w-full border rounded-md p-2 text-sm min-h-[100px]" value={record.summary} onChange={e => setRecord({ ...record, summary: e.target.value })} placeholder="记录面谈要点..." />
            </div>
            <div>
              <Label>行动项</Label>
              {record.actionItems.map((a, i) => (
                <Input key={i} className="mb-2" value={a} onChange={e => { const items = [...record.actionItems]; items[i] = e.target.value; setRecord({ ...record, actionItems: items }); }} placeholder={`行动项 ${i + 1}`} />
              ))}
              <Button variant="outline" size="sm" onClick={() => setRecord({ ...record, actionItems: [...record.actionItems, ''] })}>+ 添加行动项</Button>
            </div>
            <Button onClick={handleComplete} className="w-full" disabled={!record.summary}>完成面谈</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
