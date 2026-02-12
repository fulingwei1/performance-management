import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, Clock, Calendar, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { StatsCard } from '@/components/stats/StatsCard';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { employeeApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getLevelColor, getLevelLabel, resolveGroupType } from '@/lib/config';
import { StrategicGoalsDisplay } from '@/components/StrategicGoalsDisplay';

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
  const { records, fetchTeamRecords, loading } = usePerformanceStore();
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const navigate = useNavigate();
  
  // 使用选择的月份
  const currentMonth = selectedMonth;
  
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
  
  // 获取团队绩效记录
  useEffect(() => {
    if (user) {
      fetchTeamRecords(user.id, currentMonth);
    }
  }, [user, currentMonth, fetchTeamRecords]);
  
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

  // 构建员工目录数据
  const employeeDirectory = useMemo(() => {
    return subordinates.map(emp => {
      const record = currentMonthRecords.find(r => r.employeeId === emp.id);
      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        subDepartment: emp.subDepartment,
        level: emp.level,
        record: record || null,
        totalScore: record?.totalScore || 0,
        status: record?.status || 'not_submitted',
        groupType: resolveGroupType(record?.groupType, emp.level),
        groupRank: record?.groupRank || null,
        crossDeptRank: record?.crossDeptRank || null
      };
    });
  }, [subordinates, currentMonthRecords]);

  // 点击员工名字进入评分页面
  const handleEmployeeClick = (emp: any) => {
    if (emp.record) {
      // 有记录，直接跳转到评分页面
      navigate(`/manager/scoring?employee=${emp.id}&month=${currentMonth}`);
    } else {
      // 没有记录，跳转到评分页面并标记未提交
      navigate(`/manager/scoring?employee=${emp.id}&month=${currentMonth}&noSummary=true`);
    }
  };

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
      
      {/* 战略目标展示 */}
      <motion.div variants={itemVariants}>
        <StrategicGoalsDisplay showDepartment={true} />
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/manager/team?filter=all">
          <StatsCard
            title="团队人数"
            value={teamSize}
            subtitle="名下员工"
            icon={Users}
            color="blue"
            clickable
          />
        </Link>
        <Link to="/manager/team?filter=pending">
          <StatsCard
            title="待评分"
            value={pendingReview}
            subtitle="需要处理"
            icon={Clock}
            color="yellow"
            clickable
          />
        </Link>
        <Link to="/manager/team?filter=completed">
          <StatsCard
            title="已完成"
            value={completedReview}
            subtitle="本月已评分"
            icon={CheckCircle}
            color="green"
            clickable
          />
        </Link>
        <StatsCard
          title="团队平均分"
          value={averageScore.toFixed(2)}
          subtitle="本月"
          icon={TrendingUp}
          color="purple"
        />
      </motion.div>
      
      {/* 员工目录 */}
      <motion.div variants={itemVariants}>
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {selectedMonth} 团队考核状态
            </CardTitle>
            <p className="text-sm text-gray-500">
              点击员工姓名可进入评分页面
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : employeeDirectory.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无下属员工</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">姓名</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead className="text-center w-24">级别</TableHead>
                    <TableHead className="text-center w-20">分组</TableHead>
                    <TableHead className="text-center w-24">组内排名</TableHead>
                    <TableHead className="text-center w-24">跨部门排名</TableHead>
                    <TableHead className="text-center w-24">考评状态</TableHead>
                    <TableHead className="text-right w-24">考评得分</TableHead>
                    <TableHead className="text-center w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeDirectory.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-gray-50">
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline text-left"
                          onClick={() => handleEmployeeClick(emp)}
                        >
                          {emp.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {emp.subDepartment || emp.department}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.level ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${getLevelColor(emp.level)}20`,
                              color: getLevelColor(emp.level)
                            }}
                          >
                            {getLevelLabel(emp.level)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.groupType ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            emp.groupType === 'high'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {emp.groupType === 'high' ? '高分组' : '低分组'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-700">
                          {emp.groupRank || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-700">
                          {emp.crossDeptRank || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.status === 'completed' || emp.status === 'scored' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                            已评分
                          </span>
                        ) : emp.status === 'submitted' || emp.status === 'draft' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            待评分
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            未提交总结
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {emp.status === 'completed' || emp.status === 'scored' ? (
                          <span className="font-semibold text-emerald-600">{emp.totalScore.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmployeeClick(emp)}
                          className="h-7 px-2"
                        >
                          <span className="text-xs">评分</span>
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
