/**
 * 目标进度追踪页面
 * 员工填写月度完成度，经理审核
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { goalApi, goalProgressApi, Objective, GoalProgress } from '@/services/goalApi';
import { useAuthStore } from '@/stores/authStore';

const statusLabels: Record<string, string> = {
  draft: '草稿',
  employee_submitted: '已提交',
  manager_reviewed: '已审核',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  employee_submitted: 'bg-blue-100 text-blue-700',
  manager_reviewed: 'bg-green-100 text-green-700',
};

export function GoalProgressPage() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'manager' || user?.role === 'gm';

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [progressData, setProgressData] = useState<Record<string, GoalProgress>>({});
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<GoalProgress | null>(null);

  const [formData, setFormData] = useState({
    completionRate: 100,
    comment: '',
  });

  // 加载目标列表
  const loadObjectives = async () => {
    if (!user?.userId) return;

    setLoading(true);
    try {
      const params = isManager
        ? { year: selectedYear, department: user.department }
        : { ownerId: user.userId, year: selectedYear };

      const response = await goalApi.getAll(params);
      if (response.success) {
        const activeGoals = response.data.filter(
          (obj: Objective) => obj.status === 'active' || obj.employeeConfirmedAt
        );
        setObjectives(activeGoals);
        
        // 加载所有目标的进度
        loadAllProgress(activeGoals);
      }
    } catch (error: any) {
      toast.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载所有目标的进度
  const loadAllProgress = async (objs: Objective[]) => {
    try {
      const progressMap: Record<string, GoalProgress> = {};
      
      for (const obj of objs) {
        const response = await goalProgressApi.getByObjectiveAndMonth(
          obj.id,
          selectedYear,
          selectedMonth
        );
        if (response.success && response.data) {
          progressMap[obj.id] = response.data;
        }
      }
      
      setProgressData(progressMap);
    } catch (error) {
      console.error('加载进度失败:', error);
    }
  };

  useEffect(() => {
    loadObjectives();
  }, [selectedYear, selectedMonth, user?.userId]);

  // 员工提交进度
  const handleSubmitProgress = async () => {
    if (!selectedObjective) return;

    if (formData.completionRate < 0 || formData.completionRate > 200) {
      toast.error('完成率应在0-200%之间');
      return;
    }

    setLoading(true);
    try {
      await goalProgressApi.submitEmployee({
        objectiveId: selectedObjective.id,
        year: selectedYear,
        month: selectedMonth,
        completionRate: formData.completionRate,
        comment: formData.comment || undefined,
      });
      toast.success('进度提交成功');
      setShowSubmitDialog(false);
      setFormData({ completionRate: 100, comment: '' });
      loadObjectives();
    } catch (error: any) {
      toast.error(error.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  // 经理审核进度
  const handleReviewProgress = async () => {
    if (!selectedProgress) return;

    if (formData.completionRate < 0 || formData.completionRate > 200) {
      toast.error('完成率应在0-200%之间');
      return;
    }

    setLoading(true);
    try {
      await goalProgressApi.reviewManager(selectedProgress.id, {
        completionRate: formData.completionRate,
        comment: formData.comment || undefined,
      });
      toast.success('审核完成');
      setShowReviewDialog(false);
      setFormData({ completionRate: 100, comment: '' });
      loadObjectives();
    } catch (error: any) {
      toast.error(error.message || '审核失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开提交对话框
  const openSubmitDialog = (objective: Objective) => {
    setSelectedObjective(objective);
    const progress = progressData[objective.id];
    setFormData({
      completionRate: progress?.employeeCompletionRate || 100,
      comment: progress?.employeeComment || '',
    });
    setShowSubmitDialog(true);
  };

  // 打开审核对话框
  const openReviewDialog = (objective: Objective, progress: GoalProgress) => {
    setSelectedObjective(objective);
    setSelectedProgress(progress);
    setFormData({
      completionRate: progress.managerCompletionRate || progress.employeeCompletionRate || 100,
      comment: progress.managerComment || '',
    });
    setShowReviewDialog(true);
  };

  // 获取月度目标
  const getMonthlyTarget = (objective: Objective): number => {
    if (objective.monthlyTargets) {
      return objective.monthlyTargets[String(selectedMonth)] || 0;
    }
    return 0;
  };

  // 获取进度状态
  const getProgressStatus = (objective: Objective) => {
    const progress = progressData[objective.id];
    if (!progress) {
      return { status: 'pending', label: '待提交', color: 'text-gray-500' };
    }
    if (progress.status === 'employee_submitted') {
      return { status: 'submitted', label: '已提交', color: 'text-blue-600' };
    }
    if (progress.status === 'manager_reviewed') {
      return { status: 'reviewed', label: '已审核', color: 'text-green-600' };
    }
    return { status: 'draft', label: '草稿', color: 'text-gray-500' };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">目标进度追踪</h1>
          <p className="text-gray-500 mt-1">
            {isManager ? '审核团队成员的月度目标完成情况' : '记录每月目标完成度'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(year => (
                <SelectItem key={year} value={String(year)}>{year}年</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <SelectItem key={month} value={String(month)}>{month}月</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 目标列表 */}
      <div className="space-y-4">
        {loading && <div className="text-center text-gray-500 py-8">加载中...</div>}
        
        {!loading && objectives.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              暂无目标数据
            </CardContent>
          </Card>
        )}

        {!loading && objectives.map(objective => {
          const progress = progressData[objective.id];
          const progressStatus = getProgressStatus(objective);
          const monthlyTarget = getMonthlyTarget(objective);
          const completionRate = progress?.managerCompletionRate || progress?.employeeCompletionRate || 0;

          return (
            <Card key={objective.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{objective.title}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{objective.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[progress?.status || 'draft']}>
                      {statusLabels[progress?.status || 'draft']}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 目标信息 */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">月度目标:</span>
                    <div className="font-semibold text-lg">
                      {monthlyTarget > 0 ? monthlyTarget.toLocaleString() : '未设置'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">完成率:</span>
                    <div className="font-semibold text-lg">
                      <span className={
                        completionRate >= 100 ? 'text-green-600' :
                        completionRate >= 80 ? 'text-blue-600' :
                        'text-orange-600'
                      }>
                        {completionRate}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">状态:</span>
                    <div className={`font-semibold ${progressStatus.color}`}>
                      {progressStatus.label}
                    </div>
                  </div>
                </div>

                {/* 进度条 */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>完成进度</span>
                    <span>{completionRate}%</span>
                  </div>
                  <Progress value={Math.min(completionRate, 100)} className="h-2" />
                </div>

                {/* 进度详情 */}
                {progress && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 员工提交 */}
                    {progress.employeeCompletionRate !== undefined && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">员工提交</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-gray-600">完成率:</span>
                            <span className="ml-2 font-semibold">{progress.employeeCompletionRate}%</span>
                          </div>
                          {progress.employeeComment && (
                            <div>
                              <span className="text-gray-600">说明:</span>
                              <div className="text-gray-700 mt-1">{progress.employeeComment}</div>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            提交时间: {new Date(progress.employeeSubmittedAt!).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 经理审核 */}
                    {progress.managerCompletionRate !== undefined && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">经理审核</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-gray-600">审定完成率:</span>
                            <span className="ml-2 font-semibold">{progress.managerCompletionRate}%</span>
                          </div>
                          {progress.managerComment && (
                            <div>
                              <span className="text-gray-600">审核意见:</span>
                              <div className="text-gray-700 mt-1">{progress.managerComment}</div>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            审核时间: {new Date(progress.managerReviewedAt!).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  {!isManager && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openSubmitDialog(objective)}
                    >
                      {progress ? '修改进度' : '提交进度'}
                    </Button>
                  )}

                  {isManager && progress && progress.status === 'employee_submitted' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openReviewDialog(objective, progress)}
                    >
                      审核进度
                    </Button>
                  )}

                  {isManager && progress && progress.status === 'manager_reviewed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReviewDialog(objective, progress)}
                    >
                      修改审核
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 员工提交进度对话框 */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>提交月度进度</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-semibold">{selectedObjective?.title}</div>
              <div className="text-sm text-gray-600 mt-1">
                {selectedYear}年{selectedMonth}月 | 月度目标: {getMonthlyTarget(selectedObjective!).toLocaleString()}
              </div>
            </div>

            <div>
              <Label>完成率 (%)</Label>
              <Input
                type="number"
                min="0"
                max="200"
                value={formData.completionRate}
                onChange={(e) => setFormData({ ...formData, completionRate: Number(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                填写本月实际完成率，0-200%。超过100%表示超额完成。
              </p>
            </div>

            <div>
              <Label>完成情况说明（选填）</Label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="简要说明本月完成情况、遇到的问题或下月计划..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitProgress} disabled={loading}>
              {loading ? '提交中...' : '提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 经理审核进度对话框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>审核月度进度</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-semibold">{selectedObjective?.title}</div>
              <div className="text-sm text-gray-600 mt-1">
                {selectedYear}年{selectedMonth}月
              </div>
            </div>

            {/* 员工提交的完成率 */}
            {selectedProgress?.employeeCompletionRate !== undefined && (
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-sm font-medium text-blue-900 mb-1">员工提交</div>
                <div className="text-sm">
                  <span className="text-gray-600">完成率:</span>
                  <span className="ml-2 font-semibold">{selectedProgress.employeeCompletionRate}%</span>
                </div>
                {selectedProgress.employeeComment && (
                  <div className="text-sm mt-2">
                    <span className="text-gray-600">说明:</span>
                    <div className="text-gray-700 mt-1">{selectedProgress.employeeComment}</div>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>审定完成率 (%)</Label>
              <Input
                type="number"
                min="0"
                max="200"
                value={formData.completionRate}
                onChange={(e) => setFormData({ ...formData, completionRate: Number(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                根据实际情况审定完成率
              </p>
            </div>

            <div>
              <Label>审核意见（选填）</Label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="填写审核意见、指导建议或下月工作安排..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              取消
            </Button>
            <Button onClick={handleReviewProgress} disabled={loading}>
              {loading ? '提交中...' : '确认审核'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
