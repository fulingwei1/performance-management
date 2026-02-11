import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Award, BarChart3, Users, Trophy, Target } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { PerformanceChart } from '@/components/charts/PerformanceChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { cn } from '@/lib/utils';
import { resolveGroupType } from '@/lib/config';

export function MyScores() {
  const { user } = useAuthStore();
  const { records, fetchMyRecords } = usePerformanceStore();
  
  useEffect(() => {
    if (user) {
      fetchMyRecords(user.id);
    }
  }, [user, fetchMyRecords]);
  
  // 按月份排序
  const sortedRecords = [...records].sort((a, b) => b.month.localeCompare(a.month));
  
  // 获取最新记录
  const latestRecord = sortedRecords[0];
  const latestGroupType = latestRecord
    ? resolveGroupType(latestRecord.groupType, latestRecord.employeeLevel)
    : null;
  
  // 计算统计数据
  const stats = useMemo(() => {
    const averageScore = records.length > 0
      ? records.reduce((sum, r) => sum + r.totalScore, 0) / records.length
      : 0;
    
    const bestScore = records.length > 0
      ? Math.max(...records.map(r => r.totalScore))
      : 0;
    
    const bestDeptRank = records.length > 0
      ? Math.min(...records.map(r => r.departmentRank))
      : 0;
    
    const bestGroupRank = records.length > 0
      ? Math.min(...records.map(r => r.groupRank))
      : 0;
    
    return { averageScore, bestScore, bestDeptRank, bestGroupRank };
  }, [records]);
  
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
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">我的绩效</h1>
        <p className="text-gray-500 mt-1">查看历史绩效考核记录及排名</p>
      </motion.div>
      
      {/* Latest Performance Card */}
      {latestRecord && (
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                最新绩效 ({latestRecord.month})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Score */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">综合得分</p>
                  <ScoreDisplay score={latestRecord.totalScore} showLabel size="lg" />
                </div>
                
                {/* Department Rank */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">部门排名</p>
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-3xl font-bold text-blue-600">
                      {latestRecord.departmentRank}
                    </span>
                  </div>
                </div>

                {/* Group Rank */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">组内排名</p>
                  <div className="flex items-center justify-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    <span className="text-3xl font-bold text-purple-600">
                      {latestRecord.groupRank}
                    </span>
                  </div>
                  {latestGroupType ? (
                    <Badge 
                      className={cn(
                        "mt-1",
                        latestGroupType === 'high' 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-green-100 text-green-700"
                      )}
                    >
                      {latestGroupType === 'high' ? '高分组' : '低分组'}
                    </Badge>
                  ) : (
                    <Badge className="mt-1 bg-gray-100 text-gray-500">未分组</Badge>
                  )}
                </div>

                {/* Cross Dept Rank */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">跨部门排名</p>
                  <div className="flex items-center justify-center gap-2">
                    <Award className="w-5 h-5 text-green-500" />
                    <span className="text-3xl font-bold text-green-600">
                      {latestRecord.crossDeptRank || '-'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Dimension Scores */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">任务完成 (40%)</p>
                  <p className="text-xl font-bold text-blue-600">{latestRecord.taskCompletion.toFixed(2)}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">主动性 (30%)</p>
                  <p className="text-xl font-bold text-green-600">{latestRecord.initiative.toFixed(2)}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">项目反馈 (20%)</p>
                  <p className="text-xl font-bold text-purple-600">{latestRecord.projectFeedback.toFixed(2)}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">质量改进 (10%)</p>
                  <p className="text-xl font-bold text-orange-600">{latestRecord.qualityImprovement.toFixed(2)}</p>
                </div>
              </div>

              {/* Manager Feedback */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
                  <p className="text-xs text-gray-500 mb-2">经理评价</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {latestRecord.managerComment || '经理尚未评价'}
                  </p>
                </div>
                <div className="bg-white/70 rounded-lg p-4 border border-green-100">
                  <p className="text-xs text-gray-500 mb-2">下月工作安排</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {latestRecord.nextMonthWorkArrangement || '经理尚未填写'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">平均分</p>
                <p className="text-2xl font-bold">{stats.averageScore.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">最高分</p>
                <p className="text-2xl font-bold">{stats.bestScore.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">最佳部门排名</p>
                <p className="text-2xl font-bold">{stats.bestDeptRank || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">考核次数</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Chart */}
      {records.length > 0 && (
        <motion.div variants={itemVariants}>
          <PerformanceChart 
            records={records} 
            title="绩效得分趋势" 
          />
        </motion.div>
      )}
      
      {/* History Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">历史记录</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedRecords.length > 0 ? (
              <div className="space-y-4">
                {sortedRecords.map((record) => {
                  const groupType = resolveGroupType(record.groupType, record.employeeLevel);
                  return (
                  <div 
                    key={record.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">{record.month}</span>
                        <Badge 
                          className={cn(
                            latestRecord?.id === record.id && "bg-yellow-100 text-yellow-800"
                          )}
                        >
                          {latestRecord?.id === record.id ? '最新' : record.status}
                        </Badge>
                      </div>
                      <ScoreDisplay score={record.totalScore} size="sm" />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">部门排名</p>
                        <p className="font-semibold text-blue-600">{record.departmentRank}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">组内排名</p>
                        <p className="font-semibold text-purple-600">{record.groupRank}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">跨部门排名</p>
                        <p className="font-semibold text-green-600">{record.crossDeptRank || '-'}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">分组</p>
                        {groupType ? (
                          <Badge 
                            className={cn(
                              groupType === 'high' 
                                ? "bg-purple-100 text-purple-700" 
                                : "bg-green-100 text-green-700"
                            )}
                          >
                            {groupType === 'high' ? '高分组' : '低分组'}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500">未分组</Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Dimension Scores */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center">
                        <Progress value={(record.taskCompletion / 1.5) * 100} className="h-1.5 mb-1" />
                        <p className="text-xs text-gray-500">任务 {record.taskCompletion.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <Progress value={(record.initiative / 1.5) * 100} className="h-1.5 mb-1" />
                        <p className="text-xs text-gray-500">主动 {record.initiative.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <Progress value={(record.projectFeedback / 1.5) * 100} className="h-1.5 mb-1" />
                        <p className="text-xs text-gray-500">反馈 {record.projectFeedback.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <Progress value={(record.qualityImprovement / 1.5) * 100} className="h-1.5 mb-1" />
                        <p className="text-xs text-gray-500">质量 {record.qualityImprovement.toFixed(2)}</p>
                      </div>
                    </div>

                    {(record.managerComment || record.nextMonthWorkArrangement) && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-blue-50/60 rounded-lg p-3 border border-blue-100">
                          <p className="text-xs text-gray-500 mb-1">经理评价</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {record.managerComment || '—'}
                          </p>
                        </div>
                        <div className="bg-green-50/60 rounded-lg p-3 border border-green-100">
                          <p className="text-xs text-gray-500 mb-1">下月工作安排</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {record.nextMonthWorkArrangement || '—'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无绩效记录</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
