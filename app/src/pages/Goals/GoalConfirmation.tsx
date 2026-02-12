/**
 * 员工目标确认页面
 * 员工查看分配的目标并确认接受
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { goalApi, Objective } from '@/services/goalApi';
import { useAuthStore } from '@/stores/authStore';

const levelLabels: Record<string, string> = {
  strategic: '战略目标',
  department: '部门目标',
  individual: '个人目标',
};

export function GoalConfirmation() {
  const { user } = useAuthStore();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmingGoal, setConfirmingGoal] = useState<Objective | null>(null);
  const [feedback, setFeedback] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [aiLoading, setAiLoading] = useState(false);

  // 加载目标列表
  const loadObjectives = async () => {
    if (!user?.userId) return;
    
    setLoading(true);
    try {
      const response = await goalApi.getAll({
        ownerId: user.userId,
        year: selectedYear,
      });
      if (response.success) {
        setObjectives(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObjectives();
  }, [selectedYear, user?.userId]);

  /**
   * AI生成反馈意见
   */
  const handleGenerateFeedback = async () => {
    if (!confirmingGoal || !user) return;

    setAiLoading(true);

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${API_BASE_URL}/ai/goal-confirmation-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeName: user.name,
          goalName: confirmingGoal.title,
          targetValue: confirmingGoal.targetValue,
          unit: confirmingGoal.unit
        })
      });

      if (response.ok) {
        const result = await response.json();
        const versions = result.data.versions || [];
        if (versions.length > 0) {
          setFeedback(versions[0]);
        }
      }
    } catch (error) {
      console.error('Error generating AI feedback:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // 确认目标
  const handleConfirm = async () => {
    if (!confirmingGoal) return;

    setLoading(true);
    try {
      await goalApi.confirm(confirmingGoal.id, feedback || undefined);
      toast.success('目标确认成功');
      setConfirmingGoal(null);
      setFeedback('');
      loadObjectives();
    } catch (error: any) {
      toast.error(error.message || '确认失败');
    } finally {
      setLoading(false);
    }
  };

  // 待确认和已确认的目标
  const pendingGoals = objectives.filter(obj => !obj.employeeConfirmedAt && obj.status === 'draft');
  const confirmedGoals = objectives.filter(obj => obj.employeeConfirmedAt || obj.status === 'active');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">目标确认</h1>
        <p className="text-gray-500 mt-1">查看并确认经理为您设置的目标</p>
      </div>

      {/* 待确认目标 */}
      {pendingGoals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">待确认目标</h2>
            <Badge variant="destructive">{pendingGoals.length}</Badge>
          </div>

          {pendingGoals.map(objective => (
            <Card key={objective.id} className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{levelLabels[objective.level]}</Badge>
                      <Badge className="bg-orange-100 text-orange-700">
                        待确认
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{objective.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{objective.description}</p>
                  </div>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setConfirmingGoal(objective)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    确认目标
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">年度目标:</span>
                    <div className="font-medium text-lg">
                      {objective.targetValue?.toLocaleString() || '-'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">权重:</span>
                    <div className="font-medium text-lg">{objective.weight}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">部门:</span>
                    <div className="font-medium">{objective.department}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">年份:</span>
                    <div className="font-medium">{objective.year}年</div>
                  </div>
                </div>

                {/* 季度分解 */}
                {objective.quarterlyTargets && objective.quarterlyTargets.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-2 font-medium">季度目标分解:</div>
                    <div className="grid grid-cols-4 gap-3">
                      {objective.quarterlyTargets.map(qt => (
                        <div key={qt.quarter} className="bg-white p-3 rounded-lg border">
                          <div className="text-xs text-gray-500 mb-1">第{qt.quarter}季度</div>
                          <div className="font-semibold text-blue-600">
                            {qt.target.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 月度分解 */}
                {objective.monthlyTargets && Object.keys(objective.monthlyTargets).length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-2 font-medium">月度目标分解:</div>
                    <div className="grid grid-cols-6 gap-2">
                      {Object.entries(objective.monthlyTargets).map(([month, target]) => (
                        <div key={month} className="bg-white p-2 rounded border text-center">
                          <div className="text-xs text-gray-500">{month}月</div>
                          <div className="font-medium text-sm">
                            {(target as number).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 已确认目标 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">已确认目标</h2>
          <Badge variant="secondary">{confirmedGoals.length}</Badge>
        </div>

        {confirmedGoals.length === 0 && pendingGoals.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              暂无目标数据
            </CardContent>
          </Card>
        )}

        {confirmedGoals.map(objective => (
          <Card key={objective.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{levelLabels[objective.level]}</Badge>
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已确认
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{objective.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{objective.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">年度目标:</span>
                  <div className="font-medium">{objective.targetValue?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <span className="text-gray-500">权重:</span>
                  <div className="font-medium">{objective.weight}%</div>
                </div>
                <div>
                  <span className="text-gray-500">进度:</span>
                  <div className="font-medium">{objective.progress}%</div>
                </div>
                <div>
                  <span className="text-gray-500">确认时间:</span>
                  <div className="font-medium text-xs">
                    {objective.employeeConfirmedAt
                      ? new Date(objective.employeeConfirmedAt).toLocaleDateString('zh-CN')
                      : '-'}
                  </div>
                </div>
              </div>

              {objective.employeeFeedback && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    我的反馈:
                  </div>
                  <div className="text-sm">{objective.employeeFeedback}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 确认对话框 */}
      <Dialog
        open={!!confirmingGoal}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingGoal(null);
            setFeedback('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>确认目标</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-lg mb-2">{confirmingGoal?.title}</div>
              <div className="text-sm text-gray-600">{confirmingGoal?.description}</div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">年度目标:</span>
                  <span className="ml-2 font-semibold text-blue-600">
                    {confirmingGoal?.targetValue?.toLocaleString() || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">权重:</span>
                  <span className="ml-2 font-semibold text-blue-600">
                    {confirmingGoal?.weight}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>您的反馈（选填）</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateFeedback}
                  disabled={aiLoading}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  AI 帮我写
                </Button>
              </div>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="对这个目标有什么想法或建议？可以在这里填写..."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                您可以提供对目标的看法、建议或疑问，经理会收到您的反馈。
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmingGoal(null);
                setFeedback('');
              }}
            >
              取消
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? '确认中...' : '确认接受'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
