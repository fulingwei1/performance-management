import { useState } from 'react';
import type { PromotionRequest } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getLevelLabel } from '@/lib/config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusLabel: Record<PromotionRequest['status'], string> = {
  draft: '草稿',
  submitted: '待经理审批',
  manager_approved: '待总经理审批',
  gm_approved: '待HR审批',
  hr_approved: '已通过',
  rejected: '已拒绝'
};

const nextRoleLabel = (role: string) => {
  if (role === 'manager') return '待经理审批';
  if (role === 'gm') return '待总经理审批';
  if (role === 'hr') return '待HR审批';
  return '';
};

const getStatusLabel = (req: PromotionRequest) => {
  if (req.status === 'draft') return statusLabel.draft;
  if (req.status === 'rejected') return statusLabel.rejected;
  if (req.nextRole === null) return '已通过';
  if (req.nextRole) return nextRoleLabel(req.nextRole);
  return statusLabel[req.status];
};

const statusStyle: Record<PromotionRequest['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  manager_approved: 'bg-purple-100 text-purple-700',
  gm_approved: 'bg-amber-100 text-amber-700',
  hr_approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700'
};

interface PromotionApprovalsListProps {
  title: string;
  requests: PromotionRequest[];
  loading?: boolean;
  onApprove: (id: string, comment?: string) => Promise<boolean>;
  onReject: (id: string, reason: string) => Promise<boolean>;
}

export function PromotionApprovalsList({
  title,
  requests,
  loading = false,
  onApprove,
  onReject
}: PromotionApprovalsListProps) {
  const [comments, setComments] = useState<Record<string, string>>({});

  const handleApprove = async (id: string) => {
    const ok = await onApprove(id, comments[id] || '');
    if (ok) {
      toast.success('已通过审批');
    }
  };

  const handleReject = async (id: string) => {
    const reason = (comments[id] || '').trim();
    if (!reason) {
      toast.error('请填写拒绝原因');
      return;
    }
    const ok = await onReject(id, reason);
    if (ok) {
      toast.success('已拒绝申请');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 && (
          <div className="text-sm text-gray-500">暂无待审批申请</div>
        )}
        {requests.map((req) => (
          <div key={req.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-x-2">
                <span className="font-medium">{req.employeeName}</span>
                <span className="text-sm text-gray-500">{req.department || ''}</span>
              </div>
              <Badge className={cn('text-xs', statusStyle[req.status])}>
                {getStatusLabel(req)}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
              <div>当前职级：{req.employeeLevel ? getLevelLabel(req.employeeLevel) : '—'}</div>
              <div>目标职级：{getLevelLabel(req.targetLevel)}</div>
              <div>目标岗位：{req.targetPosition}</div>
              <div>调薪比例：{req.raisePercentage}%</div>
              <div>申请人：{req.requesterName || '—'}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
              <div>
                <div className="text-xs text-gray-400 mb-1">绩效考核数据</div>
                <div className="whitespace-pre-wrap">{req.performanceSummary}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">技能水平总结</div>
                <div className="whitespace-pre-wrap">{req.skillSummary}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">能力素质总结</div>
                <div className="whitespace-pre-wrap">{req.competencySummary}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">工作总结</div>
                <div className="whitespace-pre-wrap">{req.workSummary}</div>
              </div>
            </div>
            <Textarea
              placeholder="审批意见/拒绝原因"
              value={comments[req.id] || ''}
              onChange={(e) => setComments(prev => ({ ...prev, [req.id]: e.target.value }))}
              className="min-h-[80px]"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleApprove(req.id)} disabled={loading}>
                通过
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)} disabled={loading}>
                拒绝
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
