import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useHRStore } from '@/stores/hrStore';
import { StatsCard } from '@/components/stats/StatsCard';
import { TaskList } from '@/components/tasks/TaskList';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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
      
      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
