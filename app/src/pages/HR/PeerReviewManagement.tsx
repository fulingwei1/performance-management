import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { peerReviewCycleApi } from '@/services/okrApi';
import { employeeApi } from '@/services/api';
import { toast } from 'sonner';

export function PeerReviewManagement() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [reviewsPerPerson, setReviewsPerPerson] = useState(4); // 每人评价数量，默认4个
  const [results, setResults] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');

  useEffect(() => {
    loadCycles();
    loadEmployees();
  }, []);

  const loadCycles = async () => {
    try {
      const res = await peerReviewCycleApi.getCycles();
      if (res.success) setCycles(res.data || []);
    } catch { /* ignore */ }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeeApi.getAll();
      if (res.success) setEmployees(res.data || []);
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    try {
      await peerReviewCycleApi.createCycle({
        title, year, quarter, startDate, endDate,
        participants: selectedParticipants,
        reviewsPerPerson,
      });
      setShowCreate(false);
      loadCycles();
      toast.success(`互评周期已创建，每人随机分配${reviewsPerPerson}个评价任务`);
    } catch { toast.error('创建失败'); }
  };

  const handleViewResults = async (cycleId: string) => {
    setSelectedCycleId(cycleId);
    try {
      const res = await peerReviewCycleApi.getResults(cycleId);
      if (res.success) setResults(res.data || []);
    } catch { /* ignore */ }
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" /> 360互评管理
        </h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> 创建互评周期
        </Button>
      </div>

      <Tabs defaultValue="cycles">
        <TabsList>
          <TabsTrigger value="cycles">互评周期</TabsTrigger>
          <TabsTrigger value="results">评分结果</TabsTrigger>
        </TabsList>

        <TabsContent value="cycles">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>年份/季度</TableHead>
                    <TableHead>时间范围</TableHead>
                    <TableHead>参与人数</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycles.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell>{c.year}Q{c.quarter}</TableCell>
                      <TableCell>{c.startDate} ~ {c.endDate}</TableCell>
                      <TableCell>{c.participants?.length || 0}人</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                          {c.status === 'active' ? '进行中' : c.status === 'completed' ? '已完成' : '草稿'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleViewResults(c.id)}>
                          <BarChart3 className="w-3 h-3 mr-1" /> 查看结果
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {cycles.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">暂无互评周期</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader><CardTitle>互评结果汇总</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!selectedCycleId ? (
                <div className="text-center text-gray-400 py-8">请在"互评周期"Tab中点击"查看结果"</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>被评人</TableHead>
                      <TableHead>收到评价数</TableHead>
                      <TableHead>平均分</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(r => (
                      <TableRow key={r.revieweeId}>
                        <TableCell className="font-medium">{r.revieweeName}</TableCell>
                        <TableCell>{r.scores?.length || 0}</TableCell>
                        <TableCell>
                          <Badge className={r.avgScore >= 4 ? 'bg-green-100 text-green-700' : r.avgScore >= 3 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>
                            {r.avgScore}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {results.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-gray-400 py-8">暂无结果</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建互评周期</DialogTitle>
          </DialogHeader>
          
          {/* 说明卡片 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-blue-900">
                <strong>随机匿名互评</strong>：系统将为每位参与者随机分配N个同事进行评价，被评价者看不到是谁评的。
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div><Label>标题</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：2026Q1互评" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>年份</Label><Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} /></div>
              <div><Label>季度</Label><Input type="number" min={1} max={4} value={quarter} onChange={e => setQuarter(Number(e.target.value))} /></div>
              <div>
                <Label className="flex items-center gap-1">
                  每人评价数
                  <span className="text-xs text-gray-400 font-normal">（随机）</span>
                </Label>
                <Input 
                  type="number" 
                  min={1} 
                  max={10} 
                  value={reviewsPerPerson} 
                  onChange={e => setReviewsPerPerson(Number(e.target.value))}
                  placeholder="推荐3-5个" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>开始日期</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><Label>结束日期</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <div>
              <Label>参与人员 (已选{selectedParticipants.length}人)</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 mt-1 space-y-1">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(emp.id)}
                      onChange={() => toggleParticipant(emp.id)}
                    />
                    {emp.name} - {emp.department}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!title || selectedParticipants.length < 2}>创建</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
