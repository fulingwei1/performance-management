/**
 * 员工个人目标规划页面
 * 功能：员工根据公司战略、重点工作、部门重点，拆解自己的个人目标
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Save, Send, AlertCircle, Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StrategicGoalsDisplay } from '@/components/StrategicGoalsDisplay';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface PersonalGoal {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  unit: string;
  weight: number;
  quarterlyTargets: { quarter: number; target: number }[];
  monthlyTargets: {
    Q1: number[];
    Q2: number[];
    Q3: number[];
    Q4: number[];
  };
  alignedTo?: string; // 对齐到哪个公司/部门目标
}

interface AIGeneratedGoal {
  name: string;
  description: string;
  targetValue: number;
  unit: string;
  weight: number;
  alignedTo: string;
}

export function MyGoalPlanning() {
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'draft' | 'pending_approval' | 'approved' | 'rejected'>('draft');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // AI助手状态
  const [aiLoading, setAiLoading] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchMyGoals();
  }, [user]);

  const fetchMyGoals = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(
        `${API_BASE_URL}/objectives?year=${currentYear}&ownerId=${user.id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const result = await response.json();
        const existingGoals = result.data || [];
        
        // 转换为PersonalGoal格式
        const personalGoals = existingGoals
          .filter((obj: any) => obj.type === 'individual')
          .map((obj: any) => ({
            id: obj.id,
            name: obj.name,
            description: obj.description || '',
            targetValue: obj.targetValue || 0,
            unit: obj.unit || '',
            weight: obj.weight || 0,
            quarterlyTargets: obj.quarterlyTargets || [],
            monthlyTargets: obj.monthlyTargets || { Q1: [0, 0, 0], Q2: [0, 0, 0], Q3: [0, 0, 0], Q4: [0, 0, 0] },
            alignedTo: obj.parentId
          }));

        setGoals(personalGoals);
        
        // 检查状态
        if (existingGoals.length > 0) {
          const currentStatus = existingGoals[0].status;
          if (currentStatus === 'pending_approval' || currentStatus === 'approved' || currentStatus === 'rejected') {
            setStatus(currentStatus);
            if (currentStatus === 'rejected' && existingGoals[0].rejectionReason) {
              setRejectionReason(existingGoals[0].rejectionReason);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * AI生成目标建议
   */
  const handleGenerateAI = async () => {
    if (!user) return;

    setAiLoading(true);
    setAiGoals([]);
    setAiExplanation('');

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      // 获取公司战略和重点工作
      const strategicResponse = await fetch(
        `${API_BASE_URL}/strategic-objectives?year=${currentYear}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      let companyStrategy = '';
      let companyKeyWorks: string[] = [];
      let departmentKeyWorks: string[] = [];

      if (strategicResponse.ok) {
        const strategicResult = await strategicResponse.json();
        const strategicGoals = strategicResult.data || [];

        const strategy = strategicGoals.find((g: any) => g.type === 'company-strategy');
        companyStrategy = strategy?.content || '';

        companyKeyWorks = strategicGoals
          .filter((g: any) => g.type === 'company-key-work')
          .map((g: any) => g.title);

        departmentKeyWorks = strategicGoals
          .filter((g: any) => g.type === 'department-key-work' && g.department === user.department)
          .map((g: any) => g.title);
      }

      // 调用AI生成接口
      const response = await fetch(`${API_BASE_URL}/ai/goal-decomposition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          companyStrategy,
          companyKeyWorks,
          departmentKeyWorks
        })
      });

      if (response.ok) {
        const result = await response.json();
        const generatedGoals = result.data.goals || [];
        
        // 自动采用AI生成的目标
        if (generatedGoals.length > 0) {
          const newGoals = generatedGoals.map((ag: AIGeneratedGoal) => ({
            id: uuidv4(),
            name: ag.name,
            description: ag.description,
            targetValue: ag.targetValue,
            unit: ag.unit,
            weight: ag.weight,
            quarterlyTargets: [
              { quarter: 1, target: Math.round(ag.targetValue * 0.25) },
              { quarter: 2, target: Math.round(ag.targetValue * 0.25) },
              { quarter: 3, target: Math.round(ag.targetValue * 0.25) },
              { quarter: 4, target: Math.round(ag.targetValue * 0.25) }
            ],
            monthlyTargets: {
              Q1: [0, 0, 0],
              Q2: [0, 0, 0],
              Q3: [0, 0, 0],
              Q4: [0, 0, 0]
            },
            alignedTo: ag.alignedTo
          }));

          setGoals([...goals, ...newGoals]);
          toast.success(`AI已生成 ${generatedGoals.length} 个目标建议`);
        } else {
          toast.error('AI生成的目标为空');
        }
      } else {
        toast.error('AI生成失败');
      }
    } catch (error) {
      console.error('Error generating AI:', error);
      toast.error('AI生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  const addGoal = () => {
    const newGoal: PersonalGoal = {
      id: uuidv4(),
      name: '',
      description: '',
      targetValue: 0,
      unit: '',
      weight: 0,
      quarterlyTargets: [
        { quarter: 1, target: 0 },
        { quarter: 2, target: 0 },
        { quarter: 3, target: 0 },
        { quarter: 4, target: 0 }
      ],
      monthlyTargets: {
        Q1: [0, 0, 0],
        Q2: [0, 0, 0],
        Q3: [0, 0, 0],
        Q4: [0, 0, 0]
      }
    };
    setGoals([...goals, newGoal]);
  };

  const updateGoal = (id: string, updates: Partial<PersonalGoal>) => {
    setGoals(goals.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const validateGoals = () => {
    if (goals.length === 0) {
      toast.error('请至少添加一个目标');
      return false;
    }

    for (const goal of goals) {
      if (!goal.name.trim()) {
        toast.error('请填写目标名称');
        return false;
      }
      if (goal.weight <= 0) {
        toast.error('请设置目标权重');
        return false;
      }
    }

    const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error(`权重总和必须为100%，当前为${totalWeight.toFixed(1)}%`);
      return false;
    }

    return true;
  };

  const saveDraft = async () => {
    if (!validateGoals()) return;

    setSaving(true);
    try {
      await saveGoalsToBackend('draft');
      toast.success('草稿已保存');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const submitGoals = async () => {
    if (!validateGoals()) return;
    if (!user?.managerId) {
      toast.error('无法找到您的直属经理，请联系HR');
      return;
    }

    setSaving(true);
    try {
      // 先保存所有目标为草稿
      await saveGoalsToBackend('draft');
      
      // 然后提交审批
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      for (const goal of goals) {
        // 调用提交审批API
        await fetch(`${API_BASE_URL}/objectives/${goal.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: 'pending_approval',
            approverId: user.managerId
          })
        });
      }
      
      setStatus('pending_approval');
      toast.success('目标已提交，等待经理审批');
    } catch (error) {
      console.error('提交失败:', error);
      toast.error('提交失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const saveGoalsToBackend = async (submitStatus: 'draft' | 'pending_approval') => {
    const token = localStorage.getItem('token');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    // 逐个保存目标
    for (const goal of goals) {
      const payload = {
        id: goal.id,
        name: goal.name,
        description: goal.description,
        year: currentYear,
        type: 'individual',
        targetEmployee: user?.id,
        weight: goal.weight,
        targetValue: goal.targetValue,
        unit: goal.unit,
        quarterlyTargets: goal.quarterlyTargets,
        monthlyTargets: goal.monthlyTargets,
        status: submitStatus
      };

      const response = await fetch(`${API_BASE_URL}/objectives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }
    }
  };

  const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的目标规划</h1>
            <p className="text-gray-500 mt-1">根据公司战略和部门重点，规划个人年度目标</p>
          </div>
          <div className="flex items-center gap-2">
            {status === 'pending_approval' && (
              <Badge className="bg-yellow-100 text-yellow-700">待审批</Badge>
            )}
            {status === 'approved' && (
              <Badge className="bg-green-100 text-green-700">已批准</Badge>
            )}
            {status === 'rejected' && (
              <Badge className="bg-red-100 text-red-700">已拒绝</Badge>
            )}
            {status === 'draft' && (
              <>
                <Badge variant="outline">草稿</Badge>
                <Button
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI 帮我规划目标
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 战略目标参考 */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-blue-900">战略目标参考</CardTitle>
            </div>
            <CardDescription className="text-blue-700">
              请参考以下公司和部门的战略目标，拆解出您的个人年度目标
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StrategicGoalsDisplay compact={false} showDepartment={true} />
          </CardContent>
        </Card>

        {/* 个人目标列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  我的{currentYear}年度目标
                </CardTitle>
                <CardDescription className="mt-2">
                  目标权重总和：
                  <span className={totalWeight === 100 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {totalWeight.toFixed(1)}%
                  </span>
                  {totalWeight !== 100 && <span className="text-red-600 ml-2">（需为100%）</span>}
                </CardDescription>
              </div>
              <Button
                onClick={addGoal}
                disabled={status !== 'draft' && status !== 'rejected'}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加目标
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">暂无目标，点击"AI 帮我规划目标"快速生成，或手动添加</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={handleGenerateAI}
                    disabled={aiLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 帮我规划
                  </Button>
                  <Button onClick={addGoal} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    手动添加
                  </Button>
                </div>
              </div>
            ) : (
              goals.map((goal, index) => (
                <Card key={goal.id} className="border-purple-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="目标名称（例如：完成销售额500万）"
                          value={goal.name}
                          onChange={(e) => updateGoal(goal.id, { name: e.target.value })}
                          disabled={status !== 'draft' && status !== 'rejected'}
                          className="font-medium"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeGoal(goal.id)}
                        disabled={status !== 'draft' && status !== 'rejected'}
                        className="text-red-500 hover:text-red-700"
                      >
                        删除
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 描述 */}
                    <div>
                      <Label className="text-xs text-gray-500">目标描述</Label>
                      <Textarea
                        placeholder="详细描述该目标的具体内容、衡量标准等"
                        value={goal.description}
                        onChange={(e) => updateGoal(goal.id, { description: e.target.value })}
                        disabled={status !== 'draft' && status !== 'rejected'}
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    {/* 目标值和权重 */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500">年度目标值</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={goal.targetValue || ''}
                          onChange={(e) => updateGoal(goal.id, { targetValue: parseFloat(e.target.value) || 0 })}
                          disabled={status !== 'draft' && status !== 'rejected'}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">单位</Label>
                        <Input
                          placeholder="万元/个/件"
                          value={goal.unit}
                          onChange={(e) => updateGoal(goal.id, { unit: e.target.value })}
                          disabled={status !== 'draft' && status !== 'rejected'}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">权重 (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={goal.weight || ''}
                          onChange={(e) => updateGoal(goal.id, { weight: parseFloat(e.target.value) || 0 })}
                          disabled={status !== 'draft' && status !== 'rejected'}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* 季度目标 */}
                    <div>
                      <Label className="text-xs text-gray-500 mb-2 block">季度目标分解</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {goal.quarterlyTargets.map((qt) => (
                          <div key={qt.quarter}>
                            <Label className="text-xs text-gray-400">Q{qt.quarter}</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={qt.target || ''}
                              onChange={(e) => {
                                const newQT = [...goal.quarterlyTargets];
                                newQT[qt.quarter - 1].target = parseFloat(e.target.value) || 0;
                                updateGoal(goal.id, { quarterlyTargets: newQT });
                              }}
                              disabled={status !== 'draft' && status !== 'rejected'}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {goal.alignedTo && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">对齐目标：</span>{goal.alignedTo}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* 提示 */}
        {status === 'draft' && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              <strong>规划提示：</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• 个人目标应与公司战略、部门重点工作保持一致</li>
                <li>• 目标应该具体、可衡量、可达成、相关性强、有时限（SMART原则）</li>
                <li>• 权重总和必须为100%，重要目标分配更高权重</li>
                <li>• 季度目标总和应等于年度目标</li>
                <li className="text-purple-700 font-medium">• 💡 点击"AI 帮我规划目标"可快速生成个人目标建议</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按钮 */}
        {(status === 'draft' || status === 'rejected') && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={saving || goals.length === 0}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              保存草稿
            </Button>
            <Button
              onClick={submitGoals}
              disabled={saving || totalWeight !== 100}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {status === 'rejected' ? '重新提交审批' : '提交给经理审批'}
            </Button>
          </div>
        )}

        {status === 'pending_approval' && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              您的年度目标已提交，等待经理审批。审批通过后将正式生效。
            </AlertDescription>
          </Alert>
        )}

        {status === 'approved' && (
          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-700">
              您的年度目标已获批准！现在可以开始执行目标并定期更新进度。
            </AlertDescription>
          </Alert>
        )}

        {status === 'rejected' && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <div className="font-medium mb-2">您的目标被拒绝</div>
              {rejectionReason && (
                <div className="text-sm">
                  <strong>拒绝原因：</strong>{rejectionReason}
                </div>
              )}
              <div className="text-sm mt-2">
                请根据反馈修改目标后重新提交。
              </div>
            </AlertDescription>
          </Alert>
        )}
      </motion.div>
    </>
  );
}
