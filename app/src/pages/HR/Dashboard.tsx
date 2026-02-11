import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Plus,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Users
} from 'lucide-react';
import { useHRStore } from '@/stores/hrStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { settingsApi, performanceApi } from '@/services/api';
import { cn } from '@/lib/utils';
import { resolveGroupType } from '@/lib/config';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';

// Sub-components
import { StatCards } from './Dashboard/StatCards';
import { DeptPerformanceTable, type DeptRecord } from './Dashboard/DeptPerformanceTable';
import { EmployeeDetailDrawer } from './Dashboard/EmployeeDetailDrawer';
import { DeleteRecordsDialog } from './Dashboard/DeleteRecordsDialog';

const isScoredStatus = (status: string) => status === 'completed' || status === 'scored';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  
  useEffect(() => {
    settingsApi.getAssessmentScope().then((res) => {
      if (res.success && res.data) setAssessmentScope(res.data);
    }).catch(() => {});
  }, []);
  
  const inScopeEmployees = employeesList;
  const monthRecords = allPerformanceRecords.filter(r => r.month === currentMonth);
  const rootDepartments = [...new Set(inScopeEmployees.map(e => e.department))].filter(Boolean);
  
  // Build department records hierarchy
  const deptRecords: DeptRecord[] = rootDepartments.map(rootDept => {
    const rootDeptEmployees = inScopeEmployees.filter(e => e.department === rootDept);
    const subDepts = [...new Set(rootDeptEmployees.map(e => e.subDepartment || ''))].filter(Boolean);
    
    const subDeptRecords = subDepts.map(subDept => {
      const subDeptEmployees = rootDeptEmployees.filter(e => e.subDepartment === subDept);
      const records = subDeptEmployees.map(emp => {
        const record = monthRecords.find(r => r.employeeId === emp.id);
        return { ...emp, record: record || null, totalScore: record?.totalScore || 0, status: record?.status || 'not_submitted' };
      });
      
      const filteredRecords = records.filter(r => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return !isScoredStatus(r.status);
        if (statusFilter === 'completed') return isScoredStatus(r.status);
        return true;
      });
      
      const sortedRecords = [...filteredRecords].sort((a, b) => {
        let result = 0;
        if (sortBy === 'name') result = a.name.localeCompare(b.name);
        else if (sortBy === 'score') result = b.totalScore - a.totalScore;
        else if (sortBy === 'status') {
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
  
  const stats = {
    totalEmployees: inScopeEmployees.length,
    completedScores: monthRecords.filter(r => isScoredStatus(r.status)).length,
    pendingScores: inScopeEmployees.length - monthRecords.filter(r => isScoredStatus(r.status)).length,
    averageScore: monthRecords.filter(r => isScoredStatus(r.status)).length > 0
      ? monthRecords.filter(r => isScoredStatus(r.status)).reduce((sum, r) => sum + r.totalScore, 0) / monthRecords.filter(r => isScoredStatus(r.status)).length
      : 0
  };
  
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await performanceApi.getStatsByMonth(currentMonth);
      if (!response.success) throw new Error(response.error || '获取数据失败');
      const { summary, records } = response.data;
      
      const summaryHeaders = ['部门', '总人数', '已评分', '平均分', '优秀', '良好', '合格', '待改进'];
      const summaryRows = summary.map((dept: any) => [dept.department, dept.totalEmployees, dept.scoredCount, dept.averageScore, dept.excellentCount, dept.goodCount, dept.normalCount, dept.needImprovementCount].join(','));
      const detailHeaders = ['姓名', '部门', '二级部门', '级别', '得分', '等级', '状态'];
      const detailRows = records.map((r: any) => [r.employeeName || '', r.department || '', r.subDepartment || '', r.employeeLevel || '', r.totalScore || 0, r.level || '', r.status === 'completed' || r.status === 'scored' ? '已评分' : '待评分'].join(','));
      
      const csvContent = [`${currentMonth} 绩效数据报表`, '', '【部门汇总】', summaryHeaders.join(','), ...summaryRows, '', '【员工明细】', detailHeaders.join(','), ...detailRows].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `绩效数据_${currentMonth}.csv`;
      link.click();
    } catch (error: any) {
      alert('导出失败: ' + (error.message || '未知错误'));
    } finally {
      setExporting(false);
    }
  };
  
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await performanceApi.generateTasks(currentMonth);
      if (response.success) { alert(response.message); fetchAllPerformanceRecords(); }
      else throw new Error(response.error || '生成失败');
    } catch (error: any) {
      alert('生成失败: ' + (error.message || '未知错误'));
    } finally {
      setGenerating(false);
      setShowGenerateDialog(false);
    }
  };

  const realCurrentMonth = format(new Date(), 'yyyy-MM');

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">人力资源管理系统</h1>
          <p className="text-gray-500 mt-1">欢迎回来，{user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} className="w-auto" />
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部显示</SelectItem>
              <SelectItem value="pending">未打绩效</SelectItem>
              <SelectItem value="completed">已打绩效</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />{exporting ? '导出中...' : '导出数据'}
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="w-4 h-4 mr-2" />删除记录
          </Button>
          <DeleteRecordsDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            currentMonth={currentMonth}
            realCurrentMonth={realCurrentMonth}
            onDeleted={() => fetchAllPerformanceRecords()}
          />
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-2" />生成打分任务</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>生成打分任务</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>月份</Label><Input type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} /></div>
                <Button onClick={handleGenerate} className="w-full" disabled={generating}>{generating ? '生成中...' : '确认生成'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>
      
      {/* Stat Cards */}
      <motion.div variants={itemVariants}>
        <StatCards stats={stats} onFilterChange={setStatusFilter} />
      </motion.div>
      
      {/* Department Performance Table */}
      <motion.div variants={itemVariants}>
        <DeptPerformanceTable
          currentMonth={currentMonth}
          deptRecords={deptRecords}
          sortBy={sortBy}
          sortOrder={sortOrder}
          setSortBy={setSortBy}
          setSortOrder={setSortOrder}
          onEmployeeClick={(emp) => { setSelectedEmployee(emp); setDetailDrawerOpen(true); }}
        />
      </motion.div>
      
      {/* Employee Detail Drawer */}
      <EmployeeDetailDrawer
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        employee={selectedEmployee}
        currentMonth={currentMonth}
      />
    </motion.div>
  );
}

// HROverview component (kept for backward compat - used elsewhere)
interface HROverviewProps {
  deptRecords: DeptRecord[];
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
    if (newCollapsed.has(rootDept)) newCollapsed.delete(rootDept);
    else newCollapsed.add(rootDept);
    setCollapsedDepts(newCollapsed);
  };
  
  const handleSort = (field: 'name' | 'score' | 'status') => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };
  
  return (
    <div className="space-y-6">
      {deptRecords.map(dept => {
        const isCollapsed = collapsedDepts.has(dept.rootDepartment);
        return (
          <Card key={dept.rootDepartment}>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleToggle(dept.rootDepartment)}>
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
                      <div className="text-sm text-gray-500">共 {subDept.totalCount} 人 · 已评分 {subDept.completedCount} 人</div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>姓名</TableHead>
                          <TableHead>角色</TableHead>
                          <TableHead>职级</TableHead>
                          <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('score')}>
                            <div className="flex items-center gap-1">
                              综合得分
                              {sortBy === 'score' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                            </div>
                          </TableHead>
                          <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('status')}>
                            <div className="flex items-center gap-1">
                              状态
                              {sortBy === 'status' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
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
                                <div className="text-[10px] text-gray-400 mt-0.5">{emp.id} · {emp.level || '—'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={emp.role === 'manager' ? "default" : "outline"} className={cn(emp.role === 'manager' ? "bg-blue-100 text-blue-700" : "")}>
                                {emp.role === 'manager' ? '部门经理' : '员工'}
                              </Badge>
                            </TableCell>
                            <TableCell>{emp.level}</TableCell>
                            <TableCell>
                              {isScored(emp.status) ? <ScoreDisplay score={emp.totalScore} showLabel={false} size="sm" /> : <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell>
                              {isScored(emp.status) ? <Badge className="bg-green-100 text-green-700">已评分</Badge> : <Badge className="bg-yellow-100 text-yellow-700">待评分</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                        {subDept.records.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">暂无数据</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                {dept.subDepartments.length === 0 && <div className="text-center py-8 text-gray-400">暂无数据</div>}
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
