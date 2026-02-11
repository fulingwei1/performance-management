import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { performanceApi } from '@/services/api';

interface DeleteRecordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: string;
  realCurrentMonth: string;
  onDeleted: () => void;
}

export function DeleteRecordsDialog({ open, onOpenChange, currentMonth, realCurrentMonth, onDeleted }: DeleteRecordsDialogProps) {
  const [deleteMonth, setDeleteMonth] = useState(currentMonth);
  const [deleteMonthConfirm, setDeleteMonthConfirm] = useState('');
  const [ackPastDelete, setAckPastDelete] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');
  const [ackDeleteAll, setAckDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPastDeleteMonth = deleteMonth < realCurrentMonth;

  const handleDeleteMonth = async () => {
    setDeleting(true);
    try {
      const response = await performanceApi.deleteRecordsByMonth(deleteMonth, {
        confirm: deleteMonthConfirm,
        force: isPastDeleteMonth ? ackPastDelete : false
      });
      if (response.success) {
        alert(response.message || '删除成功');
        onDeleted();
        onOpenChange(false);
      } else {
        throw new Error(response.error || '删除失败');
      }
    } catch (error: any) {
      alert('删除失败: ' + (error.message || '未知错误'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const response = await performanceApi.deleteAllRecords({
        confirm: deleteAllConfirm,
        force: ackDeleteAll
      });
      if (response.success) {
        alert(response.message || '删除成功');
        onDeleted();
        onOpenChange(false);
      } else {
        throw new Error(response.error || '删除失败');
      }
    } catch (error: any) {
      alert('删除失败: ' + (error.message || '未知错误'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-red-600">删除绩效记录（不可恢复）</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          {/* Delete by month */}
          <div className="rounded-lg border border-gray-200 p-4 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">删除指定月份</h3>
              <span className="text-xs text-gray-500">会删除该月所有员工绩效记录</span>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <Label>月份</Label>
                <Input type="month" value={deleteMonth} onChange={(e) => {
                  setDeleteMonth(e.target.value);
                  setDeleteMonthConfirm('');
                  setAckPastDelete(false);
                }} />
              </div>
              {isPastDeleteMonth && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p className="font-medium">正在删除历史月份数据，删除后无法恢复。</p>
                  <div className="mt-2 flex items-start gap-2">
                    <Checkbox checked={ackPastDelete} onCheckedChange={(v) => setAckPastDelete(Boolean(v))} id="ack-past" />
                    <label htmlFor="ack-past" className="text-sm leading-tight">我已知晓删除历史记录不可恢复</label>
                  </div>
                </div>
              )}
              <div>
                <Label>确认输入</Label>
                <Input placeholder="请输入要删除的月份（例如：2026-02）" value={deleteMonthConfirm} onChange={(e) => setDeleteMonthConfirm(e.target.value.trim())} />
                <p className="text-xs text-gray-500 mt-1">需输入完全一致的月份才可删除</p>
              </div>
              <Button variant="destructive" className="w-full" onClick={handleDeleteMonth}
                disabled={deleting || deleteMonthConfirm !== deleteMonth || (isPastDeleteMonth && !ackPastDelete)}>
                {deleting ? '删除中...' : `删除 ${deleteMonth} 的全部记录`}
              </Button>
            </div>
          </div>

          {/* Delete all */}
          <div className="rounded-lg border border-red-200 p-4 bg-red-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-red-700">删除全部绩效记录</h3>
              <span className="text-xs text-red-600">高危操作</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="text-sm text-red-700">将删除系统内全部绩效评价记录（所有月份）。删除后无法恢复。</div>
              <div>
                <Label>确认输入</Label>
                <Input placeholder='请输入 "DELETE ALL"' value={deleteAllConfirm} onChange={(e) => setDeleteAllConfirm(e.target.value)} />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox checked={ackDeleteAll} onCheckedChange={(v) => setAckDeleteAll(Boolean(v))} id="ack-all" />
                <label htmlFor="ack-all" className="text-sm text-red-700 leading-tight">我已知晓删除全部记录不可恢复</label>
              </div>
              <Button variant="destructive" className="w-full" onClick={handleDeleteAll}
                disabled={deleting || !ackDeleteAll || deleteAllConfirm !== 'DELETE ALL'}>
                {deleting ? '删除中...' : '删除全部绩效记录'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
