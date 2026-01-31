import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  BarChart3, 
  Plus,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  X,
  Building2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useHRStore } from '@/stores/hrStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Tabs components - retained for future tabs feature
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// EmployeeManagement moved to separate route
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
// Assessment scope config - unused in current implementation
import { settingsApi, performanceApi } from '@/services/api';
import { cn } from '@/lib/utils';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';

export function HRDashboard() {
  const { user } = useAuthStore();
  const { 
    employeesList,
    fetchEmployees,
    allPerformanceRecords,
    fetchAllPerformanceRecords
  } = useHRStore();
  
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [, setAssessmentScope] = useState<{ rootDepts: string[]; subDeptsByRoot: Record<string, string[]> }>({ rootDepts: [], subDeptsByRoot: {} });
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'status'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exporting, setExporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  // 删除相关状态
  const [deleteMonth, setDeleteMonth] = useState(currentMonth);
  const [deleteMonthConfirm, setDeleteMonthConfirm] = useState('');
  const [ackPastDelete, setAckPastDelete] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');
  const [ackDeleteAll, setAckDeleteAll] = useState(false);
  
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  
  useEffect(() => {
    settingsApi.getAssessmentScope().then((res) => {
      if (res.success && res.data) setAssessmentScope(res.data);
    }).catch(() => {});
  }, []);
  
  // 暂时显示所有员工，不经过考核范围过滤
  const inScopeEmployees = employeesList;

  const isScoredStatus = (status: string) => status === 'completed' || status === 'scored';
  
  // 如需恢复考核范围过滤，使用以下代码：
  // const inScopeEmployees = employeesList.filter((e) => isInAssessmentScope(e, assessmentScope));
  
  // 筛选当前月份的绩效记录
  const monthRecords = allPerformanceRecords.filter(r => r.month === currentMonth);
  
  // 获取所有一级部门
  const rootDepartments = [...new Set(inScopeEmployees.map(e => e.department))].filter(Boolean);
  
  // 按一级部门分组，每个一级部门下按二级部门分组
  const deptRecords = rootDepartments.map(rootDept => {
    const rootDeptEmployees = inScopeEmployees.filter(e => e.department === rootDept);
    // 提取二级部门（直接使用，数据库已清理）
    const subDepts = [...new Set(rootDeptEmployees.map(e => e.subDepartment || ''))]
      .filter(Boolean);
    
    const subDeptRecords = subDepts.map(subDept => {
      // 匹配该二级部门下的所有员工
      const subDeptEmployees = rootDeptEmployees.filter(e => e.subDepartment === subDept);
      const records = subDeptEmployees.map(emp => {
        const record = monthRecords.find(r => r.employeeId === emp.id);
        return {
          ...emp,
          record: record || null,
          totalScore: record?.totalScore || 0,
          status: record?.status || 'not_submitted'
        };
      });
      
      // 应用状态筛选
      const filteredRecords = records.filter(r => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return !isScoredStatus(r.status);
        if (statusFilter === 'completed') return isScoredStatus(r.status);
        return true;
      });
      
      // 排序
      const sortedRecords = [...filteredRecords].sort((a, b) => {
        let result = 0;
        if (sortBy === 'name') {
          result = a.name.localeCompare(b.name);
        } else if (sortBy === 'score') {
          result = b.totalScore - a.totalScore;
        } else if (sortBy === 'status') {
          const statusOrder: Record<string, number> = { 'completed': 1, 'pending': 2 };
          result = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        }
        return sortOrder === 'asc' ? -result : result;
      });
      
      return {
        subDepartment: subDept,
        records: sortedRecords,
        completedCount: sortedRecords.filter(r => isScoredStatus(r.status)).length,
        totalCount: sortedRecords.length
      };
    });
    
    return {
      rootDepartment: rootDept,
      subDepartments: subDeptRecords,
      completedCount: subDeptRecords.reduce((sum, s) => sum + s.completedCount, 0),
      totalCount: subDeptRecords.reduce((sum, s) => sum + s.totalCount, 0)
    };
  });
  
  // 统计数据
  // 切换展开状态
  const toggleDept = (rootDept: string) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(rootDept)) {
      newExpanded.delete(rootDept);
    } else {
      newExpanded.add(rootDept);
    }
    setExpandedDepts(newExpanded);
  };
  
  // 打开详情抽屉
  const openDetailDrawer = (employee: any) => {
    setSelectedEmployee(employee);
    setDetailDrawerOpen(true);
  };
  
  // 统计数据
  const stats = {
    totalEmployees: inScopeEmployees.length,
    completedScores: monthRecords.filter(r => isScoredStatus(r.status)).length,
    pendingScores: inScopeEmployees.length - monthRecords.filter(r => isScoredStatus(r.status)).length,
    averageScore: monthRecords.filter(r => isScoredStatus(r.status)).length > 0
      ? monthRecords.filter(r => isScoredStatus(r.status)).reduce((sum, r) => sum + r.totalScore, 0) / monthRecords.filter(r => isScoredStatus(r.status)).length
      : 0
  };
  
  // 导出功能 - 从后端获取真实数据
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await performanceApi.getStatsByMonth(currentMonth);
      if (!response.success) {
        throw new Error(response.error || '获取数据失败');
      }
      
      const { summary, records } = response.data;
      
      // 生成部门汇总CSV
      const summaryHeaders = ['部门', '总人数', '已评分', '平均分', '优秀', '良好', '合格', '待改进'];
      const summaryRows = summary.map((dept: any) => [
        dept.department,
        dept.totalEmployees,
        dept.scoredCount,
        dept.averageScore,
        dept.excellentCount,
        dept.goodCount,
        dept.normalCount,
        dept.needImprovementCount
      ].join(','));
      
      // 生成员工明细CSV
      const detailHeaders = ['姓名', '部门', '二级部门', '级别', '得分', '等级', '状态'];
      const detailRows = records.map((r: any) => [
        r.employeeName || '',
        r.department || '',
        r.subDepartment || '',
        r.employeeLevel || '',
        r.totalScore || 0,
        r.level || '',
        r.status === 'completed' || r.status === 'scored' ? '已评分' : '待评分'
      ].join(','));
      
      const csvContent = [
        `${currentMonth} 绩效数据报表`,
        '',
        '【部门汇总】',
        summaryHeaders.join(','),
        ...summaryRows,
        '',
        '【员工明细】',
        detailHeaders.join(','),
        ...detailRows
      ].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `绩效数据_${currentMonth}.csv`;
      link.click();
    } catch (error: any) {
      console.error('导出失败:', error);
      alert('导出失败: ' + (error.message || '未知错误'));
    } finally {
      setExporting(false);
    }
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity:1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity:1, y: 0 }
  };
  
  // 生成打分任务 - 调用后端API
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await performanceApi.generateTasks(currentMonth);
      if (response.success) {
        alert(response.message);
        // 刷新绩效记录
        fetchAllPerformanceRecords();
      } else {
        throw new Error(response.error || '生成失败');
      }
    } catch (error: any) {
      console.error('生成任务失败:', error);
      alert('生成失败: ' + (error.message || '未知错误'));
    } finally {
      setGenerating(false);
      setShowGenerateDialog(false);
    }
  };

  const realCurrentMonth = format(new Date(), 'yyyy-MM');
  const isPastDeleteMonth = deleteMonth < realCurrentMonth;

  const openDeleteDialog = () => {
    setDeleteMonth(currentMonth);
    setDeleteMonthConfirm('');
    setAckPastDelete(false);
    setDeleteAllConfirm('');
    setAckDeleteAll(false);
    setShowDeleteDialog(true);
  };

  const handleDeleteMonth = async () => {
    setDeleting(true);
    try {
      const response = await performanceApi.deleteRecordsByMonth(deleteMonth, {
        confirm: deleteMonthConfirm,
        force: isPastDeleteMonth ? ackPastDelete : false
      });
      if (response.success) {
        alert(response.message || '删除成功');
        await fetchAllPerformanceRecords();
        setShowDeleteDialog(false);
      } else {
        throw new Error(response.error || '删除失败');
      }
    } catch (error: any) {
      console.error('删除失败:', error);
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
        await fetchAllPerformanceRecords();
        setShowDeleteDialog(false);
      } else {
        throw new Error(response.error || '删除失败');
      }
    } catch (error: any) {
      console.error('删除失败:', error);
      alert('删除失败: ' + (error.message || '未知错误'));
    } finally {
      setDeleting(false);
    }
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">人力资源管理系统</h1>
          <p className="text-gray-500 mt-1">欢迎回来，{user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            type="month" 
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="w-auto"
          />
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部显示</SelectItem>
              <SelectItem value="pending">未打绩效</SelectItem>
              <SelectItem value="completed">已打绩效</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? '导出中...' : '导出数据'}
          </Button>

          <Button variant="destructive" onClick={openDeleteDialog}>
            <Trash2 className="w-4 h-4 mr-2" />
            删除记录
          </Button>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-red-600">删除绩效记录（不可恢复）</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-2">
                {/* 删除指定月份 */}
                <div className="rounded-lg border border-gray-200 p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">删除指定月份</h3>
                    <span className="text-xs text-gray-500">会删除该月所有员工绩效记录</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <Label>月份</Label>
                      <Input
                        type="month"
                        value={deleteMonth}
                        onChange={(e) => {
                          setDeleteMonth(e.target.value);
                          setDeleteMonthConfirm('');
                          setAckPastDelete(false);
                        }}
                      />
                    </div>

                    {isPastDeleteMonth && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p className="font-medium">正在删除历史月份数据，删除后无法恢复。</p>
                        <div className="mt-2 flex items-start gap-2">
                          <Checkbox
                            checked={ackPastDelete}
                            onCheckedChange={(v) => setAckPastDelete(Boolean(v))}
                            id="ack-past"
                          />
                          <label htmlFor="ack-past" className="text-sm leading-tight">
                            我已知晓删除历史记录不可恢复
                          </label>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>确认输入</Label>
                      <Input
                        placeholder="请输入要删除的月份（例如：2026-02）"
                        value={deleteMonthConfirm}
                        onChange={(e) => setDeleteMonthConfirm(e.target.value.trim())}
                      />
                      <p className="text-xs text-gray-500 mt-1">需输入完全一致的月份才可删除</p>
                    </div>

                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleDeleteMonth}
                      disabled={
                        deleting ||
                        deleteMonthConfirm !== deleteMonth ||
                        (isPastDeleteMonth && !ackPastDelete)
                      }
                    >
                      {deleting ? '删除中...' : `删除 ${deleteMonth} 的全部记录`}
                    </Button>
                  </div>
                </div>

                {/* 删除全部 */}
                <div className="rounded-lg border border-red-200 p-4 bg-red-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-red-700">删除全部绩效记录</h3>
                    <span className="text-xs text-red-600">高危操作</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="text-sm text-red-700">
                      将删除系统内全部绩效评价记录（所有月份）。删除后无法恢复。
                    </div>

                    <div>
                      <Label>确认输入</Label>
                      <Input
                        placeholder='请输入 "DELETE ALL"'
                        value={deleteAllConfirm}
                        onChange={(e) => setDeleteAllConfirm(e.target.value)}
                      />
                    </div>

                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={ackDeleteAll}
                        onCheckedChange={(v) => setAckDeleteAll(Boolean(v))}
                        id="ack-all"
                      />
                      <label htmlFor="ack-all" className="text-sm text-red-700 leading-tight">
                        我已知晓删除全部记录不可恢复
                      </label>
                    </div>

                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleDeleteAll}
                      disabled={deleting || !ackDeleteAll || deleteAllConfirm !== 'DELETE ALL'}
                    >
                      {deleting ? '删除中...' : '删除全部绩效记录'}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                生成打分任务
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>生成打分任务</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>月份</Label>
                  <Input 
                    type="month" 
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                  />
                </div>
                
                <Button onClick={handleGenerate} className="w-full" disabled={generating}>
                  {generating ? '生成中...' : '确认生成'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>
      
      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总人数</p>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('completed')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已评分</p>
                <p className="text-2xl font-bold">{stats.completedScores}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('pending')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待评分</p>
                <p className="text-2xl font-bold">{stats.pendingScores}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* 部门绩效统计 */}
      <motion.div variants={itemVariants}>
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {currentMonth} 部门绩效统计
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {deptRecords.map((dept) => {
              const isDeptExpanded = expandedDepts.has(dept.rootDepartment);
              
              return (
                <div key={dept.rootDepartment} className="mb-6 last:mb-0">
                  {/* 一级部门行 */}
                  <div 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => toggleDept(dept.rootDepartment)}
                  >
                    <div className="flex items-center gap-3">
                      {isDeptExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">{dept.rootDepartment}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        共 <span className="font-semibold text-gray-900">{dept.totalCount}</span> 人
                      </span>
                      <span className="text-emerald-600">
                        已评分 <span className="font-semibold">{dept.completedCount}</span> 人
                      </span>
                      <span className="text-amber-600">
                        未评分 <span className="font-semibold">{dept.totalCount - dept.completedCount}</span> 人
                      </span>
                    </div>
                  </div>
                  
                  {/* 展开的二级部门和员工列表 */}
                  {isDeptExpanded && (
                    <div className="mt-2 space-y-2">
                      {dept.subDepartments.map(subDept => (
                        <div key={subDept.subDepartment} className="ml-4">
                          {/* 二级部门标题（不可点击） */}
                          <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">{subDept.subDepartment}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>共 {subDept.totalCount} 人</span>
                              <span>已评分 {subDept.completedCount} 人</span>
                            </div>
                          </div>
                          
                          {/* 员工列表（直接显示，如果没有员工显示提示） */}
                          {subDept.records.length > 0 ? (
                              <div className="ml-6 mt-1">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">姓名</TableHead>
                                      <TableHead className="text-xs">岗位</TableHead>
                                      <TableHead className="text-xs text-right">
                                        <div 
                                          className="cursor-pointer hover:text-blue-600 flex items-center justify-end gap-1"
                                          onClick={() => {
                                            if (sortBy === 'score') {
                                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                            } else {
                                              setSortBy('score');
                                              setSortOrder('desc');
                                            }
                                          }}
                                        >
                                          考评得分
                                          {sortBy === 'score' && (
                                            <span className="text-xs text-gray-400">
                                              {sortOrder === 'asc' ? '↑' : '↓'}
                                            </span>
                                          )}
                                        </div>
                                      </TableHead>
                                      <TableHead className="text-xs">考评状态</TableHead>
                                      <TableHead className="text-xs">操作</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {subDept.records.map((emp) => (
                                      <TableRow key={`${dept.rootDepartment}-${subDept.subDepartment}-${emp.id}`}>
                                        <TableCell className="text-xs font-medium">
                                          <button
                                            type="button"
                                            className="text-primary hover:underline hover:text-blue-700 text-left w-full"
                                            onClick={() => openDetailDrawer(emp)}
                                          >
                                            <div className="leading-tight">
                                              <div>{emp.name}</div>
                                              <div className="text-[10px] text-gray-400 mt-0.5">
                                                {emp.id} · {emp.level || '—'}
                                              </div>
                                            </div>
                                          </button>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-600">
                                          {emp.role === 'manager' ? '部门经理' : '员工'}
                                        </TableCell>
                                        <TableCell className="text-xs text-right">
                                          {isScoredStatus(emp.status) ? (
                                            <span className="font-semibold text-emerald-600">{emp.totalScore.toFixed(2)}</span>
                                          ) : (
                                            <span className="text-gray-400">--</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {isScoredStatus(emp.status) ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">已评分</Badge>
                                          ) : (
                                            <Badge className="bg-amber-100 text-amber-700 text-xs">待评分</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6"
                                            onClick={() => openDetailDrawer(emp)}
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                          ) : (
                              <div className="ml-6 mt-2 text-xs text-gray-400 py-2">
                                该筛选条件下暂无员工
                              </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {deptRecords.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无绩效数据</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* 员工详情抽屉 */}
      <Drawer open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
        <DrawerContent className="max-w-2xl max-h-[90vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle>
              {selectedEmployee?.name || '员工详情'}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="w-4 h-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          
          {selectedEmployee && (
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
                {/* 员工基本信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">姓名：{selectedEmployee.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">岗位：{selectedEmployee.role === 'manager' ? '部门经理' : '员工'}</span>
                      </div>
                      <div>
                        <span className="text">部门：{selectedEmployee.department}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">子部门：{selectedEmployee.subDepartment || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">月份：{currentMonth}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">考评状态：</span>
                        <Badge className={
                          isScoredStatus(selectedEmployee.status)
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }>
                          {isScoredStatus(selectedEmployee.status) ? '已评分' : '待评分'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-500">考评得分：</span>
                        <span className="font-semibold">
                          {isScoredStatus(selectedEmployee.status)
                            ? `${selectedEmployee.totalScore.toFixed(2)} 分` 
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* 绩效详情 */}
                {selectedEmployee.record && isScoredStatus(selectedEmployee.status) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">考评明细</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">自我总结</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {selectedEmployee.record.selfSummary || '暂无'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">下月计划</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {selectedEmployee.record.nextMonthPlan || '暂无'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">部门经理评价</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {selectedEmployee.record.managerComment || '暂无'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">得分明细</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">承担任务量：{selectedEmployee.record.taskCompletion.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">主动性：{selectedEmployee.record.initiative.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-500">项目反馈：{selectedEmployee.record.projectFeedback.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">质量改进：{selectedEmployee.record.qualityImprovement.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}
        </DrawerContent>
      </Drawer>
    </motion.div>
  );
}

// 数据概览组件
interface HROverviewProps {
  deptRecords: Array<{
    rootDepartment: string;
    subDepartments: Array<{
      subDepartment: string;
      records: Array<{
        id: string;
        name: string;
        role: string;
        level: string;
        record: any;
        totalScore: number;
        status: string;
      }>;
      completedCount: number;
      totalCount: number;
    }>;
    completedCount: number;
    totalCount: number;
  }>;
  sortBy: 'name' | 'score' | 'status';
  sortOrder: 'asc' | 'desc';
  setSortBy: (value: 'name' | 'score' | 'status') => void;
  setSortOrder: (value: 'asc' | 'desc') => void;
}

export function HROverview({ deptRecords, sortBy, sortOrder, setSortBy, setSortOrder }: HROverviewProps) {
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

  const isScored = (status: string) => status === 'completed' || status === 'scored';
  
  const handleToggle = (rootDept: string) => {
    const newCollapsed = new Set(collapsedDepts);
    if (newCollapsed.has(rootDept)) {
      newCollapsed.delete(rootDept);
    } else {
      newCollapsed.add(rootDept);
    }
    setCollapsedDepts(newCollapsed);
  };
  
  const handleSort = (field: 'name' | 'score' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 一级部门列表 */}
      {deptRecords.map(dept => {
        const isCollapsed = collapsedDepts.has(dept.rootDepartment);
        return (
          <Card key={dept.rootDepartment}>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleToggle(dept.rootDepartment)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  {dept.rootDepartment}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>共 {dept.totalCount} 人</span>
                  <span className="text-green-600">已评分 {dept.completedCount} 人</span>
                </div>
              </div>
            </CardHeader>
            
            {!isCollapsed && (
              <CardContent className="pt-0">
                {dept.subDepartments.map(subDept => (
                  <div key={subDept.subDepartment} className="mb-6 last:mb-0">
                    <div className="flex items-center justify-between mb-3 px-4 py-2 bg-gray-50 rounded">
                      <h4 className="font-medium text-gray-700">{subDept.subDepartment}</h4>
                      <div className="text-sm text-gray-500">
                        共 {subDept.totalCount} 人 · 已评分 {subDept.completedCount} 人
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>姓名</TableHead>
                          <TableHead>角色</TableHead>
                          <TableHead>职级</TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('score')}
                          >
                            <div className="flex items-center gap-1">
                              综合得分
                              {sortBy === 'score' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center gap-1">
                              状态
                              {sortBy === 'status' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                              )}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subDept.records.map((emp, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              <div className="leading-tight">
                                <div>{emp.name}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  {emp.id} · {emp.level || '—'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={emp.role === 'manager' ? "default" : "outline"}
                                className={cn(
                                  emp.role === 'manager' ? "bg-blue-100 text-blue-700" : ""
                                )}
                              >
                                {emp.role === 'manager' ? '部门经理' : '员工'}
                              </Badge>
                            </TableCell>
                            <TableCell>{emp.level}</TableCell>
                            <TableCell>
                              {isScored(emp.status) ? (
                                <ScoreDisplay score={emp.totalScore} showLabel={false} size="sm" />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isScored(emp.status) ? (
                                <Badge className="bg-green-100 text-green-700">已评分</Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-700">待评分</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {subDept.records.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                              暂无数据
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                
                 {dept.subDepartments.length === 0 && (
                   <div className="text-center py-8 text-gray-400">
                     暂无数据
                   </div>
                 )}
               </CardContent>
             )}
             </Card>
         );
       })}
       
       {deptRecords.length === 0 && (
         <Card>
           <CardContent className="py-16 text-center">
             <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
             <p className="text-gray-500">暂无绩效数据</p>
           </CardContent>
         </Card>
       )}
     </div>
   );
}
