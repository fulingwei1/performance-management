import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Download,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Lightbulb
} from 'lucide-react';
import { useHRStore } from '@/stores/hrStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { analyticsApi, performanceApi, performanceConfigApi } from '@/services/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getDefaultAssessmentMonth } from '@/lib/assessmentMonth';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { ReportSummaryCard, type ReportSummaryData } from '@/components/reports/ReportSummaryCard';

// Sub-components
import { StatCards } from './Dashboard/StatCards';
import { DeptPerformanceTable, type DeptRecord } from './Dashboard/DeptPerformanceTable';
import { EmployeeDetailDrawer } from './Dashboard/EmployeeDetailDrawer';
import { TodoSection } from '@/components/dashboard/TodoSection';
import { todoApi } from '@/services/api';

const isScoredStatus = (status: string) => status === 'completed' || status === 'scored';

interface RankingConfig {
  participation: {
    mode: 'include' | 'exclude';
    includedUnitKeys: string[];
    excludedUnitKeys: string[];
    includedEmployeeIds: string[];
    excludedEmployeeIds: string[];
  };
}

interface ImprovementSuggestionSummary {
  totalCount: number;
  namedCount: number;
  anonymousCount: number;
  suggestions: Array<{
    id: string;
    employeeName: string;
    suggestion: string;
    anonymous: boolean;
    department?: string;
    subDepartment?: string;
  }>;
}

function displaySubDepartment(subDepartment?: string): string {
  const normalized = String(subDepartment || '').trim();
  return normalized && normalized !== '/' ? normalized : '直属/未分组';
}

function hasValidManagerRelationship(employee: any, activeEmployeeIds: Set<string>): boolean {
  const employeeId = String(employee?.id || '').trim();
  const managerId = String(employee?.managerId || '').trim();
  return Boolean(managerId && managerId !== employeeId && activeEmployeeIds.has(managerId));
}

function cleanSegment(value?: string): string {
  const normalized = String(value || '').trim();
  return normalized && normalized !== '/' && normalized !== '-' ? normalized : '';
}

function getEmployeeUnitKey(employee: any): string {
  const department = cleanSegment(employee.department);
  const subDepartment = cleanSegment(employee.subDepartment);
  return department && subDepartment ? `${department}/${subDepartment}` : department || subDepartment;
}

function matchesConfiguredUnit(unitKey: string, configuredKey: string): boolean {
  const key = String(configuredKey || '').trim();
  return Boolean(key && (unitKey === key || unitKey.startsWith(`${key}/`)));
}

function resolveUnitDecision(
  unitKey: string,
  includedUnitKeys: string[],
  excludedUnitKeys: string[]
): 'include' | 'exclude' | null {
  let bestLength = -1;
  let decision: 'include' | 'exclude' | null = null;

  for (const key of includedUnitKeys || []) {
    if (matchesConfiguredUnit(unitKey, key) && key.length > bestLength) {
      bestLength = key.length;
      decision = 'include';
    }
  }

  for (const key of excludedUnitKeys || []) {
    if (matchesConfiguredUnit(unitKey, key) && key.length >= bestLength) {
      bestLength = key.length;
      decision = 'exclude';
    }
  }

  return decision;
}

function isParticipatingEmployee(employee: any, rankingConfig: RankingConfig | null): boolean {
  if (!rankingConfig) return false;
  const participation = rankingConfig.participation;
  const employeeId = String(employee?.id || '').trim();
  const unitKey = getEmployeeUnitKey(employee);

  if ((participation.excludedEmployeeIds || []).includes(employeeId)) return false;
  if ((participation.includedEmployeeIds || []).includes(employeeId)) return true;

  const unitDecision = resolveUnitDecision(
    unitKey,
    participation.includedUnitKeys || [],
    participation.excludedUnitKeys || []
  );
  if (unitDecision) return unitDecision === 'include';

  return participation.mode !== 'include';
}

export function HRDashboard() {
  const { user } = useAuthStore();
  const { 
    employeesList,
    fetchEmployees,
    fetchAllPerformanceRecords,
    allPerformanceRecords
  } = useHRStore();
  
  const [currentMonth, setCurrentMonth] = useState(getDefaultAssessmentMonth());
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'status'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestionSummary, setSuggestionSummary] = useState<ImprovementSuggestionSummary | null>(null);
  const [reportSummary, setReportSummary] = useState<ReportSummaryData | null>(null);
  const [rankingConfig, setRankingConfig] = useState<RankingConfig | null>(null);
  const tableSectionRef = useRef<HTMLDivElement | null>(null);
  const todoRole = user?.role === 'admin' ? 'admin' : 'hr';
  const showSuggestionSummary = user?.role === 'admin' || user?.role === 'hr';
  
  useEffect(() => {
    fetchEmployees();
    fetchAllPerformanceRecords();
    performanceConfigApi.getRankingConfig()
      .then((res) => {
        if (res.success) setRankingConfig(res.data || null);
      })
      .catch(() => setRankingConfig(null));
  }, [fetchEmployees, fetchAllPerformanceRecords]);
  
  useEffect(() => {
    if (!showSuggestionSummary) return;
    performanceApi.getImprovementSuggestions({ month: currentMonth, scope: 'all' })
      .then((res) => {
        if (res.success) setSuggestionSummary(res.data || null);
      })
      .catch(() => {});
  }, [currentMonth, showSuggestionSummary]);

  useEffect(() => {
    analyticsApi.getReportSummary(currentMonth)
      .then((res) => {
        if (res.success) setReportSummary(res.data || null);
      })
      .catch(() => setReportSummary(null));
  }, [currentMonth]);
  
  const { deptRecords, stats } = useMemo(() => {
    const activeEmployeeIds = new Set(
      employeesList
        .filter((employee: any) => !employee.status || employee.status === 'active')
        .map((employee: any) => employee.id)
    );
    const assessableInScopeEmployees = employeesList.filter((employee: any) => {
      if (employee.status && employee.status !== 'active') return false;
      if (!['employee', 'manager'].includes(String(employee.role || ''))) return false;
      if (!isParticipatingEmployee(employee, rankingConfig)) return false;
      return hasValidManagerRelationship(employee, activeEmployeeIds);
    });
    const activeCompanyEmployees = employeesList.filter((employee: any) => {
      if (employee.status && employee.status !== 'active') return false;
      return true;
    });
    const inScopeEmployeeIds = new Set(assessableInScopeEmployees.map((employee: any) => employee.id));
    const monthRecords = allPerformanceRecords.filter(r => r.month === currentMonth && inScopeEmployeeIds.has(r.employeeId));
    const scoredRecords = monthRecords.filter(r => isScoredStatus(r.status));
    const rootDepartments = [...new Set(assessableInScopeEmployees.map(e => e.department))].filter(Boolean);

    const deptRecords: DeptRecord[] = rootDepartments.map(rootDept => {
      const rootDeptEmployees = assessableInScopeEmployees.filter(e => e.department === rootDept);
      const subDepts = [...new Set(rootDeptEmployees.map(e => displaySubDepartment(e.subDepartment)))];

      const subDeptRecords = subDepts.map(subDept => {
        const subDeptEmployees = rootDeptEmployees.filter(e => displaySubDepartment(e.subDepartment) === subDept);
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
      companyTotalEmployees: activeCompanyEmployees.length,
      participatingEmployees: assessableInScopeEmployees.length,
      completedScores: scoredRecords.length,
      pendingScores: assessableInScopeEmployees.length - scoredRecords.length,
      averageScore: scoredRecords.length > 0
        ? scoredRecords.reduce((sum, r) => sum + r.totalScore, 0) / scoredRecords.length
        : 0
    };

    return { deptRecords, stats };
  }, [employeesList, allPerformanceRecords, currentMonth, statusFilter, sortBy, sortOrder, rankingConfig]);

  const filteredDeptRecords = useMemo(() => {
    if (!searchQuery.trim()) return deptRecords;
    const q = searchQuery.trim().toLowerCase();
    return deptRecords.map(dept => {
      const subDepartments = dept.subDepartments.map(sub => {
        const records = sub.records.filter(r => r.name.toLowerCase().includes(q));
        return {
          ...sub,
          records,
          completedCount: records.filter(r => isScoredStatus(r.status)).length,
          totalCount: records.length,
        };
      }).filter(sub => sub.records.length > 0);
      return {
        ...dept,
        subDepartments,
        completedCount: subDepartments.reduce((sum, s) => sum + s.completedCount, 0),
        totalCount: subDepartments.reduce((sum, s) => sum + s.totalCount, 0),
      };
    }).filter(dept => dept.subDepartments.length > 0);
  }, [deptRecords, searchQuery]);
  
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await performanceApi.getStatsByMonth(currentMonth);
      if (!response.success) throw new Error(response.message || '获取数据失败');
      const { summary, records } = response.data;
      
      const summaryHeaders = ['部门', '本期参与人数', '已评分', '平均分', '优秀', '良好', '合格', '待改进'];
      const summaryRows = summary.map((dept: any) => [dept.department, dept.totalEmployees, dept.scoredCount, dept.averageScore, dept.excellentCount, dept.goodCount, dept.normalCount, dept.needImprovementCount].join(','));
      const detailHeaders = ['姓名', '部门', '二级部门', '级别', '得分', '等级', '状态'];
      const detailRows = records.map((r: any) => [r.employeeName || '', r.department || '', r.subDepartment || '', r.employeeLevel || '', r.totalScore || 0, r.level || '', r.status === 'completed' || r.status === 'scored' ? '已评分' : '待评分'].join(','));
      
      const executiveRows = reportSummary ? [
        ['统计月份', reportSummary.month],
        ['参与记录', reportSummary.overview.totalRecords],
        ['已评分', reportSummary.overview.scoredCount],
        ['待评分', reportSummary.overview.pendingCount],
        ['完成率', `${reportSummary.overview.completionRate}%`],
        ['平均分', reportSummary.overview.avgScore],
        ['较上月平均分变化', reportSummary.overview.avgScoreDelta],
        ['较上月完成率变化', `${reportSummary.overview.completionRateDelta}%`],
        ['发布检查', reportSummary.publicationReadiness?.ok ? '通过' : '需关注'],
        ['主要风险', reportSummary.risks?.[0]?.message || '暂无'],
      ].map((row) => row.join(',')) : [];

      const riskRows = reportSummary?.risks?.map((risk) => [
        risk.severity,
        risk.title,
        risk.message,
        risk.department || '',
      ].join(',')) || [];

      const focusRows = reportSummary
        ? [
          ...(reportSummary.focus?.pending || []).map((person) => ['待完成评分', person.employeeName, person.department, person.subDepartment || '', person.score ?? '', person.delta ?? '', person.status].join(',')),
          ...(reportSummary.focus?.lowScores || []).map((person) => ['低分关注', person.employeeName, person.department, person.subDepartment || '', person.score ?? '', person.delta ?? '', person.status].join(',')),
          ...(reportSummary.focus?.declined || []).map((person) => ['环比下降', person.employeeName, person.department, person.subDepartment || '', person.score ?? '', person.delta ?? '', person.status].join(',')),
          ...(reportSummary.focus?.topScores || []).map((person) => ['高分标杆', person.employeeName, person.department, person.subDepartment || '', person.score ?? '', person.delta ?? '', person.status].join(',')),
        ]
        : [];

      const csvContent = [
        `${currentMonth} 绩效数据报表`,
        '',
        '【执行摘要】',
        '项目,值',
        ...executiveRows,
        '',
        '【风险提醒】',
        '级别,标题,说明,部门',
        ...riskRows,
        '',
        '【重点人员】',
        '类型,姓名,部门,二级部门,得分,较上月变化,状态',
        ...focusRows,
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
      toast.error('导出失败: ' + (error.message || '未知错误'));
    } finally {
      setExporting(false);
    }
  };

  const handleStatFilterChange = (filter: 'all' | 'pending' | 'completed') => {
    setStatusFilter(filter);
    window.setTimeout(() => {
      tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };
  
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* 待办事项 */}
      <motion.div variants={itemVariants}>
        <TodoSection role={todoRole} fetchSummary={todoApi.getSummary} />
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">人力资源管理系统</h1>
          <p className="text-gray-500 mt-1">欢迎回来，{user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} className="w-auto" />
          <Input placeholder="搜索员工姓名..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-[200px]" />
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
        </div>
      </motion.div>
      
      {/* Stat Cards */}
      <motion.div variants={itemVariants}>
        <StatCards stats={stats} activeFilter={statusFilter} onFilterChange={handleStatFilterChange} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ReportSummaryCard
          summary={reportSummary}
          title="HR 月度执行摘要"
          description={`${currentMonth} 公司绩效完成情况、分布和发布风险`}
        />
      </motion.div>

      {showSuggestionSummary && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                合理化建议汇总
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs text-gray-500">建议数</p>
                  <p className="mt-1 text-xl font-bold text-amber-700">{suggestionSummary?.totalCount || 0}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-gray-500">显名</p>
                  <p className="mt-1 text-xl font-bold text-blue-700">{suggestionSummary?.namedCount || 0}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">匿名</p>
                  <p className="mt-1 text-xl font-bold text-gray-700">{suggestionSummary?.anonymousCount || 0}</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {(suggestionSummary?.suggestions || []).slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-lg border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{item.employeeName}</p>
                      <Badge className={item.anonymous ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}>
                        {item.anonymous ? '匿名' : '显名'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{item.department || '—'}{item.subDepartment ? ` / ${item.subDepartment}` : ''}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.suggestion}</p>
                  </div>
                ))}
              </div>
              {(suggestionSummary?.totalCount || 0) === 0 && (
                <p className="text-sm text-gray-500">本月暂无合理化建议。</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Department Performance Table */}
      <motion.div ref={tableSectionRef} variants={itemVariants}>
        <DeptPerformanceTable
          currentMonth={currentMonth}
          deptRecords={filteredDeptRecords}
          sortBy={sortBy}
          sortOrder={sortOrder}
          setSortBy={setSortBy}
          setSortOrder={setSortOrder}
          onEmployeeClick={(emp) => { setSelectedEmployee(emp); setDetailDrawerOpen(true); }}
          statusFilter={statusFilter}
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
