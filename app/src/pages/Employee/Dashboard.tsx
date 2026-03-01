import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Star, Target, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useHRStore } from '@/stores/hrStore';
import { StatsCard } from '@/components/stats/StatsCard';
import { TaskList } from '@/components/tasks/TaskList';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { resolveGroupType } from '@/lib/config';
import { StrategicGoalsDisplay } from '@/components/StrategicGoalsDisplay';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TodoSection } from '@/components/dashboard/TodoSection';
import { todoApi } from '@/services/api';

export function EmployeeDashboard() {
  const { user } = useAuthStore();
  const { records, fetchMyRecords } = usePerformanceStore();
  const { generateMonthlyTasks, fetchEmployeeTasks } = useTaskStore();
  const { employeesList, fetchEmployees } = useHRStore();

  useEffect(() => {
    if (user) {
      fetchMyRecords(user.id);
      fetchEmployees();
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

  // 获取最新记录
  const latestRecord = records.length > 0
    ? [...records].sort((a, b) => b.month.localeCompare(a.month))[0]
    : null;

  const latestGroupType = latestRecord
    ? resolveGroupType(latestRecord.groupType, latestRecord.employeeLevel)
    : null;

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

      {/* 战略目标展示 */}
      <motion.div variants={itemVariants}>
        <StrategicGoalsDisplay showDepartment={true} />
      </motion.div>

      {/* 个人目标规划入口 */}
      <motion.div variants={itemVariants}>
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Target className="w-5 h-5" />
              我的年度目标
            </CardTitle>
            <CardDescription className="text-purple-700">
              根据公司战略和部门重点，规划您的个人年度目标
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/employee/goal-planning">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Target className="w-4 h-4 mr-2" />
                开始目标规划
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="最新考核得分"
          value={latestRecord?.totalScore.toFixed(2) || '-'}
          subtitle={latestRecord?.month || '暂无数据'}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="部门排名"
          value={latestRecord?.departmentRank || '-'}
          subtitle="本月排名"
          icon={Star}
          color="purple"
        />
        <StatsCard
          title="组内排名"
          value={latestRecord?.groupRank || '-'}
          subtitle={
            latestGroupType
              ? (latestGroupType === 'high' ? '高分组' : '低分组')
              : '本月组内排名'
          }
          icon={Target}
          color="blue"
        />
        <StatsCard
          title="跨部门排名"
          value={latestRecord?.crossDeptRank || '-'}
          subtitle="本月排名"
          icon={Award}
          color="green"
        />
      </motion.div>
      
      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <TaskList
          tasks={myTasks}
          title="本月待办任务"
        />
      </motion.div>
    </motion.div>
  );
}
