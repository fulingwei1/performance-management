import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSignature, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600', icon: Clock },
  pending_sign: { label: '待签署', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  signed: { label: '已签署', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  approved: { label: '已审批', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

export function MyContract() {
  const { myContract, fetchMyContract, signContract, loading } = useOKRStore();

  useEffect(() => {
    fetchMyContract();
  }, [fetchMyContract]);

  const handleSign = async () => {
    if (myContract) {
      await signContract(myContract.id);
    }
  };

  const status = myContract ? (statusMap[myContract.status] || statusMap.draft) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">绩效合约</h1>
        <p className="text-gray-500 mt-1">查看和签署绩效合约</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : !myContract ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileSignature className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">暂无绩效合约</p>
            <p className="text-sm text-gray-400 mt-1">请等待经理/HR 发起绩效合约</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-blue-600" />
                {myContract.period} 绩效合约
              </CardTitle>
              {status && <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contract Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">员工：</span>
                <span className="font-medium">{myContract.employeeName}</span>
              </div>
              <div>
                <span className="text-gray-500">考核周期：</span>
                <span className="font-medium">{myContract.period}</span>
              </div>
              {myContract.signedAt && (
                <div>
                  <span className="text-gray-500">签署时间：</span>
                  <span className="font-medium">{new Date(myContract.signedAt).toLocaleDateString()}</span>
                </div>
              )}
              {myContract.approvedAt && (
                <div>
                  <span className="text-gray-500">审批时间：</span>
                  <span className="font-medium">{new Date(myContract.approvedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Objectives */}
            {myContract.objectives && myContract.objectives.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">绩效目标</h4>
                <div className="space-y-2">
                  {myContract.objectives.map((obj, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">{i + 1}</span>
                      {obj}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sign Button */}
            {myContract.status === 'pending_sign' && (
              <div className="pt-4 border-t">
                <Button onClick={handleSign} className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                  <FileSignature className="w-5 h-5 mr-2" />
                  签署绩效合约
                </Button>
                <p className="text-xs text-gray-400 text-center mt-2">签署后表示您已知悉并同意合约内容</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
