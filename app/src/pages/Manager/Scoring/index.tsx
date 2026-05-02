import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { calculateTotalScore } from '@/lib/calculateScore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getLevelLabel, getLevelColor } from '@/lib/config';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { performanceApi, employeeApi, employeeQuarterlyApi } from '@/services/api';
import { useMemo } from 'react';
import { toast } from 'sonner';

// Sub-components
import { ScoringDialog } from './ScoringDialog';

function getQuarterFromMonth(month: string) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  return {
    year,
    quarter: Math.ceil(monthNumber / 3)
  };
}

function getQuarterKeyFromMonth(month: string) {
  const { year, quarter } = getQuarterFromMonth(month);
  return `${year}-Q${quarter}`;
}

const MONTH_OPTIONS = Array.from({ length: 18 }, (_, index) => {
  const date = new Date();
  date.setMonth(date.getMonth() - index);
  return {
    value: format(date, 'yyyy-MM'),
    label: format(date, 'yyyy年M月')
  };
});

export function ScoringManagement({
  embedded = false,
  month,
  hideProgress = false,
}: {
  embedded?: boolean;
  month?: string;
  hideProgress?: boolean;
}) {
  const { user } = useAuthStore();
  const { records, fetchTeamRecords, submitScore, loading } = usePerformanceStore();
  const [searchParams] = useSearchParams();
  
  const employeeParam = searchParams.get('employee');
  const monthParam = searchParams.get('month');
  const noSummaryParam = searchParams.get('noSummary');
  
  const [searchQuery] = useState('');
  const statusFilter = 'all';
  const initialMonth = monthParam || month || format(new Date(), 'yyyy-MM');
  const [viewMode, setViewMode] = useState<'month' | 'employee'>('month');
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeParam || '');
  const [teamHistoryRecords, setTeamHistoryRecords] = useState<any[]>([]);
  const [historyQuarterlySummaries, setHistoryQuarterlySummaries] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNoSummary, setIsNoSummary] = useState(false);
  const hasHandledParams = useRef(false);
  
  const [scores, setScores] = useState({ taskCompletion: 1.0, initiative: 1.0, projectFeedback: 1.0, qualityImprovement: 1.0 });
  const [managerComment, setManagerComment] = useState('');
  const [nextMonthWorkArrangement, setNextMonthWorkArrangement] = useState('');
  const [evaluationKeywords, setEvaluationKeywords] = useState<string[]>([]);
  const [issueTypeTags, setIssueTypeTags] = useState<string[]>([]);
  const [highlightTags, setHighlightTags] = useState<string[]>([]);
  const [workTypeTags, setWorkTypeTags] = useState<string[]>([]);
  const [improvementActionTags, setImprovementActionTags] = useState<string[]>([]);
  const [issueAttributionTags, setIssueAttributionTags] = useState<string[]>([]);
  const [workloadTags, setWorkloadTags] = useState<string[]>([]);
  const [managerSuggestionTags, setManagerSuggestionTags] = useState<string[]>([]);
  const [scoreEvidence, setScoreEvidence] = useState('');
  const [monthlyStarRecommended, setMonthlyStarRecommended] = useState(false);
  const [monthlyStarCategory, setMonthlyStarCategory] = useState('');
  const [monthlyStarReason, setMonthlyStarReason] = useState('');
  const [monthlyStarPublic, setMonthlyStarPublic] = useState(true);
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [quarterlySummaries, setQuarterlySummaries] = useState<any[]>([]);

  useEffect(() => {
    setSelectedMonth(initialMonth);
  }, [initialMonth]);
  
  useEffect(() => {
    const canManageTeam = Boolean(user?.capabilities?.canManageTeam || user?.roles?.includes('manager') || user?.role === 'manager');
    if (user && canManageTeam) {
      employeeApi.getSubordinates().then(r => { if (r.success) setSubordinates(r.data); }).catch((error) => { console.error(error); toast.error('获取下属列表失败'); });
    }
  }, [user]);
  
  useEffect(() => { if (user) fetchTeamRecords(user.id, selectedMonth); }, [user, fetchTeamRecords, selectedMonth]);

  const currentQuarter = useMemo(() => getQuarterFromMonth(selectedMonth), [selectedMonth]);

  useEffect(() => {
    const canManageTeam = Boolean(user?.capabilities?.canManageTeam || user?.roles?.includes('manager') || user?.role === 'manager');
    if (!user || !canManageTeam || !currentQuarter.year || !currentQuarter.quarter) return;

    employeeQuarterlyApi.getTeam(currentQuarter)
      .then((response) => {
        if (response.success) setQuarterlySummaries(response.data || []);
      })
      .catch((error) => {
        console.error(error);
        setQuarterlySummaries([]);
      });
  }, [user, currentQuarter]);

  useEffect(() => {
    if (viewMode !== 'employee' || selectedEmployeeId || subordinates.length === 0) return;
    setSelectedEmployeeId(subordinates[0].id);
  }, [viewMode, selectedEmployeeId, subordinates]);

  useEffect(() => {
    const canManageTeam = Boolean(user?.capabilities?.canManageTeam || user?.roles?.includes('manager') || user?.role === 'manager');
    if (!user || !canManageTeam || viewMode !== 'employee') return;

    performanceApi.getTeamRecords()
      .then((response) => {
        if (response.success) setTeamHistoryRecords(response.data || []);
      })
      .catch((error) => {
        console.error(error);
        setTeamHistoryRecords([]);
        toast.error('获取员工历史绩效失败');
      });
  }, [user, viewMode]);
  
  const monthRecords = records.filter(r => r.month === selectedMonth);
  const scoredCount = monthRecords.filter(r => r.status === 'scored' || r.status === 'completed').length;
  const totalEmployees = subordinates.length;
  const progress = totalEmployees > 0 ? (scoredCount / totalEmployees) * 100 : 0;
  const hasAnyRecords = totalEmployees > 0;
  const quarterlySummaryMap = useMemo(() => (
    new Map(quarterlySummaries.map((record) => [record.employeeId || record.employee_id, record]))
  ), [quarterlySummaries]);

  const selectedEmployeeHistoryRecords = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return teamHistoryRecords
      .filter((record) => record.employeeId === selectedEmployeeId)
      .sort((a, b) => String(b.month || '').localeCompare(String(a.month || '')));
  }, [selectedEmployeeId, teamHistoryRecords]);

  const historyQuarterKeyList = useMemo(() => (
    Array.from(new Set(selectedEmployeeHistoryRecords
      .map((record) => getQuarterKeyFromMonth(record.month))
      .filter(Boolean)))
      .sort()
  ), [selectedEmployeeHistoryRecords]);

  useEffect(() => {
    if (viewMode !== 'employee' || historyQuarterKeyList.length === 0) {
      setHistoryQuarterlySummaries([]);
      return;
    }

    Promise.all(historyQuarterKeyList.map((key) => {
      const [yearText, quarterText] = key.split('-Q');
      return employeeQuarterlyApi.getTeam({ year: Number(yearText), quarter: Number(quarterText) });
    }))
      .then((responses) => {
        setHistoryQuarterlySummaries(responses.flatMap((response) => response.success ? (response.data || []) : []));
      })
      .catch((error) => {
        console.error(error);
        setHistoryQuarterlySummaries([]);
      });
  }, [viewMode, historyQuarterKeyList]);

  const historyQuarterlySummaryMap = useMemo(() => {
    const map = new Map<string, any>();
    historyQuarterlySummaries.forEach((record) => {
      const employeeId = record.employeeId || record.employee_id;
      map.set(`${employeeId}-${record.year}-Q${record.quarter}`, record);
    });
    return map;
  }, [historyQuarterlySummaries]);
  
  const getDeadlineMessage = () => {
    if (totalEmployees === 0) return { message: '', color: 'text-gray-500', bgColor: 'bg-gray-50' };
    const [year, month] = selectedMonth.split('-');
    const deadline = new Date(parseInt(year), parseInt(month), 3);
    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { message: '已逾期！', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (daysLeft === 0) return { message: '今天是截止日！', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    if (daysLeft <= 2) return { message: `还剩${daysLeft}天！`, color: 'text-orange-600', bgColor: 'bg-orange-50' };
    return { message: `截止日：${format(deadline, 'M月d日')}`, color: 'text-gray-600', bgColor: 'bg-gray-50' };
  };
  const deadlineInfo = getDeadlineMessage();

  const allEmployeeRecords = useMemo(() => {
    if (viewMode === 'employee') {
      return selectedEmployeeHistoryRecords.map((record) => ({
        ...record,
        quarterlySummary: historyQuarterlySummaryMap.get(`${record.employeeId}-${getQuarterKeyFromMonth(record.month)}`)
      }));
    }

    return subordinates.map(emp => {
      const record = monthRecords.find(r => r.employeeId === emp.id);
      const quarterlySummary = quarterlySummaryMap.get(emp.id);
      if (record) return record;
      return {
        id: `temp-${emp.id}`, employeeId: emp.id, employeeName: emp.name,
        department: emp.department, subDepartment: emp.subDepartment, employeeLevel: emp.level,
        month: selectedMonth, selfSummary: '', nextMonthPlan: '',
        taskCompletion: 1.0, initiative: 1.0, projectFeedback: 1.0, qualityImprovement: 1.0,
        totalScore: 0, status: 'not_submitted',
        quarterlySummary,
      };
    }).map((record) => ({
      ...record,
      quarterlySummary: quarterlySummaryMap.get(record.employeeId) || record.quarterlySummary,
    }));
  }, [viewMode, selectedEmployeeHistoryRecords, historyQuarterlySummaryMap, subordinates, monthRecords, selectedMonth, quarterlySummaryMap]);

  const filteredAllRecords = useMemo(() => {
    return allEmployeeRecords.filter(record => {
      const matchesSearch = record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'pending' && (record.status === 'submitted' || record.status === 'draft' || record.status === 'not_submitted')) ||
        (statusFilter === 'scored' && (record.status === 'scored' || record.status === 'completed'));
      return matchesSearch && matchesStatus;
    });
  }, [allEmployeeRecords, searchQuery, statusFilter]);

  const distributionStats = useMemo(() => {
    if (allEmployeeRecords.length <= 10) return null;
    const scoredRecords = allEmployeeRecords.filter(record =>
      (record.status === 'completed' || record.status === 'scored') && Number(record.totalScore) > 0
    );
    const topCount = scoredRecords.filter(record => Number(record.totalScore) >= 1.4).length;
    const bottomCount = scoredRecords.filter(record => Number(record.totalScore) < 0.9).length;
    const topQuota = Math.ceil(allEmployeeRecords.length * 0.2);
    const bottomRequired = Math.max(1, Math.floor(allEmployeeRecords.length * 0.1));
    return {
      topCount,
      bottomCount,
      middleCount: Math.max(0, scoredRecords.length - topCount - bottomCount),
      topQuota,
      bottomRequired,
      total: allEmployeeRecords.length,
      scored: scoredRecords.length
    };
  }, [allEmployeeRecords]);
  
  const handleOpenDrawer = useCallback((record: any) => {
    setIsNoSummary(!record.selfSummary && !record.nextMonthPlan);
    setSelectedRecord(record);
    setScores({ taskCompletion: record.taskCompletion || 1.0, initiative: record.initiative || 1.0, projectFeedback: record.projectFeedback || 1.0, qualityImprovement: record.qualityImprovement || 1.0 });
    setManagerComment(record.managerComment || '');
    setNextMonthWorkArrangement(record.nextMonthWorkArrangement || '');
    setEvaluationKeywords(record.evaluationKeywords || []);
    setIssueTypeTags(record.issueTypeTags || []);
    setHighlightTags(record.highlightTags || []);
    setWorkTypeTags(record.workTypeTags || []);
    setImprovementActionTags(record.improvementActionTags || []);
    setIssueAttributionTags(record.issueAttributionTags || []);
    setWorkloadTags(record.workloadTags || []);
    setManagerSuggestionTags(record.managerSuggestionTags || []);
    setScoreEvidence(record.scoreEvidence || '');
    setMonthlyStarRecommended(record.monthlyStarRecommended === true);
    setMonthlyStarCategory(record.monthlyStarCategory || '');
    setMonthlyStarReason(record.monthlyStarReason || '');
    setMonthlyStarPublic(record.monthlyStarPublic !== false);
    setIsDrawerOpen(true);
  }, []);
  
  // Auto-open from URL params
  useEffect(() => {
    if (hasHandledParams.current || !employeeParam || !monthParam) return;
    const targetRecord = records.find(r => r.employeeId === employeeParam && r.month === monthParam);
    if (targetRecord) {
      handleOpenDrawer(targetRecord);
      hasHandledParams.current = true;
        window.history.replaceState({}, '', '/manager/dashboard');
      } else if (noSummaryParam === 'true') {
        employeeApi.getById(employeeParam).then(response => {
        const employee = response.data;
        const tempRecord = {
          id: '', employeeId: employeeParam, employeeName: employee?.name || employeeParam,
          department: employee?.department || '', subDepartment: employee?.subDepartment || '',
          employeeLevel: employee?.level || '', month: monthParam, selfSummary: '', nextMonthPlan: '',
          taskCompletion: 1.0, initiative: 1.0, projectFeedback: 1.0, qualityImprovement: 1.0, status: 'not_submitted'
        };
        setIsNoSummary(true);
        handleOpenDrawer(tempRecord);
        hasHandledParams.current = true;
        window.history.replaceState({}, '', '/manager/dashboard');
      }).catch(() => toast.error('获取员工信息失败'));
    }
  }, [employeeParam, monthParam, noSummaryParam, records, handleOpenDrawer]);
  
  const handleSubmit = async () => {
    if (!selectedRecord) return;
    let recordId = selectedRecord.id;
    const needsCreateRecord = isNoSummary && (!recordId || String(recordId).startsWith('temp-'));
    
    if (needsCreateRecord) {
      try {
        const response = await performanceApi.createEmptyRecord({ employeeId: selectedRecord.employeeId, month: selectedRecord.month });
        if (response.success) { recordId = response.data.id; toast.success('已创建绩效记录'); }
        else { toast.error(response.message || response.error || '创建记录失败'); return; }
      } catch (error: any) { toast.error(error.message || '创建记录失败'); return; }
    }

    if (requiresScoreEvidence && scoreEvidence.trim().length < 10) {
      toast.error('评分特别优秀或明显偏低时，请填写不少于10个字的具体事例说明');
      return;
    }

    if (monthlyStarRecommended && (!monthlyStarCategory || monthlyStarReason.trim().length < 10)) {
      toast.error('推荐每月之星时，请选择类型并填写不少于10个字的推荐理由');
      return;
    }
    
    const success = await submitScore({
      id: recordId,
      ...scores,
      managerComment,
      nextMonthWorkArrangement,
      evaluationKeywords,
      issueTypeTags,
      highlightTags,
      workTypeTags,
      improvementActionTags,
      issueAttributionTags,
      workloadTags,
      managerSuggestionTags,
      scoreEvidence,
      monthlyStarRecommended,
      monthlyStarCategory,
      monthlyStarReason,
      monthlyStarPublic
    });
    if (success) {
      setIsDrawerOpen(false); setSelectedRecord(null); setIsNoSummary(false);
      toast.success('评分提交成功');
      if (user) await fetchTeamRecords(user.id, selectedMonth);
    } else {
      toast.error(usePerformanceStore.getState().error || '评分提交失败');
    }
  };
  
  const totalScore = calculateTotalScore(scores.taskCompletion, scores.initiative, scores.projectFeedback, scores.qualityImprovement);

  const requiresScoreEvidence = totalScore >= 1.4 || totalScore < 0.9;
  
  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      completed: { cls: 'bg-green-100 text-green-800 hover:bg-green-100', label: '已完成' },
      scored: { cls: 'bg-blue-100 text-blue-800 hover:bg-blue-100', label: '已评分' },
      submitted: { cls: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', label: '待评分' },
      draft: { cls: 'bg-gray-100 text-gray-800 hover:bg-gray-100', label: '草稿' },
      not_submitted: { cls: 'bg-orange-100 text-orange-800 hover:bg-orange-100', label: '未提交总结' },
    };
    const item = map[status] || { cls: '', label: '未知' };
    return <Badge className={item.cls}>{item.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">评分管理</h1>
            <p className="text-gray-500 mt-1">分组评分 · 排名分析</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {(totalEmployees - scoredCount) > 0
                ? <AlertCircle className="w-5 h-5 text-yellow-500" />
                : <CheckCircle2 className="w-5 h-5 text-green-500" />}
              <div>
                <p className="font-medium text-sm">
                  {(totalEmployees - scoredCount) > 0 ? `${totalEmployees - scoredCount} 位员工待评分` : '本月已完成'}
                </p>
                <p className="text-xs text-gray-500">{hasAnyRecords && <span className={deadlineInfo.color}>{deadlineInfo.message}</span>}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{scoredCount}/{totalEmployees}</p>
              <p className="text-xs text-gray-500">已完成</p>
            </div>
            {hasAnyRecords && <div className="w-24"><Progress value={progress} className="h-2" /></div>}
          </div>
        </div>
      )}

      {embedded && !hideProgress && (
        <Card className={cn(deadlineInfo.bgColor, "border border-gray-200")}>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                {(totalEmployees - scoredCount) > 0
                  ? <AlertCircle className="w-5 h-5 text-yellow-500" />
                  : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                <div>
                  <p className="font-medium text-sm">
                    {(totalEmployees - scoredCount) > 0 ? `${totalEmployees - scoredCount} 位员工待评分` : '本月已完成'}
                  </p>
                  <p className="text-xs text-gray-500">{hasAnyRecords && <span className={deadlineInfo.color}>{deadlineInfo.message}</span>}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xl font-bold">{scoredCount}/{totalEmployees}</p>
                  <p className="text-xs text-gray-500">月度评分进度</p>
                </div>
                {hasAnyRecords && <div className="w-28"><Progress value={progress} className="h-2" /></div>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {distributionStats && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="pt-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-amber-900">本部门 {distributionStats.total} 人，发布前需满足 2-7-1 区分度</p>
                <p className="text-sm text-amber-700">
                  优秀最多 {distributionStats.topQuota} 人，末位至少 {distributionStats.bottomRequired} 人；当前已评分 {distributionStats.scored} 人。
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">优秀 {distributionStats.topCount}/{distributionStats.topQuota}</Badge>
                <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">中间 {distributionStats.middleCount}</Badge>
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">末位 {distributionStats.bottomCount}/{distributionStats.bottomRequired}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">查看方式</p>
              <p className="text-xs text-gray-500">
                按月查看部门所有员工；按员工查看该员工全部历史月份。
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'month' | 'employee')}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">按月看部门</SelectItem>
                  <SelectItem value="employee">按员工看历史</SelectItem>
                </SelectContent>
              </Select>

              {viewMode === 'month' && embedded ? (
                <Badge variant="outline" className="h-10 px-4 text-sm">
                  当前月份：{selectedMonth}
                </Badge>
              ) : viewMode === 'month' ? (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full sm:w-[170px]">
                    <SelectValue placeholder="选择月份" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="选择员工" />
                  </SelectTrigger>
                  <SelectContent>
                    {subordinates.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}（{employee.department || '未分部门'}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All employees list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            {viewMode === 'month' ? `${selectedMonth} 部门员工情况` : `${subordinates.find((employee) => employee.id === selectedEmployeeId)?.name || '员工'}历史月度情况`}
            <Badge variant="outline" className="ml-2">
              {filteredAllRecords.length}{viewMode === 'month' ? '人' : '条'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>员工姓名</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>级别</TableHead>
                  <TableHead>考核月份</TableHead>
                  <TableHead>工作总结</TableHead>
                  <TableHead>评分状态</TableHead>
                  <TableHead className="text-right">月度得分/部门排名</TableHead>
                  <TableHead className="text-right">季度汇总/部门排名</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllRecords.map((record) => {
                  const isPending = record.status === 'submitted' || record.status === 'draft';
                  const isScored = record.status === 'completed' || record.status === 'scored';
                  const isNotSubmitted = record.status === 'not_submitted';
                  const hasSummary = record.selfSummary && record.selfSummary.length > 0;
                  const quarterlySummary = record.quarterlySummary;
                  const quarterRank = quarterlySummary?.departmentQuarterRank || quarterlySummary?.quarterRank || 0;
                  return (
                    <TableRow key={record.id}
                      className={cn("cursor-pointer", isPending && "bg-yellow-50/50 hover:bg-yellow-50", isScored && "bg-green-50/30 hover:bg-green-50", isNotSubmitted && "hover:bg-gray-50")}
                      onClick={() => handleOpenDrawer(record)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                            isPending ? "bg-yellow-100 text-yellow-700" : isScored ? "bg-green-100 text-green-700" : isNotSubmitted ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"
                          )}>{record.employeeName.charAt(0)}</div>
                          <span className="font-medium">{record.employeeName}</span>
                          {isPending && <Badge className="bg-red-100 text-red-800 text-xs">待办</Badge>}
                          {isScored && <Badge className="bg-green-100 text-green-800 text-xs">已评分</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700">{record.department || '—'}</div>
                        {record.subDepartment && <div className="text-xs text-gray-400">{record.subDepartment}</div>}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: `${getLevelColor(record.employeeLevel)}20`, color: getLevelColor(record.employeeLevel) }}>
                          {getLevelLabel(record.employeeLevel)}
                        </span>
                      </TableCell>
                      <TableCell>{record.month}</TableCell>
                      <TableCell>
                        {hasSummary
                          ? <span className="inline-flex items-center gap-1 text-green-600 text-sm"><CheckCircle2 className="w-4 h-4" />已提交</span>
                          : <span className="inline-flex items-center gap-1 text-gray-400 text-sm"><Clock className="w-4 h-4" />未提交总结</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-right">
                        {record.totalScore > 0 ? (
                          <div className="space-y-1">
                            <ScoreDisplay score={record.totalScore} showLabel={false} size="sm" />
                            <p className="text-xs text-gray-500">
                              部门排名 {record.departmentRank ? `#${record.departmentRank}` : '—'}
                            </p>
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {quarterlySummary ? (
                          <div className="space-y-1">
                            <ScoreDisplay score={Number(quarterlySummary.avgScore || quarterlySummary.avg_score || 0)} showLabel={false} size="sm" />
                            <p className="text-xs text-gray-500">
                              Q{quarterlySummary.quarter || currentQuarter.quarter} 部门排名 {quarterRank ? `#${quarterRank}` : '—'}
                            </p>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant={isPending || isNotSubmitted ? "default" : "outline"} size="sm"
                          onClick={(e) => { e.stopPropagation(); handleOpenDrawer(record); }}>
                          {isPending || isNotSubmitted ? '去评分' : isScored ? '修改' : '查看'}<ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredAllRecords.length === 0 && (
            <div className="text-center py-12"><FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">暂无员工</p></div>
          )}
        </CardContent>
      </Card>
      
      {/* Scoring Dialog */}
      <ScoringDialog
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        selectedRecord={selectedRecord}
        isNoSummary={isNoSummary}
        scores={scores}
        setScores={setScores}
        managerComment={managerComment}
        setManagerComment={setManagerComment}
        nextMonthWorkArrangement={nextMonthWorkArrangement}
        setNextMonthWorkArrangement={setNextMonthWorkArrangement}
        evaluationKeywords={evaluationKeywords}
        setEvaluationKeywords={setEvaluationKeywords}
        issueTypeTags={issueTypeTags}
        setIssueTypeTags={setIssueTypeTags}
        highlightTags={highlightTags}
        setHighlightTags={setHighlightTags}
        workTypeTags={workTypeTags}
        setWorkTypeTags={setWorkTypeTags}
        improvementActionTags={improvementActionTags}
        setImprovementActionTags={setImprovementActionTags}
        issueAttributionTags={issueAttributionTags}
        setIssueAttributionTags={setIssueAttributionTags}
        workloadTags={workloadTags}
        setWorkloadTags={setWorkloadTags}
        managerSuggestionTags={managerSuggestionTags}
        setManagerSuggestionTags={setManagerSuggestionTags}
        scoreEvidence={scoreEvidence}
        setScoreEvidence={setScoreEvidence}
        monthlyStarRecommended={monthlyStarRecommended}
        setMonthlyStarRecommended={setMonthlyStarRecommended}
        monthlyStarCategory={monthlyStarCategory}
        setMonthlyStarCategory={setMonthlyStarCategory}
        monthlyStarReason={monthlyStarReason}
        setMonthlyStarReason={setMonthlyStarReason}
        monthlyStarPublic={monthlyStarPublic}
        setMonthlyStarPublic={setMonthlyStarPublic}
        totalScore={totalScore}
        loading={loading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
