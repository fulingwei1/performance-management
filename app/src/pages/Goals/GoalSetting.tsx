/**
 * 目标设置页面
 * 支持CEO/经理设置战略目标、部门目标、个人目标
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { goalApi, Objective, QuarterlyTarget, MonthlyTargets } from '@/services/goalApi';
import { useAuthStore } from '@/stores/authStore';
import { employeeApi } from '@/services/api';

const levelLabels: Record<string, string> = {
  strategic: '战略目标',
  department: '部门目标',
  individual: '个人目标',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  active: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export function GoalSetting() {
  const { user } = useAuthStore();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Objective | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'individual' as 'strategic' | 'department' | 'individual',
    department: user?.department || '',
    ownerId: '',
    year: selectedYear,
    weight: 100,
    targetValue: 0,
    quarterlyTargets: [
      { quarter: 1, target: 0 },
      { quarter: 2, target: 0 },
      { quarter: 3, target: 0 },
      { quarter: 4, target: 0 },
    ] as QuarterlyTarget[],
    monthlyTargets: {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0,
      '7': 0, '8': 0, '9': 0, '10': 0, '11': 0, '12': 0,
    } as MonthlyTargets,
  });

  // 加载目标列表
  const loadObjectives = async () => {
    setLoading(true);
    try {
      const response = await goalApi.getAll({ year: selectedYear });
      if (response.success) {
        setObjectives(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载员工列表
  const loadEmployees = async () => {
    try {
      const response = await employeeApi.getAll();
      if (response.success) {
        setEmployees(response.data);
      }
    } catch (error: any) {
      console.error('加载员工失败:', error);
    }
  };

  useEffect(() => {
    loadObjectives();
    loadEmployees();
  }, [selectedYear]);

  // 计算季度总和
  const getQuarterlyTotal = () => {
    return formData.quarterlyTargets.reduce((sum, q) => sum + q.target, 0);
  };

  // 计算月度总和
  const getMonthlyTotal = () => {
    return Object.values(formData.monthlyTargets).reduce((sum, val) => sum + val, 0);
  };

  // 验证权重
  const validateWeights = () => {
    const total = objectives.reduce((sum, obj) => sum + obj.weight, 0) + formData.weight;
    return Math.abs(total - 100) < 0.01;
  };

  // 创建/更新目标
  const handleSubmit = async () => {
    // 验证
    if (!formData.title || !formData.ownerId) {
      toast.error('请填写目标标题和负责人');
      return;
    }

    if (formData.level === 'individual' && formData.targetValue > 0) {
      const quarterlyTotal = getQuarterlyTotal();
      if (Math.abs(quarterlyTotal - formData.targetValue) > 0.01) {
        toast.error(`季度目标总和 (${quarterlyTotal}) 与年度目标 (${formData.targetValue}) 不一致`);
        return;
      }
    }

    setLoading(true);
    try {
      if (editingGoal) {
        await goalApi.update(editingGoal.id, formData);
        toast.success('目标更新成功');
      } else {
        await goalApi.create(formData);
        toast.success('目标创建成功');
      }
      setShowCreateDialog(false);
      resetForm();
      loadObjectives();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除目标
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个目标吗？')) return;
    
    setLoading(true);
    try {
      await goalApi.delete(id);
      toast.success('目标删除成功');
      loadObjectives();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      level: 'individual',
      department: user?.department || '',
      ownerId: '',
      year: selectedYear,
      weight: 100,
      targetValue: 0,
      quarterlyTargets: [
        { quarter: 1, target: 0 },
        { quarter: 2, target: 0 },
        { quarter: 3, target: 0 },
        { quarter: 4, target: 0 },
      ],
      monthlyTargets: {
        '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0,
        '7': 0, '8': 0, '9': 0, '10': 0, '11': 0, '12': 0,
      },
    });
    setEditingGoal(null);
  };

  // 编辑目标
  const handleEdit = (objective: Objective) => {
    setEditingGoal(objective);
    setFormData({
      title: objective.title,
      description: objective.description,
      level: objective.level,
      department: objective.department,
      ownerId: objective.ownerId,
      year: objective.year,
      weight: objective.weight,
      targetValue: objective.targetValue || 0,
      quarterlyTargets: objective.quarterlyTargets || [
        { quarter: 1, target: 0 },
        { quarter: 2, target: 0 },
        { quarter: 3, target: 0 },
        { quarter: 4, target: 0 },
      ],
      monthlyTargets: objective.monthlyTargets || {
        '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0,
        '7': 0, '8': 0, '9': 0, '10': 0, '11': 0, '12': 0,
      },
    });
    setShowCreateDialog(true);
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
          <h1 className="text-2xl font-bold text-gray-900">目标设置</h1>
          <p className="text-gray-500 mt-1">设置公司战略目标、部门目标和个人目标</p>
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

          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                新建目标
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGoal ? '编辑目标' : '新建目标'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* 基本信息 */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>目标类型</Label>
                      <Select value={formData.level} onValueChange={(v: any) => setFormData({ ...formData, level: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strategic">战略目标</SelectItem>
                          <SelectItem value="department">部门目标</SelectItem>
                          <SelectItem value="individual">个人目标</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>权重 (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>目标标题 *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="例如：2026年公司年度营收目标"
                    />
                  </div>

                  <div>
                    <Label>目标描述</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="详细描述目标内容"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>部门</Label>
                      <Input
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>负责人 *</Label>
                      <Select value={formData.ownerId} onValueChange={(v) => setFormData({ ...formData, ownerId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择负责人" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} ({emp.department})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>年度目标值</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.targetValue}
                      onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                      placeholder="例如：96000000 (9600万)"
                    />
                  </div>
                </div>

                {/* 季度分解 */}
                {formData.level !== 'strategic' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">季度目标分解</Label>
                      <span className="text-sm text-gray-500">
                        总和: {getQuarterlyTotal().toLocaleString()} 
                        {formData.targetValue > 0 && (
                          <span className={getQuarterlyTotal() === formData.targetValue ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                            {getQuarterlyTotal() === formData.targetValue ? '✓' : '✗'}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {formData.quarterlyTargets.map((qt, index) => (
                        <div key={qt.quarter}>
                          <Label>Q{qt.quarter}</Label>
                          <Input
                            type="number"
                            min="0"
                            value={qt.target}
                            onChange={(e) => {
                              const newTargets = [...formData.quarterlyTargets];
                              newTargets[index].target = Number(e.target.value);
                              setFormData({ ...formData, quarterlyTargets: newTargets });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 月度分解 */}
                {formData.level === 'individual' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">月度目标分解</Label>
                      <span className="text-sm text-gray-500">
                        总和: {getMonthlyTotal().toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-3">
                      {Object.keys(formData.monthlyTargets).map((month) => (
                        <div key={month}>
                          <Label>{month}月</Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.monthlyTargets[month]}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                monthlyTargets: {
                                  ...formData.monthlyTargets,
                                  [month]: Number(e.target.value),
                                },
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}>
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? '提交中...' : editingGoal ? '更新' : '创建'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 目标列表 */}
      <div className="space-y-4">
        {loading && <div className="text-center text-gray-500 py-8">加载中...</div>}
        
        {!loading && objectives.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              暂无目标数据，点击"新建目标"开始设置
            </CardContent>
          </Card>
        )}

        {!loading && objectives.map(objective => (
          <Card key={objective.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{levelLabels[objective.level]}</Badge>
                    <Badge className={statusColors[objective.status]}>
                      {statusLabels[objective.status]}
                    </Badge>
                    {objective.employeeConfirmedAt && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        已确认
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{objective.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{objective.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(objective)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(objective.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">负责人:</span>
                  <span className="ml-2 font-medium">{objective.ownerName || objective.ownerId}</span>
                </div>
                <div>
                  <span className="text-gray-500">权重:</span>
                  <span className="ml-2 font-medium">{objective.weight}%</span>
                </div>
                <div>
                  <span className="text-gray-500">年度目标:</span>
                  <span className="ml-2 font-medium">
                    {objective.targetValue?.toLocaleString() || '-'}
                  </span>
                </div>
              </div>

              {objective.quarterlyTargets && objective.quarterlyTargets.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-gray-500 mb-2">季度分解:</div>
                  <div className="flex gap-3">
                    {objective.quarterlyTargets.map(qt => (
                      <div key={qt.quarter} className="flex-1 bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500">Q{qt.quarter}</div>
                        <div className="font-medium">{qt.target.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
