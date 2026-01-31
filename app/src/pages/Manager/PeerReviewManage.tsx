import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, BarChart3, ChevronRight, RefreshCw, Calendar } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

export function PeerReviewManage() {
  const { user } = useAuthStore();
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isAllocating, setIsAllocating] = useState(false);
  const [peerReviewData, setPeerReviewData] = useState<any[]>([]);

  // 获取360度评价数据
  useEffect(() => {
    const fetchPeerReviewData = async () => {
      if (!user) return;

      try {
        const response = await api.peerReview.getDepartmentStats(selectedMonth);
        console.log('获取到的360度评价数据:', response);

        if (response.success) {
          setPeerReviewData(response.data);
        }
      } catch (error) {
        console.error('获取360度评价数据失败:', error);
      }
    };

    fetchPeerReviewData();
  }, [user, selectedMonth]);

  // 分配360度评价任务
  const handleAllocateReviews = async () => {
    if (!user) return;

    setIsAllocating(true);
    try {
      const response = await api.peerReview.allocateReviews({
        month: selectedMonth,
        department: user.subDepartment
      });

      if (response.success) {
        alert(`成功分配${response.data.allocated}个360度评价任务`);

        // 重新获取数据
        const statsResponse = await api.peerReview.getDepartmentStats(selectedMonth);
        if (statsResponse.success) {
          setPeerReviewData(statsResponse.data);
        }
      }
    } catch (error) {
      console.error('分配360度评价任务失败:', error);
      alert('分配失败，请重试');
    } finally {
      setIsAllocating(false);
    }
  };

  // 使用真实数据
  const displayData = peerReviewData;
  
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
  
  // 统计
  const totalReviews = displayData.reduce((sum: number, e: any) => sum + (e.totalReviews || 0), 0);
  const completedReviews = displayData.reduce((sum: number, e: any) => sum + (e.completedReviews || 0), 0);
  const completionRate = totalReviews > 0 ? (completedReviews / totalReviews) * 100 : 0;
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">360度评分管理</h1>
            <p className="text-gray-500 mt-1">查看团队成员的360度互评情况</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="选择月份" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={format(new Date(), 'yyyy-MM')}>
                  {format(new Date(), 'yyyy年MM月')}
                </SelectItem>
                <SelectItem value={format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM')}>
                  {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy年MM月')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAllocateReviews}
              disabled={isAllocating}
            >
              {isAllocating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              分配360度评价
            </Button>
          </div>
        </div>
      </motion.div>
      
      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总评分任务</p>
                <p className="text-2xl font-bold">{totalReviews}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-2xl font-bold">{completedReviews}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">完成率</p>
                <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Progress */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">整体完成进度</span>
              <span className="text-sm text-gray-500">{completedReviews} / {totalReviews}</span>
            </div>
            <Progress value={completionRate} className="h-3" />
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Employee List */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="text-lg font-semibold">员工互评情况</h3>

        {displayData.map((employee) => {
          const progress = (employee.completedReviews || 0) / (employee.totalReviews || 1) * 100;
          const isComplete = progress === 100;

          return (
            <Card
              key={employee.revieweeId}
              className={`cursor-pointer transition-all hover:shadow-md ${isComplete ? 'bg-green-50/50' : ''}`}
              onClick={() => setSelectedEmployee(employee)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                      isComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isComplete ? <CheckCircle className="w-6 h-6" /> : employee.revieweeName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{employee.revieweeName}</p>
                      <p className="text-sm text-gray-500">{employee.department || '未分配'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {/* Progress */}
                    <div className="w-32">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">进度</span>
                        <span className="font-medium">{employee.completedReviews || 0}/{employee.totalReviews || 0}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Average Scores */}
                    {employee.completedReviews > 0 && (
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-gray-500">协作</p>
                          <p className="font-semibold">{employee.averageScore?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500">完成率</p>
                          <p className="font-semibold">{employee.completionRate?.toFixed(0)}%</p>
                        </div>
                      </div>
                    )}

                    <Button variant="ghost" size="sm">
                      详情
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>
      
          {/* Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                {selectedEmployee?.revieweeName?.charAt(0)}
              </div>
              <div>
                <p>{selectedEmployee?.revieweeName}</p>
                <p className="text-sm text-gray-500 font-normal">{selectedEmployee?.department || '未分配'}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">收到评价</p>
                  <p className="text-2xl font-bold">{selectedEmployee.totalReviews || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">已完成</p>
                  <p className="text-2xl font-bold">{selectedEmployee.completedReviews || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">完成率</p>
                  <p className="text-2xl font-bold">{selectedEmployee.completionRate?.toFixed(0) || 0}%</p>
                </div>
              </div>

              {/* Average Score */}
              {selectedEmployee.completedReviews > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">平均得分</h4>
                  <p className="text-3xl font-bold text-blue-600">
                    {selectedEmployee.averageScore?.toFixed(2) || '-'}
                  </p>
                </div>
              )}

              {/* Tip */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  请提醒员工及时完成360度评价。评价完成后，经理可以查看详细的评价结果。
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
