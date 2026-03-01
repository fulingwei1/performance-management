import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';

interface Appeal {
  id: string;
  performanceRecordId: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  hrComment?: string;
  hrId?: string;
  createdAt: string;
  updatedAt: string;
}

export function AppealsReview() {
  const { user } = useAuthStore();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [hrComment, setHrComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAppeals(); }, []);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const response = await api.appeal.getAll();
      if (response.success) {
        setAppeals(response.data || []);
      }
    } catch (error) {
      console.error('获取申诉列表失败:', error);
      toast.error('获取申诉列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewDialog = (appeal: Appeal, status: 'approved' | 'rejected') => {
    setSelectedAppeal(appeal);
    setReviewStatus(status);
    setHrComment('');
    setShowReviewDialog(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedAppeal || !hrComment) {
      toast.error('请填写处理意见');
      return;
    }
    try {
      setSubmitting(true);
      const response = await api.appeal.review(selectedAppeal.id, { status: reviewStatus, hrComment });
      if (response.success) {
        toast.success('申诉处理成功');
        setShowReviewDialog(false);
        fetchAppeals();
      }
    } catch (error: any) {
      toast.error(error.message || '处理申诉失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />待处理</Badge>;
      case 'approved': return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />已批准</Badge>;
      case 'rejected': return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />已拒绝</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const pendingAppeals = appeals.filter(a => a.status === 'pending');
  const processedAppeals = appeals.filter(a => a.status !== 'pending');

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg text-gray-500">加载中...</div></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertCircle className="w-8 h-8" />下属申诉审核
        </h1>
        <p className="text-gray-500 mt-2">审核下属员工的绩效申诉</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">待处理</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-yellow-600">{pendingAppeals.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">已批准</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{appeals.filter(a => a.status === 'approved').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">已拒绝</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{appeals.filter(a => a.status === 'rejected').length}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending"><Clock className="w-4 h-4 mr-1" />待处理 ({pendingAppeals.length})</TabsTrigger>
          <TabsTrigger value="processed"><FileText className="w-4 h-4 mr-1" />已处理 ({processedAppeals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card><CardContent className="p-0">
            {pendingAppeals.length === 0 ? (
              <div className="text-center py-12"><CheckCircle2 className="w-12 h-12 mx-auto text-gray-400 mb-4" /><p className="text-gray-500">暂无待处理申诉</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>员工</TableHead><TableHead>部门</TableHead><TableHead className="max-w-xs">申诉理由</TableHead><TableHead>提交时间</TableHead><TableHead>操作</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pendingAppeals.map((appeal) => (
                    <TableRow key={appeal.id}>
                      <TableCell className="font-medium">{appeal.employeeName || appeal.employeeId}</TableCell>
                      <TableCell>{appeal.department || '-'}</TableCell>
                      <TableCell className="max-w-xs"><div className="text-sm text-gray-600 line-clamp-2">{appeal.reason}</div></TableCell>
                      <TableCell><div className="text-sm">{format(new Date(appeal.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</div></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleOpenReviewDialog(appeal, 'approved')}><CheckCircle2 className="w-3 h-3 mr-1" />批准</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleOpenReviewDialog(appeal, 'rejected')}><XCircle className="w-3 h-3 mr-1" />拒绝</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="processed">
          <Card><CardContent className="p-0">
            {processedAppeals.length === 0 ? (
              <div className="text-center py-12"><FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" /><p className="text-gray-500">暂无已处理申诉</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>员工</TableHead><TableHead>部门</TableHead><TableHead>状态</TableHead><TableHead className="max-w-xs">处理意见</TableHead><TableHead>处理时间</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {processedAppeals.map((appeal) => (
                    <TableRow key={appeal.id}>
                      <TableCell className="font-medium">{appeal.employeeName || appeal.employeeId}</TableCell>
                      <TableCell>{appeal.department || '-'}</TableCell>
                      <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                      <TableCell className="max-w-xs"><div className="text-sm text-gray-600 line-clamp-2">{appeal.hrComment}</div></TableCell>
                      <TableCell><div className="text-sm">{format(new Date(appeal.updatedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{reviewStatus === 'approved' ? '批准申诉' : '拒绝申诉'}</DialogTitle>
            <DialogDescription>请填写处理意见</DialogDescription>
          </DialogHeader>
          {selectedAppeal && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-600">员工：</span><span className="font-medium">{selectedAppeal.employeeName || selectedAppeal.employeeId}</span></div>
              </div>
              <div>
                <Label className="text-sm font-semibold">申诉理由</Label>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg"><p className="text-gray-700 whitespace-pre-wrap">{selectedAppeal.reason}</p></div>
              </div>
              <div>
                <Label htmlFor="managerComment">处理意见</Label>
                <Textarea id="managerComment" placeholder="请填写您的处理意见..." value={hrComment} onChange={(e) => setHrComment(e.target.value)} rows={6} className="mt-2" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>取消</Button>
            <Button onClick={handleSubmitReview} disabled={submitting || !hrComment} className={reviewStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''} variant={reviewStatus === 'rejected' ? 'destructive' : 'default'}>
              {submitting ? '提交中...' : (reviewStatus === 'approved' ? '确认批准' : '确认拒绝')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
