import { useEffect, useMemo, useState } from 'react';
import { usePromotionStore } from '@/stores/promotionStore';
import { PromotionApprovalsList } from '@/components/promotion/PromotionApprovalsList';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/stores/authStore';
import { settingsApi, promotionApi } from '@/services/api';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext
} from '@/components/ui/pagination';
import { getLevelLabel } from '@/lib/config';
import { toast } from 'sonner';

interface PromotionApprovalsPageProps {
  title?: string;
}

export function PromotionApprovalsPage({ title = '晋升/加薪审批' }: PromotionApprovalsPageProps) {
  const { user } = useAuthStore();
  const {
    pendingRequests,
    approvalHistory,
    historyPage,
    historyPageSize,
    historyTotal,
    loading,
    fetchPendingRequests,
    fetchHistory,
    approveRequest,
    rejectRequest
  } = usePromotionStore();
  const [chainRoles, setChainRoles] = useState<string[]>([]);
  const [savingChain, setSavingChain] = useState(false);

  const getStatusLabel = (record: { status: string; nextRole?: string | null }) => {
    if (record.status === 'draft') return '草稿';
    if (record.status === 'rejected') return '已拒绝';
    if (record.nextRole === null) return '已通过';
    if (record.nextRole === 'manager') return '待经理审批';
    if (record.nextRole === 'gm') return '待总经理审批';
    if (record.nextRole === 'hr') return '待HR审批';
    if (record.status === 'hr_approved') return '已通过';
    if (record.status === 'gm_approved') return '待HR审批';
    if (record.status === 'manager_approved') return '待总经理审批';
    if (record.status === 'submitted') return '待经理审批';
    return record.status;
  };

  useEffect(() => {
    fetchPendingRequests();
    fetchHistory(1, historyPageSize);
  }, [fetchPendingRequests, fetchHistory, historyPageSize]);

  useEffect(() => {
    if (user?.role !== 'hr') return;
    settingsApi.getPromotionApprovalChain()
      .then((res) => {
        setChainRoles(res.data?.chain || []);
      })
      .catch((error: any) => {
        toast.error(error.message || '获取审批链失败');
      });
  }, [user?.role]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(historyTotal / historyPageSize)),
    [historyTotal, historyPageSize]
  );

  const handleSaveChain = async () => {
    if (chainRoles.length === 0) {
      toast.error('审批链至少需要一个角色');
      return;
    }
    setSavingChain(true);
    try {
      const res = await settingsApi.updatePromotionApprovalChain(chainRoles);
      setChainRoles(res.data?.chain || chainRoles);
      toast.success('审批链已更新');
    } catch (error: any) {
      toast.error(error.message || '审批链更新失败');
    } finally {
      setSavingChain(false);
    }
  };

  const toggleRole = (role: string) => {
    const order = ['manager', 'gm', 'hr'];
    const current = new Set(chainRoles);
    if (current.has(role)) {
      current.delete(role);
    } else {
      current.add(role);
    }
    const next = order.filter(r => current.has(r));
    setChainRoles(next);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <Button onClick={() => promotionApi.exportRecords('excel')} disabled={loading}>
            导出审批记录
          </Button>
        </CardHeader>
      </Card>

      {user?.role === 'hr' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">审批链配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-500">
              审批顺序固定为：经理 → 总经理 → HR，可按需关闭某个环节。
            </div>
            <div className="flex flex-wrap items-center gap-6">
              {[
                { key: 'manager', label: '经理审批' },
                { key: 'gm', label: '总经理审批' },
                { key: 'hr', label: 'HR审批' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={chainRoles.includes(item.key)}
                    onCheckedChange={() => toggleRole(item.key)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <Button onClick={handleSaveChain} disabled={savingChain}>
              保存审批链
            </Button>
          </CardContent>
        </Card>
      )}

      <PromotionApprovalsList
        title="待审批申请"
        requests={pendingRequests}
        loading={loading}
        onApprove={approveRequest}
        onReject={rejectRequest}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">审批历史</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvalHistory.length === 0 && (
            <div className="text-sm text-gray-500">暂无历史记录</div>
          )}
          {approvalHistory.map(record => (
            <div key={record.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="font-medium">
                  {record.employeeName} → {getLevelLabel(record.targetLevel)}
                </div>
                <div className="text-sm text-gray-500">
                  目标岗位：{record.targetPosition} · 调薪 {record.raisePercentage}%
                </div>
              </div>
              <Badge variant="outline">
                {getStatusLabel(record)}
              </Badge>
            </div>
          ))}
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (historyPage > 1) fetchHistory(historyPage - 1, historyPageSize);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-sm text-gray-500 px-3">
                  第 {historyPage} / {totalPages} 页
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (historyPage < totalPages) fetchHistory(historyPage + 1, historyPageSize);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
    </div>
  );
}
