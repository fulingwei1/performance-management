import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Users, Calendar, FileText, CheckCircle2, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { format } from 'date-fns';
import { analyticsApi, employeeApi, performanceApi, todoApi } from '@/services/api';
import { getDefaultAssessmentMonth, getPreviousMonthValue, isValidAssessmentMonth } from '@/lib/assessmentMonth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TodoSection } from '@/components/dashboard/TodoSection';
import { toast } from 'sonner';
import { ScoringManagement } from './Scoring';
import { ReportSummaryCard, type ReportSummaryData } from '@/components/reports/ReportSummaryCard';
import { Analytics as PerformanceResultAnalysis } from './Analytics';
import { AssessmentFlowSteps, FlowHero } from '@/components/flow/AssessmentFlow';

interface ParticipationMember {
  employeeId: string;
  name: string;
  department: string;
  subDepartment?: string;
  unitKey: string;
  participating: boolean;
}

interface ParticipationSummary {
  self: {
    employeeId: string;
    name: string;
    role: string;
    department: string;
    subDepartment?: string;
    unitKey: string;
    participating: boolean;
  };
  team?: {
    totalCount: number;
    participatingCount: number;
    excludedCount: number;
    members: ParticipationMember[];
  };
}

export function ManagerDashboard() {
  const { user } = useAuthStore();
  const { records, fetchTeamRecords } = usePerformanceStore();
  const [searchParams] = useSearchParams();
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [participationSummary, setParticipationSummary] = useState<ParticipationSummary | null>(null);
  const monthParam = searchParams.get('month');
  const initialSelectedMonth = isValidAssessmentMonth(monthParam)
    ? monthParam
    : getDefaultAssessmentMonth();
  const [selectedMonth, setSelectedMonth] = useState(initialSelectedMonth);
  const [mySummaryRecord, setMySummaryRecord] = useState<any>(null);
  const [mySummaryLoaded, setMySummaryLoaded] = useState(false);
  const [reportSummary, setReportSummary] = useState<ReportSummaryData | null>(null);
  const summaryMonth = useMemo(() => getPreviousMonthValue(), []);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'yyyy年M月')
    };
  }), []);
  
  // 使用选择的月份
  const currentMonth = selectedMonth;

  // 获取下属员工列表
  useEffect(() => {
    const fetchSubordinates = async () => {
      try {
        const [subordinatesResponse, participationResponse] = await Promise.all([
          employeeApi.getSubordinates(),
          employeeApi.getAssessmentParticipation(),
        ]);
        if (subordinatesResponse.success) {
          setSubordinates(subordinatesResponse.data);
        }
        if (participationResponse.success) {
          setParticipationSummary(participationResponse.data || null);
        }
      } catch (error) {
        console.error('Failed to fetch subordinates:', error);
        toast.error('获取下属列表失败');
      }
    };
    
    if (user) {
      fetchSubordinates();
    }
  }, [user]);
  
  // 获取团队绩效记录
  useEffect(() => {
    if (user) {
      fetchTeamRecords(user.id, currentMonth);
    }
  }, [user, currentMonth, fetchTeamRecords]);

  useEffect(() => {
    if (!user) return;
    analyticsApi.getReportSummary(currentMonth)
      .then((response) => {
        if (response.success) setReportSummary(response.data || null);
      })
      .catch(() => setReportSummary(null));
  }, [user, currentMonth]);

  useEffect(() => {
    if (!user) return;
    setMySummaryLoaded(false);
    performanceApi.getMyRecordByMonth(summaryMonth)
      .then((response) => {
        setMySummaryRecord(response.success ? response.data || null : null);
      })
      .catch((error) => {
        console.error('Failed to fetch my summary record:', error);
        setMySummaryRecord(null);
      })
      .finally(() => {
        setMySummaryLoaded(true);
      });
  }, [user, summaryMonth]);

  useEffect(() => {
    if (searchParams.get('section') !== 'analysis') return;
    const timer = window.setTimeout(() => {
      document.getElementById('performance-result-analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  // 获取当前月份的绩效记录
  const currentMonthRecords = useMemo(
    () => records.filter(r => r.month === currentMonth),
    [records, currentMonth]
  );
  
  const {
    teamSize, pendingReview,
    completedReview, averageScore, monthlyBestScore, participationCount,
    excludedCount, completionRate, completedRecords
  } = useMemo(() => {
    const teamSize = subordinates.length;
    const submittedPending = currentMonthRecords.filter(r => r.status === 'submitted').length;
    const draftCount = currentMonthRecords.filter(r => r.status === 'draft').length;
    const notSubmitted = teamSize - currentMonthRecords.length;
    const pendingReview = submittedPending + notSubmitted;
    const completedReview = currentMonthRecords.filter(r => r.status === 'completed' || r.status === 'scored').length;
    const completedRecords = currentMonthRecords.filter(r => r.status === 'completed' || r.status === 'scored');
    const averageScore = completedRecords.length > 0
      ? completedRecords.reduce((sum, r) => sum + r.totalScore, 0) / completedRecords.length
      : 0;
    const monthlyBestScore = completedRecords.length > 0
      ? Math.max(...completedRecords.map((r) => r.totalScore || 0))
      : 0;
    const participationCount = participationSummary?.team?.participatingCount ?? 0;
    const excludedCount = participationSummary?.team?.excludedCount ?? 0;
    const completionRate = teamSize > 0 ? Math.round((completedReview / teamSize) * 100) : 0;
    return {
      teamSize,
      pendingReview,
      completedReview,
      completedRecords,
      averageScore,
      monthlyBestScore,
      participationCount,
      excludedCount,
      completionRate,
    };
  }, [subordinates, currentMonthRecords, participationSummary]);
  const actionHint = pendingReview > 0
    ? `还有 ${pendingReview} 人需要处理，点击“待评分”可直接查看名单。`
    : completedReview > 0
      ? '本月评分已完成，可查看团队分析和历史趋势。'
      : '本月暂无待处理评分任务。';
  const canSubmitSelfSummary = Boolean(user?.capabilities?.canSubmitSelfSummary);
  const hasGeneratedMySummaryTask = Boolean(mySummaryRecord);
  const mySummaryDone = Boolean(hasGeneratedMySummaryTask && mySummaryRecord.status !== 'draft');
  const mySummaryScored = Boolean(hasGeneratedMySummaryTask && ['completed', 'scored'].includes(mySummaryRecord.status));
  const mySummaryTitle = !hasGeneratedMySummaryTask
    ? '我的绩效任务未生成'
    : mySummaryScored
    ? '我的绩效已完成'
    : mySummaryDone
      ? '我的总结已提交'
      : '待提交我的月度总结';
  const mySummaryDescription = !hasGeneratedMySummaryTask
    ? `HR 生成 ${summaryMonth} 绩效任务后，才需要填写自己的总结和计划。`
    : mySummaryScored
    ? `你 ${summaryMonth} 的绩效已评分，可进入总结页查看内容。`
    : mySummaryDone
      ? `你已提交 ${summaryMonth} 工作总结和下月计划，等待上级评分。`
      : `请补充 ${summaryMonth} 工作总结和下月计划；经理/组长也需要完成自己的总结。`;
  const MySummaryIcon = mySummaryScored || mySummaryDone ? CheckCircle2 : Clock;
  const managerFlowSteps = [
    {
      title: mySummaryDone || !canSubmitSelfSummary ? '个人总结已处理' : '先处理个人总结',
      description: canSubmitSelfSummary
        ? mySummaryDone ? '你的月度总结已提交。' : '组长/经理也需要先完成自己的总结。'
        : '当前账号无需提交个人总结。',
      status: mySummaryDone || !canSubmitSelfSummary ? 'done' as const : hasGeneratedMySummaryTask ? 'active' as const : 'waiting' as const,
    },
    {
      title: pendingReview > 0 ? '处理待评分' : '团队评分已处理',
      description: pendingReview > 0 ? `当前还有 ${pendingReview} 人需要处理。` : '当前无待评分人员，可查看分析。',
      status: pendingReview > 0 ? 'active' as const : completedReview > 0 ? 'done' as const : 'waiting' as const,
    },
    {
      title: completedReview > 0 ? '查看结果分析' : '等待形成数据',
      description: completedReview > 0 ? '评分后自动形成报表摘要和结果分析。' : '完成评分后会展示趋势、分布和风险。',
      status: completedReview > 0 ? 'active' as const : 'waiting' as const,
    },
  ];

  const overviewCards = useMemo(() => [
    { label: '团队人数', value: teamSize, to: `/manager/team?filter=all&month=${currentMonth}`, className: 'bg-blue-50 text-blue-700' },
    { label: '待评分', value: pendingReview, to: `/manager/team?filter=pending&month=${currentMonth}`, className: 'bg-yellow-50 text-yellow-700' },
    { label: '已完成', value: completedReview, to: `/manager/team?filter=completed&month=${currentMonth}`, className: 'bg-green-50 text-green-700' },
    { label: '团队均分', value: averageScore.toFixed(2), to: `/manager/team?filter=completed&month=${currentMonth}`, className: 'bg-purple-50 text-purple-700' },
  ], [teamSize, pendingReview, completedReview, averageScore, currentMonth]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <FlowHero
          eyebrow={`考评工作台 · ${currentMonth}`}
          title={`欢迎回来，${user?.name}`}
          description="先看自己是否要提交总结，再集中处理待评分人员；评分完成后再看团队摘要和结果分析。"
          action={
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 w-[150px] border-0 bg-transparent shadow-none focus:ring-0">
                  <SelectValue placeholder="选择月份" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        >
          <AssessmentFlowSteps steps={managerFlowSteps} compact />
        </FlowHero>
      </motion.div>

      {canSubmitSelfSummary && (
        <motion.div variants={itemVariants}>
          {hasGeneratedMySummaryTask ? (
            <Link
              to={`/employee/summary?month=${summaryMonth}`}
              className={`block rounded-xl border p-4 transition hover:shadow-sm ${
                mySummaryDone ? 'border-green-100 bg-green-50' : 'border-amber-100 bg-amber-50'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${mySummaryDone ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">我的绩效任务 · {summaryMonth}</p>
                    <p className="mt-1 font-semibold text-gray-900">{mySummaryTitle}</p>
                    <p className="mt-1 text-sm text-gray-600">{mySummaryDescription}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MySummaryIcon className={`h-4 w-4 ${mySummaryDone ? 'text-green-600' : 'text-amber-600'}`} />
                  去处理
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ) : (
            <div className="block rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-gray-100 p-2 text-gray-500">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">我的绩效任务 · {summaryMonth}</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {mySummaryLoaded ? mySummaryTitle : '正在检查我的绩效任务'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {mySummaryLoaded ? mySummaryDescription : '正在读取系统是否已生成该月份任务。'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Clock className="h-4 w-4 text-gray-400" />
                  暂不可填写
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
      
      <motion.div variants={itemVariants}>
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              本月团队概况
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {overviewCards.map((card) => (
                <Link
                  key={card.label}
                  to={card.to}
                  className={`rounded-lg p-3 transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${card.className}`}
                >
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold">{card.value}</p>
                  <p className="mt-1 text-[11px] text-gray-500">点击查看名单</p>
                </Link>
              ))}
            </div>
            <div className="rounded-lg border bg-gray-50 px-3 py-3 space-y-3">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">本月完成进度</span>
                  <span className="font-semibold text-gray-900">{completedReview}/{teamSize} · {completionRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${Math.min(completionRate, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">{actionHint}</p>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2">
                    <BarChart3 className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">团队分析</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {completedRecords.length > 0
                          ? `本月已形成 ${completedRecords.length} 条评分数据，最高分 ${monthlyBestScore.toFixed(2)}；可查看团队趋势、标签画像和四维分析。`
                          : '完成员工评分后，系统会自动生成团队趋势、标签画像和四维分析。'}
                      </p>
                    </div>
                  </div>
                  <a
                    href="#performance-result-analysis"
                    className="inline-flex items-center justify-center gap-1 rounded-md bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100"
                  >
                    查看分析
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">部门考核状态</span>
                  <Badge className={participationSummary?.self?.participating ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {participationSummary?.self?.participating ? '参与考核' : '不参与考核'}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {participationSummary?.self?.participating ? '你所在部门当前已纳入绩效考核。' : '你所在部门当前未纳入绩效考核。'}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-green-50 px-2 py-2">
                    <p className="text-gray-500">参与人数</p>
                    <p className="text-lg font-bold text-green-700">{participationCount}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-2 py-2">
                    <p className="text-gray-500">不参与人数</p>
                    <p className="text-lg font-bold text-gray-700">{excludedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ScoringManagement embedded month={currentMonth} hideProgress={false} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ReportSummaryCard
          summary={reportSummary}
          title="团队月度报表摘要"
          description={`${currentMonth} 团队完成率、分布和待评分风险`}
          showDepartments={false}
        />
      </motion.div>

      <motion.div id="performance-result-analysis" variants={itemVariants} className="scroll-mt-6">
        <PerformanceResultAnalysis embedded analysisMonth={currentMonth} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <TodoSection role="manager" fetchSummary={todoApi.getSummary} />
      </motion.div>
    </motion.div>
  );
}
