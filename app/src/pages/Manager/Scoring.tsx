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
import { getLevelLabel, getLevelColor, resolveGroupType } from '@/lib/config';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { performanceApi, employeeApi } from '@/services/api';
import { useMemo } from 'react';
import { toast } from 'sonner';

// Sub-components
import { ScoringDialog } from './Scoring/ScoringDialog';
import { ScoredRankingTable } from './Scoring/ScoredRankingTable';

export function ScoringManagement() {
  const { user } = useAuthStore();
  const { records, fetchTeamRecords, submitScore, loading } = usePerformanceStore();
  const [searchParams] = useSearchParams();
  
  const employeeParam = searchParams.get('employee');
  const monthParam = searchParams.get('month');
  const noSummaryParam = searchParams.get('noSummary');
  
  const [searchQuery] = useState('');
  const [statusFilter] = useState<string>(employeeParam ? 'all' : 'pending');
  const [groupFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMonth] = useState(monthParam || format(new Date(), 'yyyy-MM'));
  const [isNoSummary, setIsNoSummary] = useState(false);
  const hasHandledParams = useRef(false);
  
  const [scores, setScores] = useState({ taskCompletion: 1.0, initiative: 1.0, projectFeedback: 1.0, qualityImprovement: 1.0 });
  const [managerComment, setManagerComment] = useState('');
  const [nextMonthWorkArrangement, setNextMonthWorkArrangement] = useState('');
  const [subordinates, setSubordinates] = useState<any[]>([]);
  
  useEffect(() => {
    if (user && user.role === 'manager') {
      employeeApi.getSubordinates().then(r => { if (r.success) setSubordinates(r.data); }).catch(console.error);
    }
  }, [user]);
  
  useEffect(() => { if (user) fetchTeamRecords(user.id, selectedMonth); }, [user, fetchTeamRecords, selectedMonth]);
  
  const monthRecords = records.filter(r => r.month === selectedMonth);
  const scoredCount = monthRecords.filter(r => r.status === 'scored' || r.status === 'completed').length;
  const totalEmployees = subordinates.length;
  const progress = totalEmployees > 0 ? (scoredCount / totalEmployees) * 100 : 0;
  const hasAnyRecords = totalEmployees > 0;
  
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
    return subordinates.map(emp => {
      const record = monthRecords.find(r => r.employeeId === emp.id);
      if (record) return record;
      return {
        id: `temp-${emp.id}`, employeeId: emp.id, employeeName: emp.name,
        department: emp.department, subDepartment: emp.subDepartment, employeeLevel: emp.level,
        month: selectedMonth, selfSummary: '', nextMonthPlan: '',
        taskCompletion: 1.0, initiative: 1.0, projectFeedback: 1.0, qualityImprovement: 1.0,
        totalScore: 0, status: 'not_submitted',
        groupType: resolveGroupType(record?.groupType, emp.level)
      };
    });
  }, [subordinates, monthRecords, selectedMonth]);

  const filteredAllRecords = useMemo(() => {
    return allEmployeeRecords.filter(record => {
      const matchesSearch = record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'pending' && (record.status === 'submitted' || record.status === 'draft' || record.status === 'not_submitted')) ||
        (statusFilter === 'scored' && (record.status === 'scored' || record.status === 'completed'));
      const matchesGroup = groupFilter === 'all' || record.groupType === groupFilter;
      return matchesSearch && matchesStatus && matchesGroup;
    });
  }, [allEmployeeRecords, searchQuery, statusFilter, groupFilter]);
  
  const handleOpenDrawer = useCallback((record: any) => {
    setIsNoSummary(!record.selfSummary && !record.nextMonthPlan);
    setSelectedRecord(record);
    setScores({ taskCompletion: record.taskCompletion || 1.0, initiative: record.initiative || 1.0, projectFeedback: record.projectFeedback || 1.0, qualityImprovement: record.qualityImprovement || 1.0 });
    setManagerComment(record.managerComment || '');
    setNextMonthWorkArrangement(record.nextMonthWorkArrangement || '');
    setIsDrawerOpen(true);
  }, []);
  
  // Auto-open from URL params
  useEffect(() => {
    if (hasHandledParams.current || !employeeParam || !monthParam) return;
    const targetRecord = records.find(r => r.employeeId === employeeParam && r.month === monthParam);
    if (targetRecord) {
      handleOpenDrawer(targetRecord);
      hasHandledParams.current = true;
      window.history.replaceState({}, '', '/manager/scoring');
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
        window.history.replaceState({}, '', '/manager/scoring');
      }).catch(() => toast.error('获取员工信息失败'));
    }
  }, [employeeParam, monthParam, noSummaryParam, records, handleOpenDrawer]);
  
  const handleSubmit = async () => {
    if (!selectedRecord) return;
    let recordId = selectedRecord.id;
    
    if (isNoSummary) {
      try {
        const response = await performanceApi.createEmptyRecord({ employeeId: selectedRecord.employeeId, month: selectedRecord.month });
        if (response.success) { recordId = response.data.id; toast.success('已创建绩效记录'); }
        else { toast.error(response.message || '创建记录失败'); return; }
      } catch (error: any) { toast.error(error.message || '创建记录失败'); return; }
    }
    
    const success = await submitScore({ id: recordId, ...scores, managerComment, nextMonthWorkArrangement });
    if (success) {
      setIsDrawerOpen(false); setSelectedRecord(null); setIsNoSummary(false);
      toast.success('评分提交成功');
      if (user) await fetchTeamRecords(user.id, selectedMonth);
    }
  };
  
  const totalScore = calculateTotalScore(scores.taskCompletion, scores.initiative, scores.projectFeedback, scores.qualityImprovement);
  
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

  const getGroupBadge = (groupType: 'high' | 'low' | null, level?: any) => {
    const resolved = resolveGroupType(groupType, level);
    if (!resolved) return <Badge variant="outline" className="text-gray-400">未分组</Badge>;
    return resolved === 'high'
      ? <Badge className="bg-purple-100 text-purple-700">高分组</Badge>
      : <Badge className="bg-green-100 text-green-700">低分组</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Scored ranking */}
      <ScoredRankingTable records={records} onOpenDrawer={handleOpenDrawer} />

      {/* All employees list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">员工列表<Badge variant="outline" className="ml-2">{filteredAllRecords.length}人</Badge></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>员工姓名</TableHead>
                  <TableHead>级别</TableHead>
                  <TableHead>分组</TableHead>
                  <TableHead className="text-center">组内排名</TableHead>
                  <TableHead className="text-center">跨部门排名</TableHead>
                  <TableHead>考核月份</TableHead>
                  <TableHead>工作总结</TableHead>
                  <TableHead>评分状态</TableHead>
                  <TableHead className="text-right">综合得分</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllRecords.map((record) => {
                  const isPending = record.status === 'submitted' || record.status === 'draft';
                  const isScored = record.status === 'completed' || record.status === 'scored';
                  const isNotSubmitted = record.status === 'not_submitted';
                  const hasSummary = record.selfSummary && record.selfSummary.length > 0;
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: `${getLevelColor(record.employeeLevel)}20`, color: getLevelColor(record.employeeLevel) }}>
                          {getLevelLabel(record.employeeLevel)}
                        </span>
                      </TableCell>
                      <TableCell>{getGroupBadge(record.groupType, record.employeeLevel)}</TableCell>
                      <TableCell className="text-center">{record.groupRank || '—'}</TableCell>
                      <TableCell className="text-center">{record.crossDeptRank || '—'}</TableCell>
                      <TableCell>{record.month}</TableCell>
                      <TableCell>
                        {hasSummary
                          ? <span className="inline-flex items-center gap-1 text-green-600 text-sm"><CheckCircle2 className="w-4 h-4" />已提交</span>
                          : <span className="inline-flex items-center gap-1 text-gray-400 text-sm"><Clock className="w-4 h-4" />未提交总结</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-right">
                        {record.totalScore > 0 ? <ScoreDisplay score={record.totalScore} showLabel={false} size="sm" /> : <span className="text-gray-400">-</span>}
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
        totalScore={totalScore}
        loading={loading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
