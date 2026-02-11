import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Save } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AttachmentUpload } from '@/components/AttachmentUpload';

export function MyKPI() {
  const { myKPIs, fetchMyKPIs, updateKPIActual, loading } = useOKRStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);

  useEffect(() => {
    fetchMyKPIs();
  }, [fetchMyKPIs]);

  const handleSave = async (id: string) => {
    await updateKPIActual(id, editValue);
    setEditingId(null);
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: '待提交', color: 'bg-yellow-100 text-yellow-700' },
    submitted: { label: '已提交', color: 'bg-blue-100 text-blue-700' },
    reviewed: { label: '已审核', color: 'bg-green-100 text-green-700' },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">我的 KPI</h1>
        <p className="text-gray-500 mt-1">查看和提交 KPI 实际值</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">KPI 总数</p>
                <p className="text-2xl font-bold">{myKPIs.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">已提交</p>
            <p className="text-2xl font-bold text-green-600">
              {myKPIs.filter(k => k.status !== 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">综合得分</p>
            <p className="text-2xl font-bold text-purple-600">
              {myKPIs.length > 0
                ? (myKPIs.reduce((s, k) => s + k.score * k.weight, 0) / myKPIs.reduce((s, k) => s + k.weight, 0) || 0).toFixed(1)
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">KPI 明细</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : myKPIs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无 KPI 数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>指标名称</TableHead>
                  <TableHead className="text-center">目标值</TableHead>
                  <TableHead className="text-center">实际值</TableHead>
                  <TableHead className="text-center">单位</TableHead>
                  <TableHead className="text-center">权重</TableHead>
                  <TableHead className="text-center">完成进度</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myKPIs.map(kpi => {
                  const progress = kpi.targetValue > 0 ? Math.min(100, (kpi.actualValue / kpi.targetValue) * 100) : 0;
                  const status = statusMap[kpi.status] || statusMap.pending;
                  return (
                    <TableRow key={kpi.id}>
                      <TableCell className="font-medium">{kpi.name}</TableCell>
                      <TableCell className="text-center">{kpi.targetValue}</TableCell>
                      <TableCell className="text-center">
                        {editingId === kpi.id ? (
                          <Input
                            type="number"
                            className="h-8 w-20 text-center mx-auto"
                            value={editValue}
                            onChange={e => setEditValue(Number(e.target.value))}
                            autoFocus
                          />
                        ) : (
                          <span className="cursor-pointer hover:text-blue-600" onClick={() => { setEditingId(kpi.id); setEditValue(kpi.actualValue); }}>
                            {kpi.actualValue || '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{kpi.unit}</TableCell>
                      <TableCell className="text-center">{kpi.weight}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="flex-1 h-2" />
                          <span className="text-xs">{progress.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === kpi.id ? (
                          <Button size="sm" onClick={() => handleSave(kpi.id)}>
                            <Save className="w-3 h-3 mr-1" /> 保存
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => { setEditingId(kpi.id); setEditValue(kpi.actualValue); }}>
                            提交实际值
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 证据附件 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">证据附件</CardTitle></CardHeader>
        <CardContent>
          <AttachmentUpload relatedType="kpi" relatedId="my-kpi" />
        </CardContent>
      </Card>
    </motion.div>
  );
}
