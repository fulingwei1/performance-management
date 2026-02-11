import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Send, X, ChevronRight, AlertCircle, CheckCircle2, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { ScoreSelectorWithCriteria } from '@/components/score/ScoreSelectorWithCriteria';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { calculateTotalScore } from '@/lib/calculateScore';
import { Button } from '@/components/ui/button';
// Input component not currently used
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
// Select component imports - retained for future use
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { scoreDimensions, scoreLevels, getLevelLabel, getLevelColor, resolveGroupType } from '@/lib/config';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { performanceApi, employeeApi } from '@/services/api';
import { useMemo } from 'react';
import { toast } from 'sonner';

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
  
  // 评分表单状态
  const [scores, setScores] = useState({
    taskCompletion: 1.0,
    initiative: 1.0,
    projectFeedback: 1.0,
    qualityImprovement: 1.0
  });
  const [managerComment, setManagerComment] = useState('');
  const [nextMonthWorkArrangement, setNextMonthWorkArrangement] = useState('');
  const [subordinates, setSubordinates] = useState<any[]>([]);
  
  // 获取下属员工列表
  useEffect(() => {
    const fetchSubordinates = async () => {
      try {
        const response = await employeeApi.getSubordinates();
        if (response.success) {
          setSubordinates(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch subordinates:', error);
      }
    };
    
    if (user && user.role === 'manager') {
      fetchSubordinates();
    }
  }, [user]);
  
  useEffect(() => {
    if (user) {
      fetchTeamRecords(user.id, selectedMonth);
    }
  }, [user, fetchTeamRecords, selectedMonth]);
  
  // 筛选记录（按月筛选）
  // Filtering logic for records (used indirectly via allEmployeeRecords)
  void searchQuery; void statusFilter; void groupFilter;
  
  // 统计（按月）
  const monthRecords = records.filter(r => r.month === selectedMonth);
  const pendingCount = monthRecords.filter(r => r.status === 'submitted' || r.status === 'draft').length;
  const scoredCount = monthRecords.filter(r => r.status === 'scored' || r.status === 'completed').length;
  const totalEmployees = subordinates.length;
  const notSubmittedCount = totalEmployees - monthRecords.length;
  void (pendingCount + notSubmittedCount); // 待处理 = 已提交待评分 + 未提交
  const progress = totalEmployees > 0 ? (scoredCount / totalEmployees) * 100 : 0;

  // 如果没有员工，不显示已完成状态
  const hasAnyRecords = totalEmployees > 0;
  
  // 计算截止日期提醒
  const getDeadlineMessage = () => {
    if (totalEmployees === 0) {
      return { message: '', color: 'text-gray-500', bgColor: 'bg-gray-50' };
    }

    const [year, month] = selectedMonth.split('-');
    const deadline = new Date(parseInt(year), parseInt(month), 3); // 每月3号（parseInt('03') = 3，不需要减1）
    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { message: '已逾期！', color: 'text-red-600', bgColor: 'bg-red-50' };
    } else if (daysLeft === 0) {
      return { message: '今天是截止日！', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    } else if (daysLeft <= 2) {
      return { message: `还剩${daysLeft}天！`, color: 'text-orange-600', bgColor: 'bg-orange-50' };
    } else {
      return { message: `截止日：${format(deadline, 'M月d日')}`, color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };
  
  const deadlineInfo = getDeadlineMessage();
  
  // 分组统计 (保留供后续筛选功能使用)

  // 构建完整的员工列表（包括未提交的员工）
  const allEmployeeRecords = useMemo(() => {
    return subordinates.map(emp => {
      const record = monthRecords.find(r => r.employeeId === emp.id);
      if (record) {
        return record;
      }
      // 没有记录的员工，创建一个虚拟记录
      return {
        id: `temp-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        subDepartment: emp.subDepartment,
        employeeLevel: emp.level,
        month: selectedMonth,
        selfSummary: '',
        nextMonthPlan: '',
        taskCompletion: 1.0,
        initiative: 1.0,
        projectFeedback: 1.0,
        qualityImprovement: 1.0,
        totalScore: 0,
        status: 'not_submitted',
        groupType: resolveGroupType(record?.groupType, emp.level)
      };
    });
  }, [subordinates, monthRecords, selectedMonth]);

  // 筛选所有员工记录
  const filteredAllRecords = useMemo(() => {
    return allEmployeeRecords.filter(record => {
      const matchesSearch = record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesStatus = false;
      if (statusFilter === 'all') {
        matchesStatus = true;
      } else if (statusFilter === 'pending') {
        // 待评分：已提交待评分 + 未提交
        matchesStatus = record.status === 'submitted' || record.status === 'draft' || record.status === 'not_submitted';
      } else if (statusFilter === 'scored') {
        // 已评分：包括 scored 和 completed
        matchesStatus = record.status === 'scored' || record.status === 'completed';
      }
      const matchesGroup = groupFilter === 'all' || record.groupType === groupFilter;
      return matchesSearch && matchesStatus && matchesGroup;
    });
  }, [allEmployeeRecords, searchQuery, statusFilter, groupFilter]);
  
  const handleOpenDrawer = useCallback((record: any) => {
    const isNoSummaryFlag = !record.selfSummary && !record.nextMonthPlan;
    setIsNoSummary(isNoSummaryFlag);
    
    setSelectedRecord(record);
    setScores({
      taskCompletion: record.taskCompletion ||1.0,
      initiative: record.initiative || 1.0,
      projectFeedback: record.projectFeedback || 1.0,
      qualityImprovement: record.qualityImprovement || 1.0
    });
    setManagerComment(record.managerComment || '');
    setNextMonthWorkArrangement(record.nextMonthWorkArrangement || '');
    
    setIsDrawerOpen(true);
  }, []);
  
  // 如果URL中有employee和month参数，自动打开对应的评分抽屉
  useEffect(() => {
    // 避免重复处理
    if (hasHandledParams.current || !employeeParam || !monthParam) {
      return;
    }
    
    const targetRecord = records.find(
      r => r.employeeId === employeeParam && r.month === monthParam
    );
    
    if (targetRecord) {
      handleOpenDrawer(targetRecord);
      hasHandledParams.current = true;
      // 清除URL参数，避免重复打开
      window.history.replaceState({}, '', '/manager/scoring');
    } else if (noSummaryParam === 'true') {
      // 员工未提交，需要先获取员工信息
      const fetchEmployeeAndOpenDrawer = async () => {
        try {
          const response = await employeeApi.getById(employeeParam);
          const employee = response.data;
          
          // 创建临时record对象，使用真实员工信息
          const tempRecord = {
            id: '',
            employeeId: employeeParam,
            employeeName: employee?.name || employeeParam,
            department: employee?.department || '',
            subDepartment: employee?.subDepartment || '',
            employeeLevel: employee?.level || '',
            month: monthParam,
            selfSummary: '',
            nextMonthPlan: '',
            taskCompletion: 1.0,
            initiative: 1.0,
            projectFeedback: 1.0,
            qualityImprovement: 1.0,
            status: 'not_submitted'
          };
          
          setIsNoSummary(true);
          handleOpenDrawer(tempRecord);
          hasHandledParams.current = true;
          // 清除URL参数，避免重复打开
          window.history.replaceState({}, '', '/manager/scoring');
        } catch (error) {
          console.error('获取员工信息失败:', error);
          toast.error('获取员工信息失败');
        }
      };
      
      fetchEmployeeAndOpenDrawer();
    }
  }, [employeeParam, monthParam, noSummaryParam, records, handleOpenDrawer]);
  
  const handleSubmit = async () => {
    if (!selectedRecord) return;
    
    let recordId = selectedRecord.id;
    
    // 如果员工未提交总结，先创建空记录
    if (isNoSummary) {
      try {
        const response = await performanceApi.createEmptyRecord({
          employeeId: selectedRecord.employeeId,
          month: selectedRecord.month
        });
        
        if (response.success) {
          recordId = response.data.id;
          toast.success('已创建绩效记录');
        } else {
          toast.error(response.error || '创建记录失败');
          return;
        }
      } catch (error: any) {
        toast.error(error.message || '创建记录失败');
        return;
      }
    }
    
    // 提交评分
    const success = await submitScore({
      id: recordId,
      ...scores,
      managerComment,
      nextMonthWorkArrangement
    });
    
    if (success) {
      setIsDrawerOpen(false);
      setSelectedRecord(null);
      setIsNoSummary(false);
      toast.success('评分提交成功');
      // 刷新团队记录以确保数据同步
      if (user) {
        await fetchTeamRecords(user.id, selectedMonth);
      }
    }
  };
  
  const totalScore = calculateTotalScore(
    scores.taskCompletion,
    scores.initiative,
    scores.projectFeedback,
    scores.qualityImprovement
  );
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">已完成</Badge>;
      case 'scored':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">已评分</Badge>;
      case 'submitted':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">待评分</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">草稿</Badge>;
      case 'not_submitted':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">未提交总结</Badge>;
      default:
        return <Badge>未知</Badge>;
    }
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
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">评分管理</h1>
          <p className="text-gray-500 mt-1">分组评分 · 排名分析</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {(totalEmployees - scoredCount) > 0 ? (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
            <div>
              <p className="font-medium text-sm">
                {(totalEmployees - scoredCount) > 0
                  ? `${totalEmployees - scoredCount} 位员工待评分`
                  : '本月已完成'}
              </p>
              <p className="text-xs text-gray-500">
                {hasAnyRecords && <span className={deadlineInfo.color}>{deadlineInfo.message}</span>}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{scoredCount}/{totalEmployees}</p>
            <p className="text-xs text-gray-500">已完成</p>
          </div>
          {hasAnyRecords && (
            <div className="w-24">
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </div>
      

      
      {/* 已评分员工排名 */}
      {scoredCount > 0 && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              已评分员工排名（按综合得分排序）
              <Badge variant="outline" className="ml-2">{scoredCount}人</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-16">排名</TableHead>
                    <TableHead>员工姓名</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead>分组</TableHead>
                    <TableHead className="text-center">组内排名</TableHead>
                    <TableHead className="text-center">跨部门排名</TableHead>
                    <TableHead className="text-right">任务完成</TableHead>
                    <TableHead className="text-right">主动性</TableHead>
                    <TableHead className="text-right">项目反馈</TableHead>
                    <TableHead className="text-right">质量改进</TableHead>
                    <TableHead className="text-right">综合得分</TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records
                    .filter(r => r.status === 'completed' || r.status === 'scored')
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((record, index) => (
                    <TableRow 
                      key={record.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleOpenDrawer(record)}
                    >
                      <TableCell>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          index === 0 && "bg-yellow-100 text-yellow-700",
                          index === 1 && "bg-gray-100 text-gray-700",
                          index === 2 && "bg-orange-100 text-orange-700",
                          index > 2 && "bg-blue-100 text-blue-700"
                        )}>
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/manager/employee/${record.employeeId}`}
                            className="font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-2"
                          >
                            {record.employeeName}
                            <BarChart3 className="w-3 h-3" />
                          </Link>
                          {index < 3 && (
                            <Badge className={cn(
                              "text-xs",
                              index === 0 && "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
                              index === 1 && "bg-gray-100 text-gray-700 hover:bg-gray-100",
                              index === 2 && "bg-orange-100 text-orange-700 hover:bg-orange-100"
                            )}>
                              {index === 0 && '🥇'}
                              {index === 1 && '🥈'}
                              {index === 2 && '🥉'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${getLevelColor(record.employeeLevel)}20`,
                            color: getLevelColor(record.employeeLevel)
                          }}
                        >
                          {getLevelLabel(record.employeeLevel)}
                        </span>
                      </TableCell>
                      <TableCell>{getGroupBadge(record.groupType, record.employeeLevel)}</TableCell>
                      <TableCell className="text-center">{record.groupRank || '—'}</TableCell>
                      <TableCell className="text-center">{record.crossDeptRank || '—'}</TableCell>
                      <TableCell className="text-right">{record.taskCompletion.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{record.initiative.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{record.projectFeedback.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{record.qualityImprovement.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <ScoreDisplay score={record.totalScore} showLabel={false} size="sm" />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawer(record);
                          }}
                        >
                          修改
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            员工列表
            <Badge variant="outline" className="ml-2">
              {filteredAllRecords.length}人
            </Badge>
          </CardTitle>
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
                    <TableRow 
                      key={record.id}
                      className={cn(
                        "cursor-pointer",
                        isPending && "bg-yellow-50/50 hover:bg-yellow-50",
                        isScored && "bg-green-50/30 hover:bg-green-50",
                        isNotSubmitted && "hover:bg-gray-50"
                      )}
                      onClick={() => handleOpenDrawer(record)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                            isPending ? "bg-yellow-100 text-yellow-700" : 
                            isScored ? "bg-green-100 text-green-700" : 
                            isNotSubmitted ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {record.employeeName.charAt(0)}
                          </div>
                          <span className="font-medium">{record.employeeName}</span>
                          {isPending && (
                            <Badge className="bg-red-100 text-red-800 text-xs">待办</Badge>
                          )}
                          {isScored && (
                            <Badge className="bg-green-100 text-green-800 text-xs">已评分</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${getLevelColor(record.employeeLevel)}20`,
                            color: getLevelColor(record.employeeLevel)
                          }}
                        >
                          {getLevelLabel(record.employeeLevel)}
                        </span>
                      </TableCell>
                      <TableCell>{getGroupBadge(record.groupType, record.employeeLevel)}</TableCell>
                      <TableCell className="text-center">{record.groupRank || '—'}</TableCell>
                      <TableCell className="text-center">{record.crossDeptRank || '—'}</TableCell>
                      <TableCell>{record.month}</TableCell>
                      <TableCell>
                        {hasSummary ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            已提交
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
                            <Clock className="w-4 h-4" />
                            未提交总结
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-right">
                        {record.totalScore > 0 ? (
                          <ScoreDisplay score={record.totalScore} showLabel={false} size="sm" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant={isPending || isNotSubmitted ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawer(record);
                          }}
                        >
                          {isPending || isNotSubmitted ? '去评分' : isScored ? '修改' : '查看'}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {filteredAllRecords.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无员工</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Scoring Dialog - 优化宽度布局 */}
      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent
          className="!fixed !inset-0 !translate-x-0 !translate-y-0 !flex !flex-col !p-0 !gap-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none !border-0 !shadow-none overflow-hidden"
          showCloseButton={false}
        >
          {/* Header */}
          <DialogHeader className="border-b px-6 py-4 bg-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-xl font-semibold text-white shadow-lg">
                  {selectedRecord?.employeeName?.charAt(0)}
                </div>
                <div>
                  <DialogTitle className="flex items-center gap-3 text-xl">
                    {selectedRecord?.employeeName}
                    {(selectedRecord?.groupType || selectedRecord?.employeeLevel) &&
                      getGroupBadge(selectedRecord.groupType, selectedRecord.employeeLevel)}
                    <span 
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{ 
                        backgroundColor: `${getLevelColor(selectedRecord?.employeeLevel)}15`,
                        color: getLevelColor(selectedRecord?.employeeLevel)
                      }}
                    >
                      {getLevelLabel(selectedRecord?.employeeLevel)}
                    </span>
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedRecord?.department} · {selectedRecord?.subDepartment} · <span className="font-medium text-blue-600">{selectedRecord?.month}</span> 月度考核
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* 综合得分预览 */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl px-6 py-3 border border-blue-100">
                  <p className="text-xs text-gray-500 mb-1">综合得分</p>
                  <ScoreDisplay score={totalScore} showLabel={false} size="lg" />
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setIsDrawerOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* Main Content - 左右分栏布局 */}
          <div className="flex-1 overflow-hidden flex">
            {/* 左侧：员工信息和工作总结 */}
            <div className="w-[480px] border-r bg-gray-50/50 overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* 未提交提示 */}
                {isNoSummary && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-orange-800 text-sm">员工未提交自我评价总结</p>
                          <p className="text-xs text-orange-700 mt-1">
                            您可以直接进行评分，系统会自动标记为"未提交总结"状态。
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* 本月自我评价总结 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      本月自我评价总结
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedRecord?.selfSummary ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedRecord.selfSummary}
                      </p>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <Clock className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm">员工暂未填写</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* 下月工作计划 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      下月工作计划
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedRecord?.nextMonthPlan ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedRecord.nextMonthPlan}
                      </p>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <Clock className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm">员工暂未填写</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* 右侧：评分区域 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <Tabs defaultValue="scoring" className="h-full">
                  <TabsList className="w-full mb-6 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="scoring" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
                      维度评分
                    </TabsTrigger>
                    <TabsTrigger value="comment" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
                      综合评价
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Scoring Tab */}
                  <TabsContent value="scoring" className="mt-0 space-y-6">
                    {/* 得分公式说明 */}
                    <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl p-5 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">当前得分</p>
                            <p className="text-3xl font-bold text-blue-600">{totalScore.toFixed(2)}</p>
                          </div>
                          <div className="h-12 w-px bg-gray-200"></div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">计算公式</p>
                            <p className="text-sm text-gray-600 font-mono">
                              <span className="text-blue-600">{scores.taskCompletion.toFixed(1)}</span>×40% + 
                              <span className="text-green-600 ml-1">{scores.initiative.toFixed(1)}</span>×30% + 
                              <span className="text-purple-600 ml-1">{scores.projectFeedback.toFixed(1)}</span>×20% + 
                              <span className="text-orange-600 ml-1">{scores.qualityImprovement.toFixed(1)}</span>×10%
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {scoreLevels.slice(0, 3).map((level) => (
                            <div 
                              key={level.level}
                              className="text-center px-3 py-1.5 rounded-lg text-xs"
                              style={{ backgroundColor: `${level.color}15`, color: level.color }}
                            >
                              <div className="font-bold">{level.level}</div>
                              <div>{level.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* 四个维度评分 - 2x2 网格布局 */}
                    <div className="grid grid-cols-2 gap-5">
                      {scoreDimensions.map((dim, index) => {
                        const colorMap: Record<number, string> = {
                          0: 'blue',
                          1: 'green', 
                          2: 'purple',
                          3: 'orange'
                        };
                        const color = colorMap[index] || 'blue';
                        
                        return (
                          <Card key={dim.key} className="shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full bg-${color}-500`} 
                                       style={{ backgroundColor: color === 'blue' ? '#3B82F6' : color === 'green' ? '#10B981' : color === 'purple' ? '#8B5CF6' : '#F97316' }} />
                                  {dim.name}
                                </CardTitle>
                                <Badge variant="outline" className={`text-${color}-600 border-${color}-200`}
                                       style={{ color: color === 'blue' ? '#3B82F6' : color === 'green' ? '#10B981' : color === 'purple' ? '#8B5CF6' : '#F97316',
                                                borderColor: color === 'blue' ? '#BFDBFE' : color === 'green' ? '#A7F3D0' : color === 'purple' ? '#DDD6FE' : '#FED7AA' }}>
                                  权重 {(dim.weight * 100).toFixed(0)}%
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{dim.description}</p>
                            </CardHeader>
                            <CardContent>
                              <ScoreSelectorWithCriteria 
                                value={scores[dim.key as keyof typeof scores]} 
                                onChange={(v) => setScores(prev => ({ ...prev, [dim.key]: v }))}
                                dimensionKey={dim.key}
                              />
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                  
                  {/* Comment Tab */}
                  <TabsContent value="comment" className="mt-0 space-y-5">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          部门经理综合评价
                          <span className="text-red-500 ml-1">*</span>
                        </CardTitle>
                        <p className="text-xs text-gray-500">请对员工本月的整体工作表现进行评价</p>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="请输入对员工本月工作的综合评价，包括工作亮点、存在问题、改进建议等..."
                          value={managerComment}
                          onChange={(e) => setManagerComment(e.target.value)}
                          className="min-h-[160px] resize-none"
                        />
                      </CardContent>
                    </Card>
                    
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          下月工作安排
                          <span className="text-red-500 ml-1">*</span>
                        </CardTitle>
                        <p className="text-xs text-gray-500">请填写对员工下月工作的安排和期望</p>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="请输入对员工下月工作的安排和建议，包括重点任务、能力提升方向等..."
                          value={nextMonthWorkArrangement}
                          onChange={(e) => setNextMonthWorkArrangement(e.target.value)}
                          className="min-h-[160px] resize-none"
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-white flex items-center justify-between shrink-0">
            <div className="text-sm text-gray-500">
              {(!managerComment || !nextMonthWorkArrangement) && (
                <span className="text-orange-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  请填写综合评价和下月工作安排后提交
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={loading || !managerComment || !nextMonthWorkArrangement}
                className="min-w-[120px]"
              >
                {loading ? '保存中...' : (selectedRecord?.status === 'completed' || selectedRecord?.status === 'scored') ? '保存修改' : '提交评分'}
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
