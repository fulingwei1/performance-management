import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CircleCheckBig, CircleOff, FileText, Trophy } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useHRStore } from '@/stores/hrStore';
import { TaskList } from '@/components/tasks/TaskList';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TodoSection } from '@/components/dashboard/TodoSection';
import { employeeApi, todoApi } from '@/services/api';
import { MyScores } from './MyScores';

interface ParticipationInfo {
  employeeId: string;
  name: string;
  role: string;
  department: string;
  subDepartment?: string;
  unitKey: string;
  participating: boolean;
}

export function EmployeeDashboard() {
  const { user } = useAuthStore();
  const { records, fetchMyRecords } = usePerformanceStore();
  const { generateMonthlyTasks, fetchEmployeeTasks } = useTaskStore();
  const { employeesList, fetchEmployees } = useHRStore();
  const [participation, setParticipation] = useState<ParticipationInfo | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyRecords(user.id);
      fetchEmployees();
      employeeApi.getAssessmentParticipation()
        .then((response) => {
          if (response.success) {
            setParticipation(response.data?.self || null);
          }
        })
        .catch((error) => {
          console.error('获取参与考核状态失败:', error);
        });
    }
  }, [user, fetchMyRecords, fetchEmployees]);

  // 在获取到 records 和 employeesList 后再生成任务
  useEffect(() => {
    if (user && records.length > 0 && employeesList.length > 0) {
      generateMonthlyTasks(undefined, records);
    }
  }, [user, records, employeesList, generateMonthlyTasks]);

  // 获取当前月份的任务
  const currentMonth = format(new Date(), 'yyyy-MM');
  const myTasks = user ? fetchEmployeeTasks(user.id, currentMonth) : [];
  const currentRecord = records.find((record) => record.month === currentMonth);
  const hasSubmittedSummary = Boolean(currentRecord && currentRecord.status !== 'draft');
  const hasScore = Boolean(currentRecord && Number(currentRecord.totalScore || 0) > 0 && ['completed', 'scored'].includes(currentRecord.status));
  const participationLabel = participation?.participating ? '参与本期绩效考核' : '当前不参与本期绩效考核';
  const summaryLabel = hasSubmittedSummary ? '已提交总结/计划' : '待填写总结/计划';
  const scoreLabel = hasScore ? `已评分 ${Number(currentRecord?.totalScore || 0).toFixed(2)}` : '等待经理评分';

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
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">
          欢迎回来，{user?.name}
        </h1>
        <p className="text-gray-500 mt-1">
          {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
        </p>
      </motion.div>
      
      {/* 待办事项 */}
      <motion.div variants={itemVariants}>
        <TodoSection role="employee" fetchSummary={todoApi.getSummary} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">本月绩效进度</CardTitle>
            <CardDescription>
              先确认是否参与，再填写总结和计划；经理评分后，结果会进入历史绩效和季度汇总。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className={`rounded-lg border p-3 ${participation?.participating ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  {participation?.participating ? (
                    <CircleCheckBig className="h-5 w-5 text-green-600" />
                  ) : (
                    <CircleOff className="h-5 w-5 text-gray-400" />
                  )}
                  <p className="font-semibold text-gray-900">{participationLabel}</p>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  归属：{participation?.unitKey || `${user?.department || ''}${user?.subDepartment ? ` / ${user.subDepartment}` : ''}` || '—'}
                </p>
              </div>

              <Link
                to="/employee/summary"
                className={`rounded-lg border p-3 transition hover:shadow-sm ${hasSubmittedSummary ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className={`h-5 w-5 ${hasSubmittedSummary ? 'text-blue-600' : 'text-amber-600'}`} />
                    <p className="font-semibold text-gray-900">{summaryLabel}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
                <p className="mt-2 text-xs text-gray-500">可填写问题标签和合理化建议，非强制。</p>
              </Link>

              <div className={`rounded-lg border p-3 ${hasScore ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <Trophy className={`h-5 w-5 ${hasScore ? 'text-purple-600' : 'text-gray-400'}`} />
                  <p className="font-semibold text-gray-900">{scoreLabel}</p>
                </div>
                <p className="mt-2 text-xs text-gray-500">1.00 为基准绩效系数，结果正式发布后用于季度汇总。</p>
              </div>
            </div>
            {!participation?.participating && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                如果你业务上应参与考核，请联系 HR 在“考核配置”里确认本部门是否已纳入。
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <TaskList
          tasks={myTasks}
          title="本月待办任务"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">我的绩效</h2>
            <p className="text-sm text-gray-500 mt-1">在工作台里直接查看最新绩效、历史趋势和排名。</p>
          </div>
        </div>
        <MyScores embedded />
      </motion.div>
    </motion.div>
  );
}
