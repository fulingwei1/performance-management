import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Users, ArrowLeft, Clock, CheckCircle, FileText, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { employeeApi } from '@/services/api';

type FilterType = 'all' | 'pending' | 'completed';

export function TeamList() {
  const { user } = useAuthStore();
  const { records, fetchTeamRecords } = usePerformanceStore();
  const [searchParams] = useSearchParams();
  const filterType = (searchParams.get('filter') as FilterType) || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [subordinates, setSubordinates] = useState<any[]>([]);
  
  // 使用当前月份
  const currentMonth = format(new Date(), 'yyyy-MM');
  
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
  
  // 获取绩效记录
  useEffect(() => {
    if (user) {
      fetchTeamRecords(user.id, currentMonth);
    }
  }, [user, currentMonth]);
  
  // 获取当前月份的记录
  const currentMonthRecords = records.filter(r => r.month === currentMonth);
  
  // 创建包含所有下属员工的列表（即使没有绩效记录）
  const allEmployees = subordinates.map(sub => {
    const record = currentMonthRecords.find(r => r.employeeId === sub.id);
    return {
      ...sub,
      record: record || null,
      status: record ? record.status : 'not_submitted',
      totalScore: record ? record.totalScore : 0,
      selfSummary: record ? record.selfSummary : '',
      month: currentMonth
    };
  });
  
  // 根据筛选类型过滤
  let filteredEmployees = allEmployees;
  
  switch (filterType) {
    case 'pending':
      // 待评分：包括已提交未评分的 + 未提交总结的
      filteredEmployees = allEmployees.filter(e => 
        e.status === 'submitted' || 
        e.status === 'draft' || 
        e.status === 'not_submitted'
      );
      break;
    case 'completed':
      filteredEmployees = allEmployees.filter(e => 
        e.status === 'completed' || e.status === 'scored'
      );
      break;
    case 'all':
    default:
      filteredEmployees = allEmployees;
      break;
  }
  
  // 搜索过滤
  const searchFilteredEmployees = searchQuery
    ? filteredEmployees.filter(e =>
        e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.department?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredEmployees;
  
  // 获取筛选标题
  const getFilterTitle = () => {
    switch (filterType) {
      case 'pending':
        return '待评分员工';
      case 'completed':
        return '已完成评分员工';
      case 'all':
      default:
        return '全部团队员工';
    }
  };
  
  // 获取筛选描述
  const getFilterDescription = () => {
    switch (filterType) {
      case 'pending':
        return '以下员工待处理：已提交等待评分，或未提交自我评价总结';
      case 'completed':
        return '以下员工本月评分已完成';
      case 'all':
      default:
        return '您的全部团队成员及其绩效状态';
    }
  };
  
  // 获取状态标签
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_submitted':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">未提交自我评价总结</Badge>;
      case 'submitted':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">待评分</Badge>;
      case 'draft':
        return <Badge variant="outline">草稿</Badge>;
      case 'completed':
      case 'scored':
        return <Badge variant="default" className="bg-green-100 text-green-800">已完成</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <Link to="/manager/dashboard">
            <Button variant="ghost" className="mb-2 gap-2">
              <ArrowLeft className="w-4 h-4" />
              返回工作台
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {getFilterTitle()}
          </h1>
          <p className="text-gray-500 mt-1">
            {getFilterDescription()}
          </p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-2">
          {currentMonth}
        </Badge>
      </motion.div>
      
      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">团队总数</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {allEmployees.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">待评分</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {allEmployees.filter(e => e.status === 'submitted' || e.status === 'draft' || e.status === 'not_submitted').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已完成</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {allEmployees.filter(e => e.status === 'completed' || e.status === 'scored').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Filter Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-2 border-b">
          <Link to="/manager/team?filter=all">
            <Button 
              variant={filterType === 'all' ? 'default' : 'ghost'}
              className="rounded-none border-b-2"
            >
              全部 ({allEmployees.length})
            </Button>
          </Link>
          <Link to="/manager/team?filter=pending">
            <Button 
              variant={filterType === 'pending' ? 'default' : 'ghost'}
              className="rounded-none border-b-2"
            >
              待评分 ({allEmployees.filter(e => e.status === 'submitted' || e.status === 'draft' || e.status === 'not_submitted').length})
            </Button>
          </Link>
          <Link to="/manager/team?filter=completed">
            <Button 
              variant={filterType === 'completed' ? 'default' : 'ghost'}
              className="rounded-none border-b-2"
            >
              已完成 ({allEmployees.filter(e => e.status === 'completed' || e.status === 'scored').length})
            </Button>
          </Link>
        </div>
      </motion.div>
      
      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="搜索员工姓名或部门..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>
      
      {/* Employee List */}
      <motion.div variants={itemVariants} className="space-y-3">
        {searchFilteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? '未找到匹配的员工' : '暂无员工数据'}
              </p>
            </CardContent>
          </Card>
        ) : (
          searchFilteredEmployees.map((employee, index) => (
            <motion.div
              key={employee.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              custom={index}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {employee.name}
                        </h3>
                        {getStatusBadge(employee.status)}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">部门：</span>
                          <span>{employee.department}</span>
                          <span className="text-gray-300">•</span>
                          <span>{employee.subDepartment}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">级别：</span>
                          <span className="capitalize">{employee.level}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-400">月度：</span>
                          <span>{employee.month}</span>
                        </div>
                      </div>
                      
                      {employee.selfSummary && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {employee.selfSummary}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {employee.status === 'completed' || employee.status === 'scored' ? (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">本月评分</span>
                            <span className="text-2xl font-bold text-green-600">
                              {employee.totalScore?.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Link to={`/manager/scoring?employee=${employee.id}&month=${employee.month}&noSummary=${employee.status === 'not_submitted'}`}>
                          <Button 
                            className={`mt-3 w-full ${employee.status === 'not_submitted' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                          >
                            {employee.status === 'not_submitted' ? '评分（未提交自我评价）' : '开始评分'}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
