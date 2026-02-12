import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Calendar, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { performanceApi } from '@/services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface FrozenTask {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  month: string;
  deadline: string;
  status: string;
  frozen: boolean;
}

export function TaskFreezeManagement() {
  const [frozenTasks, setFrozenTasks] = useState<FrozenTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [unfreezing, setUnfreezing] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState({ total: 0, frozen: 0, overdue: 0 });

  useEffect(() => {
    loadFrozenTasks();
  }, [selectedMonth]);

  const loadFrozenTasks = async () => {
    setLoading(true);
    try {
      // 获取所有绩效记录
      const response = await performanceApi.getByMonth(selectedMonth);
      
      if (response.success && response.data) {
        const tasks = response.data as FrozenTask[];
        setFrozenTasks(tasks);
        
        // 计算统计数据
        const now = new Date();
        const frozen = tasks.filter(t => t.frozen).length;
        const overdue = tasks.filter(t => {
          const deadline = new Date(t.deadline);
          return deadline < now && !t.frozen;
        }).length;
        
        setStats({
          total: tasks.length,
          frozen,
          overdue
        });
      }
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfreezeTask = async (recordId: string, employeeName: string) => {
    if (!confirm(`确认解冻 ${employeeName} 的任务吗？`)) return;
    
    setUnfreezing(recordId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/automation/unfreeze/${recordId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`已解冻 ${employeeName} 的任务`);
        loadFrozenTasks(); // 刷新列表
      } else {
        toast.error(data.message || data.error || '解冻失败');
      }
    } catch (error: any) {
      toast.error(error.message || '网络错误');
    } finally {
      setUnfreezing(null);
    }
  };

  const handleBatchUnfreeze = async () => {
    if (!confirm(`确认批量解冻 ${selectedMonth} 的所有已冻结任务吗？\n共 ${stats.frozen} 条记录`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/automation/batch-unfreeze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ month: selectedMonth })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`已批量解冻 ${data.data?.unfrozen || 0} 条任务`);
        loadFrozenTasks();
      } else {
        toast.error(data.message || data.error || '批量解冻失败');
      }
    } catch (error: any) {
      toast.error(error.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6 text-red-600" />
            任务冻结管理
          </h1>
          <p className="text-gray-500 mt-1">管理超期冻结的绩效任务</p>
        </div>
        {stats.frozen > 0 && (
          <Button
            onClick={handleBatchUnfreeze}
            disabled={loading}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Unlock className="w-4 h-4 mr-1" />
            批量解冻（{stats.frozen}条）
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总任务数</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已冻结</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{stats.frozen}</p>
              </div>
              <Lock className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">超期未冻结</p>
                <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.overdue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      {stats.overdue > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            发现 {stats.overdue} 条超期但未冻结的任务，可能需要手动检查或运行自动冻结脚本。
          </AlertDescription>
        </Alert>
      )}

      {/* Month Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            选择月份
          </CardTitle>
          <CardDescription>筛选指定月份的任务</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>月份</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                max={format(new Date(), 'yyyy-MM')}
              />
            </div>
            <Button onClick={loadFrozenTasks} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              查询
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
          <CardDescription>
            {selectedMonth} 的绩效任务（共 {frozenTasks.length} 条）
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : frozenTasks.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
              <p>该月份没有任务记录</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>月份</TableHead>
                  <TableHead>截止日期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>冻结状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {frozenTasks.map((task) => {
                  const deadlineDate = new Date(task.deadline);
                  const isOverdue = deadlineDate < new Date();

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.employeeName}
                        <span className="text-xs text-gray-400 ml-1">({task.employeeId})</span>
                      </TableCell>
                      <TableCell>{task.department}</TableCell>
                      <TableCell>{task.month}</TableCell>
                      <TableCell>
                        <span className={isOverdue ? 'text-red-600' : ''}>
                          {format(deadlineDate, 'MM月dd日', { locale: zhCN })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          task.status === 'completed' ? 'default' :
                          task.status === 'submitted' ? 'secondary' : 'outline'
                        }>
                          {task.status === 'draft' && '草稿'}
                          {task.status === 'submitted' && '已提交'}
                          {task.status === 'scored' && '已评分'}
                          {task.status === 'completed' && '已完成'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.frozen ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <Lock className="w-3 h-3 mr-1" />
                            已冻结
                          </Badge>
                        ) : isOverdue ? (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            超期
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            正常
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.frozen && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnfreezeTask(task.id, task.employeeName)}
                            disabled={unfreezing === task.id}
                          >
                            {unfreezing === task.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Unlock className="w-3 h-3 mr-1" />
                            )}
                            解冻
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
    </motion.div>
  );
}
