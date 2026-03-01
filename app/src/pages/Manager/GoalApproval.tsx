import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Eye, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PendingGoal {
  id: string;
  title: string;
  description: string;
  weight: number;
  startDate: string;
  endDate: string;
  targetValue?: string;
  ownerName?: string;
  ownerDepartment?: string;
  ownerSubDepartment?: string;
  level: string;
  createdAt: string;
  status: string;
}

type ActionType = 'approve' | 'reject' | 'view';

export default function GoalApproval() {
  const { token } = useAuthStore();
  const [goals, setGoals] = useState<PendingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<PendingGoal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('view');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingGoals();
  }, []);

  const fetchPendingGoals = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/goal-approval/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setGoals(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch pending goals:', error);
      toast.error(error.response?.data?.message || '获取待审批目标失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (goal: PendingGoal, type: ActionType) => {
    setSelectedGoal(goal);
    setActionType(type);
    setComment('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedGoal) return;

    if (actionType === 'reject' && !comment.trim()) {
      toast.error('请填写拒绝原因');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = actionType === 'approve' ? 'approve' : 'reject';
      
      await axios.post(
        `${API_URL}/api/goal-approval/${endpoint}`,
        {
          objectiveId: selectedGoal.id,
          comment: comment.trim() || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(actionType === 'approve' ? '目标已批准' : '目标已拒绝');
      setDialogOpen(false);
      fetchPendingGoals();
    } catch (error: any) {
      console.error(`Failed to ${actionType} goal:`, error);
      toast.error(error.response?.data?.message || `${actionType === 'approve' ? '批准' : '拒绝'}目标失败`);
    } finally {
      setSubmitting(false);
    }
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      strategic: 'bg-purple-100 text-purple-800',
      company: 'bg-blue-100 text-blue-800',
      department: 'bg-green-100 text-green-800',
      team: 'bg-yellow-100 text-yellow-800',
      individual: 'bg-gray-100 text-gray-800'
    };
    
    const labels: Record<string, string> = {
      strategic: '战略级',
      company: '公司级',
      department: '部门级',
      team: '团队级',
      individual: '个人级'
    };

    return (
      <Badge className={colors[level] || 'bg-gray-100 text-gray-800'}>
        {labels[level] || level}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">目标审批</h1>
          <p className="text-muted-foreground mt-2">
            审批下属提交的目标，确保目标符合团队和公司战略
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{goals.length}</div>
          <div className="text-sm text-muted-foreground">待审批</div>
        </div>
      </div>

      {goals.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg">暂无待审批目标</p>
            <p className="text-sm mt-2">所有目标都已处理完成</p>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>员工</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>目标标题</TableHead>
                <TableHead>级别</TableHead>
                <TableHead className="text-center">权重</TableHead>
                <TableHead>目标值</TableHead>
                <TableHead>截止日期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell className="font-medium">
                    {goal.ownerName || '未知'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {goal.ownerDepartment}
                      {goal.ownerSubDepartment && (
                        <div className="text-xs text-muted-foreground">
                          {goal.ownerSubDepartment}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium truncate">{goal.title}</div>
                      {goal.description && (
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {goal.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getLevelBadge(goal.level)}</TableCell>
                  <TableCell className="text-center">{goal.weight}%</TableCell>
                  <TableCell>{goal.targetValue || '-'}</TableCell>
                  <TableCell>
                    {goal.endDate ? new Date(goal.endDate).toLocaleDateString('zh-CN') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction(goal, 'view')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAction(goal, 'approve')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        批准
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(goal, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        拒绝
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 审批对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'view' && '查看目标详情'}
              {actionType === 'approve' && '批准目标'}
              {actionType === 'reject' && '拒绝目标'}
            </DialogTitle>
            <DialogDescription>
              {selectedGoal?.ownerName} 的目标
            </DialogDescription>
          </DialogHeader>

          {selectedGoal && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">目标标题</label>
                <p className="mt-1 text-sm">{selectedGoal.title}</p>
              </div>

              <div>
                <label className="text-sm font-medium">目标描述</label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedGoal.description || '无描述'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">级别</label>
                  <div className="mt-1">{getLevelBadge(selectedGoal.level)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">权重</label>
                  <p className="mt-1 text-sm">{selectedGoal.weight}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">开始日期</label>
                  <p className="mt-1 text-sm">
                    {selectedGoal.startDate 
                      ? new Date(selectedGoal.startDate).toLocaleDateString('zh-CN')
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">截止日期</label>
                  <p className="mt-1 text-sm">
                    {selectedGoal.endDate 
                      ? new Date(selectedGoal.endDate).toLocaleDateString('zh-CN')
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedGoal.targetValue && (
                <div>
                  <label className="text-sm font-medium">目标值</label>
                  <p className="mt-1 text-sm">{selectedGoal.targetValue}</p>
                </div>
              )}

              {actionType !== 'view' && (
                <div>
                  <label className="text-sm font-medium">
                    {actionType === 'approve' ? '备注（可选）' : '拒绝原因（必填）'}
                  </label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      actionType === 'approve'
                        ? '如有需要，可以添加审批备注...'
                        : '请说明拒绝的原因，帮助员工改进目标...'
                    }
                    className="mt-1"
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              {actionType === 'view' ? '关闭' : '取消'}
            </Button>
            {actionType !== 'view' && (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                variant={actionType === 'approve' ? 'default' : 'destructive'}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {actionType === 'approve' ? '确认批准' : '确认拒绝'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
