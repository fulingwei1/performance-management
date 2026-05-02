import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CircleCheckBig, CircleOff } from 'lucide-react';
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
            <CardTitle className="text-lg">本期绩效参与状态</CardTitle>
            <CardDescription>你可以直接看到自己当前是否纳入本期绩效考核。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                {participation?.participating ? (
                  <CircleCheckBig className="h-5 w-5 text-green-600" />
                ) : (
                  <CircleOff className="h-5 w-5 text-gray-400" />
                )}
                <span className={`text-base font-semibold ${participation?.participating ? 'text-green-700' : 'text-gray-600'}`}>
                  {participation?.participating ? '参与本期绩效考核' : '当前不参与本期绩效考核'}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                当前归属：{participation?.unitKey || `${user?.department || ''}${user?.subDepartment ? ` / ${user.subDepartment}` : ''}`}
              </p>
            </div>
            {!participation?.participating && (
              <p className="text-sm text-amber-600">
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
