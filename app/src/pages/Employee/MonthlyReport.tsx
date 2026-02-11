import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Clock, CheckCircle2, Send } from 'lucide-react';
import { useOKRStore, MonthlyReport as MonthlyReportType } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AttachmentUpload } from '@/components/AttachmentUpload';
import { format } from 'date-fns';

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600', icon: FileText },
  submitted: { label: '已提交', color: 'bg-blue-100 text-blue-700', icon: Send },
  reviewed: { label: '已审阅', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

export function MonthlyReport() {
  const { monthlyReports, fetchMyReports, createReport, loading } = useOKRStore();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    month: format(new Date(), 'yyyy-MM'),
    summary: '',
    achievements: [''],
    challenges: '',
    nextPlan: '',
  });

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  const handleSubmit = async () => {
    if (!form.summary || !form.month) return;
    await createReport({
      ...form,
      achievements: form.achievements.filter(a => a.trim()),
    });
    setForm({ month: format(new Date(), 'yyyy-MM'), summary: '', achievements: [''], challenges: '', nextPlan: '' });
    setShowDialog(false);
  };

  const addAchievement = () => setForm({ ...form, achievements: [...form.achievements, ''] });
  const updateAchievement = (idx: number, val: string) => {
    const a = [...form.achievements];
    a[idx] = val;
    setForm({ ...form, achievements: a });
  };

  const sorted = [...monthlyReports].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">月度汇报</h1>
          <p className="text-gray-500 mt-1">提交月度工作总结与计划</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" /> 新建汇报
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>新建月度汇报</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>月份</Label>
                <Input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} />
              </div>
              <div>
                <Label>工作总结</Label>
                <textarea className="w-full border rounded-md p-2 text-sm min-h-[80px]" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="本月主要工作内容..." />
              </div>
              <div>
                <Label>主要成果</Label>
                {form.achievements.map((a, i) => (
                  <Input key={i} className="mb-2" value={a} onChange={e => updateAchievement(i, e.target.value)} placeholder={`成果 ${i + 1}`} />
                ))}
                <Button variant="outline" size="sm" onClick={addAchievement}>+ 添加成果</Button>
              </div>
              <div>
                <Label>困难与挑战</Label>
                <textarea className="w-full border rounded-md p-2 text-sm min-h-[60px]" value={form.challenges} onChange={e => setForm({ ...form, challenges: e.target.value })} placeholder="遇到的困难..." />
              </div>
              <div>
                <Label>下月计划</Label>
                <textarea className="w-full border rounded-md p-2 text-sm min-h-[60px]" value={form.nextPlan} onChange={e => setForm({ ...form, nextPlan: e.target.value })} placeholder="下月工作计划..." />
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={!form.summary}>提交汇报</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">暂无月度汇报</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
          {sorted.map((report, idx) => {
            const status = statusMap[report.status] || statusMap.draft;
            const StatusIcon = status.icon;
            return (
              <div key={report.id} className="relative pl-14 pb-8">
                <div className={cn('absolute left-4 w-5 h-5 rounded-full flex items-center justify-center', report.status === 'reviewed' ? 'bg-green-500' : report.status === 'submitted' ? 'bg-blue-500' : 'bg-gray-300')}>
                  <StatusIcon className="w-3 h-3 text-white" />
                </div>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{report.month} 月度汇报</CardTitle>
                      <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">工作总结</h4>
                      <p className="text-sm text-gray-600 mt-1">{report.summary}</p>
                    </div>
                    {report.achievements && report.achievements.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">主要成果</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                          {report.achievements.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                    {report.challenges && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">困难与挑战</h4>
                        <p className="text-sm text-gray-600 mt-1">{report.challenges}</p>
                      </div>
                    )}
                    {report.nextPlan && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">下月计划</h4>
                        <p className="text-sm text-gray-600 mt-1">{report.nextPlan}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">证据附件</h4>
                      <AttachmentUpload relatedType="monthly-report" relatedId={report.id} />
                    </div>
                    {report.reviewComment && (
                      <div className="bg-green-50 rounded-lg p-3 mt-2">
                        <h4 className="text-sm font-medium text-green-700">经理点评</h4>
                        <p className="text-sm text-green-600 mt-1">{report.reviewComment}</p>
                        {report.reviewRating && <Badge className="mt-1 bg-green-100 text-green-700">评分：{report.reviewRating}/5</Badge>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
