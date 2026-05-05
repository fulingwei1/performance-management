import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Users, Calendar, FileText, CheckCircle2, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { format } from 'date-fns';
import { employeeApi, performanceApi, todoApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TodoSection } from '@/components/dashboard/TodoSection';
import { toast } from 'sonner';
import { ScoringManagement } from './Scoring';

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

// 月份选项
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() - i);
  return {
    value: format(date, 'yyyy-MM'),
    label: format(date, 'yyyy年M月')
  };
});

function getPreviousMonthValue(referenceDate = new Date()) {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  return format(date, 'yyyy-MM');
}

export function ManagerDashboard() {
  const { user } = useAuthStore();
  const { records, fetchTeamRecords } = usePerformanceStore();
  const [searchParams] = useSearchParams();
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [participationSummary, setParticipationSummary] = useState<ParticipationSummary | null>(null);
  const monthParam = searchParams.get('month');
  const initialSelectedMonth = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)
    ? monthParam
    : format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(initialSelectedMonth);
  const [mySummaryRecord, setMySummaryRecord] = useState<any>(null);
  const summaryMonth = useMemo(() => getPreviousMonthValue(), []);
  
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
    performanceApi.getMyRecordByMonth(summaryMonth)
      .then((response) => {
        setMySummaryRecord(response.success ? response.data || null : null);
      })
      .catch((error) => {
        console.error('Failed to fetch my summary record:', error);
        setMySummaryRecord(null);
      });
  }, [user, summaryMonth]);

  // 获取当前月份的绩效记录
  const currentMonthRecords = records.filter(r => r.month === currentMonth);
  
  // 统计数据
  const teamSize = subordinates.length;
  // 待评分：已提交未评分 + 未提交的员工
  const submittedPending = currentMonthRecords.filter(r => r.status === 'submitted' || r.status === 'draft').length;
  const notSubmitted = teamSize - currentMonthRecords.length;
  const pendingReview = submittedPending + notSubmitted;
  const completedReview = currentMonthRecords.filter(r => r.status === 'completed' || r.status === 'scored').length;
  
  // 计算平均分（使用已完成的记录）
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
  const actionHint = pendingReview > 0
    ? `还有 ${pendingReview} 人需要处理，点击“待评分”可直接查看名单。`
    : completedReview > 0
      ? '本月评分已完成，可查看团队分析和历史趋势。'
      : '本月暂无待处理评分任务。';
  const mySummaryDone = Boolean(mySummaryRecord && mySummaryRecord.status !== 'draft');
  const mySummaryScored = Boolean(mySummaryRecord && ['completed', 'scored'].includes(mySummaryRecord.status));
  const mySummaryTitle = mySummaryScored
    ? '我的绩效已完成'
    : mySummaryDone
      ? '我的总结已提交'
      : '待提交我的月度总结';
  const mySummaryDescription = mySummaryScored
    ? `你 ${summaryMonth} 的绩效已评分，可进入总结页查看内容。`
    : mySummaryDone
      ? `你已提交 ${summaryMonth} 工作总结和下月计划，等待上级评分。`
      : `请补充 ${summaryMonth} 工作总结和下月计划；经理/组长也需要完成自己的总结。`;
  const MySummaryIcon = mySummaryScored || mySummaryDone ? CheckCircle2 : Clock;

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
      {/* Welcome */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            经理工作台
          </h1>
          <p className="text-gray-500 mt-1">
            欢迎回来，{user?.name}经理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="选择月份" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <TodoSection role="manager" fetchSummary={todoApi.getSummary} />
      </motion.div>

      <motion.div variants={itemVariants}>
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
      </motion.div>
      
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
                  <Link
                    to="/manager/analytics"
                    className="inline-flex items-center justify-center gap-1 rounded-md bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100"
                  >
                    查看分析
                    <ArrowRight className="h-4 w-4" />
                  </Link>
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
        <ScoringManagement embedded month={currentMonth} hideProgress />
      </motion.div>
    </motion.div>
  );
}
