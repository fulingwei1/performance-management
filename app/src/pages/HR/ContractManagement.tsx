import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSignature, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
  pending_sign: { label: '待签署', color: 'bg-yellow-100 text-yellow-700' },
  signed: { label: '已签署', color: 'bg-blue-100 text-blue-700' },
  approved: { label: '已审批', color: 'bg-green-100 text-green-700' },
};

export function ContractManagement() {
  const { allContracts, fetchAllContracts, loading } = useOKRStore();

  useEffect(() => { fetchAllContracts(); }, [fetchAllContracts]);

  const stats = {
    total: allContracts.length,
    pending: allContracts.filter(c => c.status === 'pending_sign').length,
    signed: allContracts.filter(c => c.status === 'signed').length,
    approved: allContracts.filter(c => c.status === 'approved').length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">绩效合约管理</h1>
        <p className="text-gray-500 mt-1">追踪所有员工绩效合约状态</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">总数</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">待签署</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">已签署</p><p className="text-2xl font-bold text-blue-600">{stats.signed}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">已审批</p><p className="text-2xl font-bold text-green-600">{stats.approved}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileSignature className="w-5 h-5 text-blue-600" />合约列表</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : allContracts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无合约数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工</TableHead>
                  <TableHead>考核周期</TableHead>
                  <TableHead>目标数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>签署时间</TableHead>
                  <TableHead>审批时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allContracts.map(c => {
                  const status = statusMap[c.status] || statusMap.draft;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.employeeName}</TableCell>
                      <TableCell>{c.period}</TableCell>
                      <TableCell>{c.objectives?.length || 0}</TableCell>
                      <TableCell><Badge className={cn('text-xs', status.color)}>{status.label}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-500">{c.signedAt ? new Date(c.signedAt).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500">{c.approvedAt ? new Date(c.approvedAt).toLocaleDateString() : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
