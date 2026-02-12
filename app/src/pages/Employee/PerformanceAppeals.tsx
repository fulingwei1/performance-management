import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Plus, CheckCircle2, XCircle, Clock, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Appeal {
  id: string;
  performanceRecordId: string;
  employeeId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  hrComment?: string;
  hrId?: string;
  createdAt: string;
  updatedAt: string;
}

interface PerformanceRecord {
  id: string;
  month: string;
  totalScore: number;
  level: string;
  status: string;
}

export function EmployeePerformanceAppeals() {
  const { user } = useAuthStore();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNewAppealDialog, setShowNewAppealDialog] = useState(false);
  
  // 新申诉表单数据
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchAppeals();
    fetchPerformanceRecords();
  }, []);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const response = await api.appeal.getMyAppeals();
      if (response.success) {
        setAppeals(response.data || []);
      }
    } catch (error) {
      console.error('获取申诉列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceRecords = async () => {
    try {
      const response = await api.performance.getMyRecords();
      if (response.success) {
        // 只显示已完成的考核记录
        const completedRecords = response.data?.filter(
          (r: PerformanceRecord) => r.status === 'completed' || r.status === 'scored'
        ) || [];
        setPerformanceRecords(completedRecords);
      }
    } catch (error) {
      console.error('获取考核记录失败:', error);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!selectedRecordId || !reason || reason.length < 10) {
      alert('请选择考核记录并填写申诉理由（至少10个字符）');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.appeal.create({
        performanceRecordId: selectedRecordId,
        reason
      });

      if (response.success) {
        alert('申诉提交成功');
        setShowNewAppealDialog(false);
        setSelectedRecordId('');
        setReason('');
        fetchAppeals();
      }
    } catch (error: any) {
      console.error('提交申诉失败:', error);
      alert(error.message || '提交申诉失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />待处理</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />已批准</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />已拒绝</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRecordMonth = (recordId: string) => {
    const record = performanceRecords.find(r => r.id === recordId);
    return record?.month || '未知';
  };

  // 过滤可申诉的考核记录（未有待处理申诉的）
  const getAvailableRecords = () => {
    const pendingAppealRecords = appeals
      .filter(a => a.status === 'pending')
      .map(a => a.performanceRecordId);
    
    return performanceRecords.filter(r => !pendingAppealRecords.includes(r.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">绩效申诉</h1>
          <p className="text-gray-500 mt-2">对考核结果提出申诉</p>
        </div>
        <Button onClick={() => setShowNewAppealDialog(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          提交新申诉
        </Button>
      </div>

      {/* 申诉列表 */}
      {appeals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">暂无申诉记录</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appeals.map((appeal, index) => (
            <motion.div
              key={appeal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {getRecordMonth(appeal.performanceRecordId)} 考核申诉
                      </CardTitle>
                      {getStatusBadge(appeal.status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      提交于 {format(new Date(appeal.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">申诉理由</Label>
                    <p className="mt-2 text-gray-700 whitespace-pre-wrap">{appeal.reason}</p>
                  </div>
                  
                  {appeal.hrComment && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <Label className="text-sm font-semibold text-blue-900">HR反馈</Label>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{appeal.hrComment}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        处理于 {format(new Date(appeal.updatedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* 提交新申诉对话框 */}
      <Dialog open={showNewAppealDialog} onOpenChange={setShowNewAppealDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>提交绩效申诉</DialogTitle>
            <DialogDescription>
              请选择要申诉的考核记录，并详细说明申诉理由
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="record">选择考核记录</Label>
              <Select value={selectedRecordId} onValueChange={setSelectedRecordId}>
                <SelectTrigger id="record">
                  <SelectValue placeholder="选择考核记录" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRecords().map((record) => (
                    <SelectItem key={record.id} value={record.id}>
                      {record.month} - 总分: {record.totalScore} - 等级: {record.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">申诉理由（至少10个字符）</Label>
              <Textarea
                id="reason"
                placeholder="请详细说明您的申诉理由..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={6}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                已输入 {reason.length} 个字符
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAppealDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitAppeal} disabled={submitting}>
              {submitting ? '提交中...' : '提交申诉'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
