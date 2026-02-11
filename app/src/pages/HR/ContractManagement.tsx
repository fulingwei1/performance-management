import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileCheck, Users } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', pending_sign: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700',
  pending_employee: 'bg-yellow-100 text-yellow-700', pending_manager: 'bg-orange-100 text-orange-700',
};
const statusLabels: Record<string, string> = {
  draft: '草稿', pending_sign: '待签署', signed: '已签署', approved: '已审批',
  pending_employee: '待员工签署', pending_manager: '待经理签署',
};

export function ContractManagement() {
  const { allContracts, fetchAllContracts, loading } = useOKRStore();

  useEffect(() => { fetchAllContracts(); }, [fetchAllContracts]);

  const stats = {
    total: allContracts.length,
    signed: allContracts.filter(c => c.status === 'signed' || c.status === 'approved').length,
    pending: allContracts.filter(c => c.status !== 'signed' && c.status !== 'approved' && c.status !== 'draft').length,
    draft: allContracts.filter(c => c.status === 'draft').length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">绩效合约管理</h1>
        <p className="text-gray-500 mt-1">追踪全公司绩效合约签署状态</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">总计</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">已签署</p><p className="text-2xl font-bold text-green-600">{stats.signed}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">待签署</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">草稿</p><p className="text-2xl font-bold text-gray-400">{stats.draft}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : allContracts.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">暂无绩效合约</p>
        </CardContent></Card>
      ) : (
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">员工</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">周期</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {allContracts.map(contract => (
                <tr key={contract.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{contract.employeeName || contract.employeeId}</td>
                  <td className="py-3 px-4 text-sm">{contract.period}</td>
                  <td className="py-3 px-4"><Badge className={cn('text-xs', statusColors[contract.status])}>{statusLabels[contract.status] || contract.status}</Badge></td>
                  <td className="py-3 px-4 text-sm text-gray-500">{contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('zh-CN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
