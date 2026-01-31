import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  FileText,
  Star,
  ChevronLeft,
  ChevronRight,
  Award,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { performanceApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import type { PerformanceRecord } from '@/types';

interface EmployeePerformanceHistoryProps {
  employeeId: string;
  employeeName: string;
  employeeLevel: string;
}

export function EmployeePerformanceHistory({ 
  employeeId, 
  employeeName, 
  employeeLevel 
}: EmployeePerformanceHistoryProps) {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  
  // 加载历史数据
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const response = await performanceApi.getEmployeeHistory(employeeId);

        if (response.success) {
          setRecords(response.data);
        } else {
          console.error('获取历史数据失败:', response.error);
          setRecords([]);
        }
      } catch (error) {
        console.error('API调用失败:', error);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [employeeId]);

  // 准备图表数据
  const chartData = records.map(r => ({
    month: r.month,
    score: r.totalScore
  }));
  
  // 计算统计数据
  const avgScore = records.length > 0 
    ? records.reduce((sum, r) => sum + r.totalScore, 0) / records.length 
    : 0;
  
  const maxScore = records.length > 0 
    ? Math.max(...records.map(r => r.totalScore)) 
    : 0;
  
  const minScore = records.length > 0 
    ? Math.min(...records.map(r => r.totalScore)) 
    : 0;
  
  const trend = records.length >= 2 
    ? records[records.length - 1].totalScore - records[records.length - 2].totalScore 
    : 0;
  
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
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/manager/scoring')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {employeeName} - 绩效历史
            </h1>
            <Badge variant="outline">{employeeLevel}</Badge>
          </div>
          <p className="text-gray-500 mt-1">
            共 {records.length} 个月份的绩效记录
          </p>
        </div>
      </motion.div>
      
      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="平均得分"
          value={avgScore.toFixed(2)}
          icon={Star}
          color="purple"
        />
        <StatCard
          title="最高得分"
          value={maxScore.toFixed(2)}
          icon={Award}
          color="green"
        />
        <StatCard
          title="最低得分"
          value={minScore.toFixed(2)}
          icon={AlertCircle}
          color="orange"
        />
        <StatCard
          title="近期趋势"
          value={trend > 0 ? `+${trend.toFixed(2)}` : trend.toFixed(2)}
          icon={trend >= 0 ? TrendingUp : TrendingDown}
          color={trend >= 0 ? 'green' : 'red'}
        />
      </motion.div>
      
      {/* 绩效趋势图 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              绩效分数趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0.5, 1.5]} />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(2), '得分']}
                    labelFormatter={(label) => `${label}月`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* 月度绩效详情 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>月度绩效详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {records.map((record, index) => (
              <MonthRecordCard 
                key={record.id} 
                record={record} 
                index={index}
                onExpand={() => setSelectedMonth(selectedMonth === record.id ? null : record.id)}
                isExpanded={selectedMonth === record.id}
              />
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// 月度记录卡片
function MonthRecordCard({ 
  record, 
  index, 
  onExpand, 
  isExpanded 
}: { 
  record: PerformanceRecord; 
  index: number; 
  onExpand: () => void; 
  isExpanded: boolean;
}) {
  return (
    <Card className={cn(
      "transition-all duration-200",
      isExpanded ? "border-purple-300 bg-purple-50" : "hover:border-purple-200"
    )}>
      <CardContent className="pt-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={onExpand}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
              index === 0 ? "bg-purple-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-400" : "bg-blue-400"
            )}>
              {index + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{record.month}月</span>
                <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                  {record.status === 'completed' ? '已完成' : '进行中'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                综合得分：{record.totalScore.toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ScoreDisplay score={record.totalScore} showLabel size="md" />
            <Button variant="ghost" size="sm">
              {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        {/* 展开的详细信息 */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
            className="mt-4 pt-4 border-t space-y-4"
          >
            {/* 维度得分 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DimensionCard
                label="任务完成"
                score={record.taskCompletion}
                weight="40%"
              />
              <DimensionCard
                label="主动性"
                score={record.initiative}
                weight="30%"
              />
              <DimensionCard
                label="项目反馈"
                score={record.projectFeedback}
                weight="20%"
              />
              <DimensionCard
                label="质量改进"
                score={record.qualityImprovement}
                weight="10%"
              />
            </div>
            
            {/* 经理评语 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">经理评语</h4>
                  <p className="text-sm text-blue-800">{record.managerComment}</p>
                </div>
              </div>
            </div>
            
            {/* 下月工作安排 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 mb-2">下月工作安排</h4>
                  <p className="text-sm text-green-800">{record.nextMonthWorkArrangement}</p>
                </div>
              </div>
            </div>
            
            {/* 排名信息 */}
            <div className="flex gap-4">
              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">分组排名</p>
                <p className="text-lg font-bold text-gray-900">#{record.groupRank}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">部门排名</p>
                <p className="text-lg font-bold text-gray-900">#{record.departmentRank}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">全公司排名</p>
                <p className="text-lg font-bold text-gray-900">#{record.companyRank}</p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// 维度得分卡片
function DimensionCard({ label, score, weight }: { label: string; score: number; weight: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <p className="text-xl font-bold text-purple-600">{score.toFixed(2)}</p>
        <span className="text-xs text-gray-400">{weight}</span>
      </div>
    </div>
  );
}

// 统计卡片
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}