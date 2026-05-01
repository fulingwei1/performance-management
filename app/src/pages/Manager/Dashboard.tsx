import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, Clock, Calendar, FileText, Award, ClipboardCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { useHRStore } from '@/stores/hrStore';
import { format } from 'date-fns';
import { employeeApi, performanceApi, employeeQuarterlyApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { todoApi } from '@/services/api';
import { toast } from 'sonner';
import { ScoringManagement } from './Scoring';

interface QuarterlyRecord {
  id: string;
  year: number;
  quarter: number;
  avg_score: number | string;
}

interface TodoGroup {
  count: number;
  dueDate: string | null;
  status: 'pending' | 'warning' | 'overdue';
}

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

export function ManagerDashboard() {
  const { user } = useAuthStore();
  const { records, fetchTeamRecords } = usePerformanceStore();
  const fetchQuarterlySummary = useHRStore(state => state.fetchQuarterlySummary);
  const getQuarterlySummary = useHRStore(state => state.getQuarterlySummary);
  const gmScores = useHRStore(state => state.gmScores);
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [myMonthlyRecords, setMyMonthlyRecords] = useState<any[]>([]);
  const [myQuarterlyRecords, setMyQuarterlyRecords] = useState<QuarterlyRecord[]>([]);
  const [todoSummary, setTodoSummary] = useState<Record<string, TodoGroup>>({});
  const [participationSummary, setParticipationSummary] = useState<ParticipationSummary | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // 使用选择的月份
  const currentMonth = selectedMonth;
  const currentQuarter = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  
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
    fetchQuarterlySummary(currentQuarter).catch(() => {});
  }, [user, currentQuarter, fetchQuarterlySummary]);

  useEffect(() => {
    const fetchMyHistory = async () => {
      if (!user) return;
      try {
        const [monthlyRes, quarterlyRes] = await Promise.all([
          performanceApi.getMyRecords(),
          employeeQuarterlyApi.getMy()
        ]);
        if (monthlyRes.success) setMyMonthlyRecords(monthlyRes.data || []);
        if (quarterlyRes.success) setMyQuarterlyRecords(quarterlyRes.data || []);
      } catch (error) {
        console.error('获取个人历史得分失败:', error);
      }
    };
    fetchMyHistory();
  }, [user]);

  useEffect(() => {
    const fetchTodoSummary = async () => {
      try {
        const response = await todoApi.getSummary();
        if (response?.success) {
          setTodoSummary(response.data || {});
        } else if (response?.data) {
          setTodoSummary(response.data);
        }
      } catch (error) {
        console.error('获取待办摘要失败:', error);
      }
    };
    if (user) fetchTodoSummary();
  }, [user]);
  
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
  const quarterlySummary = user ? getQuarterlySummary(user.id, currentQuarter) : undefined;
  const quarterlyScore = user ? gmScores.find((item) => item.managerId === user.id && item.quarter === currentQuarter) : undefined;
  const latestMyMonthly = [...myMonthlyRecords].sort((a, b) => b.month.localeCompare(a.month))[0];
  const latestMyQuarterly = myQuarterlyRecords[0];
  const todoCards = [
    {
      key: 'performance_review',
      label: '待打分',
      icon: Award,
      color: 'text-purple-700 bg-purple-50',
    },
    {
      key: 'goal_approval',
      label: '待审批',
      icon: ClipboardCheck,
      color: 'text-blue-700 bg-blue-50',
    },
    {
      key: 'appeal_review',
      label: '待申诉',
      icon: AlertCircle,
      color: 'text-red-700 bg-red-50',
    },
  ] as const;
  const pendingTodoCount = todoCards.reduce((sum, item) => sum + (todoSummary[item.key]?.count || 0), 0);
  const participationCount = participationSummary?.team?.participatingCount ?? 0;
  const excludedCount = participationSummary?.team?.excludedCount ?? 0;

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
      
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="border border-gray-200 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              本月团队概况
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-gray-500">团队人数</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">{teamSize}</p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3">
                <p className="text-xs text-gray-500">待评分</p>
                <p className="mt-1 text-2xl font-bold text-yellow-700">{pendingReview}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-gray-500">已完成</p>
                <p className="mt-1 text-2xl font-bold text-green-700">{completedReview}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3">
                <p className="text-xs text-gray-500">团队均分</p>
                <p className="mt-1 text-2xl font-bold text-purple-700">{averageScore.toFixed(2)}</p>
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 px-3 py-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">月度最高分</span>
                <span className="font-semibold">{monthlyBestScore > 0 ? monthlyBestScore.toFixed(2) : '—'}</span>
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">待办总数</span>
                <Badge className="bg-amber-100 text-amber-700">{pendingTodoCount}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {todoCards.map((item) => {
                  const Icon = item.icon;
                  const count = todoSummary[item.key]?.count || 0;
                  return (
                    <div key={item.key} className={`rounded-lg px-2 py-2 text-center ${item.color}`}>
                      <Icon className="mx-auto h-4 w-4 mb-1" />
                      <p className="text-[11px] opacity-80">{item.label}</p>
                      <p className="text-lg font-bold">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              季度汇总
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">当前季度</span>
              <span className="font-medium">{currentQuarter}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">提交状态</span>
              <span className="font-medium">{quarterlySummary ? (quarterlySummary.status === 'submitted' ? '已提交' : '草稿') : '未填写'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">季度汇总得分</span>
              <span className="font-medium">{quarterlyScore ? quarterlyScore.totalScore.toFixed(2) : '—'}</span>
            </div>
            <p className="text-xs text-gray-400">
              季度汇总得分来自总经理季度评分；未评分前先显示为“—”。
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              月度绩效
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">当前月份</span>
              <span className="font-medium">{currentMonth}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">团队平均分</span>
              <span className="font-medium">{averageScore.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">已评分 / 待评分</span>
              <span className="font-medium">{completedReview} / {pendingReview}</span>
            </div>
            <p className="text-xs text-gray-400">
              月度绩效显示当前月团队评分情况；具体评分明细在下方直接处理。
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              我的历史得分
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">最近月度得分</span>
              <span className="font-medium">
                {latestMyMonthly ? `${latestMyMonthly.month} · ${Number(latestMyMonthly.totalScore || 0).toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">最近季度汇总</span>
              <span className="font-medium">
                {latestMyQuarterly ? `${latestMyQuarterly.year}Q${latestMyQuarterly.quarter} · ${Number(latestMyQuarterly.avg_score || 0).toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="space-y-2 pt-1">
              {[...myMonthlyRecords].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 3).map((record) => (
                <div key={record.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{record.month}</span>
                  <span className="font-medium text-emerald-600">{Number(record.totalScore || 0).toFixed(2)}</span>
                </div>
              ))}
              {myQuarterlyRecords.slice(0, 2).map((record) => (
                <div key={record.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{record.year}Q{record.quarter}</span>
                  <span className="font-medium text-purple-600">{Number(record.avg_score || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              月度得分看个人历史绩效；季度汇总得分按当季月度得分自动聚合。
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">团队状态与评分处理</h2>
          <p className="text-sm text-gray-500 mt-1">上面看汇总，这里直接看团队状态表、排名和评分处理，不再拆成两个页面来回切。</p>
        </div>
        {participationSummary?.team && (
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">本部门参与考核名单</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {participationSummary.team.members.length === 0 ? (
                <p className="text-sm text-gray-500">当前没有挂到你名下的下属。</p>
              ) : (
                participationSummary.team.members.map((member) => (
                  <div key={member.employeeId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.unitKey}</p>
                    </div>
                    <Badge className={member.participating ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {member.participating ? '参与考核' : '不参与考核'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
        <ScoringManagement embedded />
      </motion.div>
    </motion.div>
  );
}
