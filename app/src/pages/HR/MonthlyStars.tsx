import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Award, Calendar, RefreshCcw, Star } from 'lucide-react';
import { performanceApi } from '@/services/api';
import { PerformanceRecord } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { toast } from 'sonner';

export default function MonthlyStars() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await performanceApi.getMonthlyStars(month);
      if (response.success) {
        setRecords(response.data || []);
      } else {
        toast.error(response.error || response.message || '获取每月之星推荐失败');
      }
    } catch (error: any) {
      toast.error(error.message || '获取每月之星推荐失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month]);

  const publicCount = records.filter((record) => record.monthlyStarPublic !== false).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">每月之星</h1>
          <p className="text-gray-500 mt-1">汇总经理在打绩效时顺手推荐的候选人，HR 可用于月度评选。</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="pl-9 w-48" />
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">推荐总数</p>
                <p className="text-3xl font-bold">{records.length}</p>
              </div>
              <Award className="w-9 h-9 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">公示候选</p>
                <p className="text-3xl font-bold">{publicCount}</p>
              </div>
              <Star className="w-9 h-9 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">推荐口径</p>
            <p className="mt-2 text-sm text-gray-700">部门负责人每月推荐，需有具体事例或贡献说明。</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{month} 推荐明细</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>员工</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>推荐类型</TableHead>
                  <TableHead>综合得分</TableHead>
                  <TableHead>推荐理由</TableHead>
                  <TableHead>经理</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employeeName || record.employeeId}</TableCell>
                    <TableCell>{[record.department, record.subDepartment].filter(Boolean).join(' / ') || '-'}</TableCell>
                    <TableCell><Badge className="bg-purple-100 text-purple-700">{record.monthlyStarCategory || '未分类'}</Badge></TableCell>
                    <TableCell><ScoreDisplay score={record.totalScore || 0} showLabel={false} size="sm" /></TableCell>
                    <TableCell className="max-w-xl whitespace-pre-wrap text-sm text-gray-700">{record.monthlyStarReason || '-'}</TableCell>
                    <TableCell>{record.assessorName || record.assessorId}</TableCell>
                    <TableCell>{record.monthlyStarPublic === false ? <Badge variant="outline">内部草稿</Badge> : <Badge>公示候选</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {records.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              <Award className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              暂无经理推荐
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
