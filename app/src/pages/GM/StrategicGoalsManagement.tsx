/**
 * 总经理 - 战略目标管理
 * 功能：编辑公司战略、年度重点工作、部门重点工作
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Briefcase, Users, Plus, Save, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface StrategicGoal {
  id: string;
  title: string;
  description?: string;
  content?: string;
  year: number;
  type: 'company-strategy' | 'company-key-work' | 'department-key-work';
  department?: string;
  status: 'active' | 'draft';
}

export function StrategicGoalsManagement() {
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StrategicGoal | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    type: 'company-strategy' as StrategicGoal['type'],
    department: ''
  });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${API_BASE_URL}/strategic-objectives?year=${currentYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setGoals(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingGoal(null);
    setFormData({ title: '', description: '', content: '', type: 'company-strategy', department: '' });
    setEditDialogOpen(true);
  };

  const handleEdit = (goal: StrategicGoal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      content: goal.content || '',
      type: goal.type,
      department: goal.department || ''
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('请填写标题');
      return;
    }

    if (formData.type === 'department-key-work' && !formData.department.trim()) {
      toast.error('请选择部门');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const payload: any = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        year: currentYear,
        type: formData.type,
        department: formData.type === 'department-key-work' ? formData.department : undefined,
        status: 'active'
      };

      if (editingGoal) {
        // 更新
        const response = await fetch(`${API_BASE_URL}/strategic-objectives/${editingGoal.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          toast.success('更新成功');
          fetchGoals();
          setEditDialogOpen(false);
        } else {
          toast.error('更新失败');
        }
      } else {
        // 创建
        payload.id = uuidv4();
        const response = await fetch(`${API_BASE_URL}/strategic-objectives`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          toast.success('创建成功');
          fetchGoals();
          setEditDialogOpen(false);
        } else {
          toast.error('创建失败');
        }
      }
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条目标吗？')) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${API_BASE_URL}/strategic-objectives/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('删除成功');
        fetchGoals();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('删除失败');
    }
  };

  const companyStrategy = goals.find(g => g.type === 'company-strategy' && g.status === 'active');
  const companyKeyWorks = goals.filter(g => g.type === 'company-key-work' && g.status === 'active');
  const departmentKeyWorks = goals.filter(g => g.type === 'department-key-work' && g.status === 'active');

  const departments = ['营销中心', '研发中心', '生产中心', '供应链中心', '管理中心'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">战略目标管理</h1>
          <p className="text-gray-500 mt-1">设置公司战略、重点工作和部门目标</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          添加目标
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 公司战略 */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Target className="w-5 h-5" />
                公司战略
              </CardTitle>
              <CardDescription>公司长期发展方向</CardDescription>
            </CardHeader>
            <CardContent>
              {companyStrategy ? (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm">{companyStrategy.title}</h3>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(companyStrategy)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(companyStrategy.id)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {companyStrategy.description && (
                      <p className="text-xs text-gray-600 mb-2">{companyStrategy.description}</p>
                    )}
                    {companyStrategy.content && (
                      <p className="text-xs text-gray-500 whitespace-pre-wrap p-2 bg-white rounded">
                        {companyStrategy.content}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">暂未设置</p>
                  <Button size="sm" variant="outline" onClick={handleCreate}>
                    <Plus className="w-3 h-3 mr-1" />
                    添加战略
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 公司重点工作 */}
          <Card className="border-purple-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <Briefcase className="w-5 h-5" />
                    年度重点工作
                  </CardTitle>
                  <CardDescription>{currentYear}年度重点任务</CardDescription>
                </div>
                <Badge variant="outline">{companyKeyWorks.length}项</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {companyKeyWorks.map((kw, idx) => (
                  <div key={kw.id} className="p-2 bg-purple-50 rounded flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{kw.title}</p>
                      {kw.description && (
                        <p className="text-xs text-gray-600">{kw.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(kw)} className="h-6 w-6 p-0">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(kw.id)} className="h-6 w-6 p-0">
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                {companyKeyWorks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">暂无重点工作</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 部门重点工作 */}
          <Card className="border-green-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <Users className="w-5 h-5" />
                    部门重点工作
                  </CardTitle>
                  <CardDescription>各部门年度重点任务</CardDescription>
                </div>
                <Badge variant="outline">{departmentKeyWorks.length}项</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {departmentKeyWorks.map((dw) => (
                  <div key={dw.id} className="p-2 bg-green-50 rounded">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{dw.department}</Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{dw.title}</p>
                        {dw.description && (
                          <p className="text-xs text-gray-600 mt-0.5">{dw.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(dw)} className="h-6 w-6 p-0">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(dw.id)} className="h-6 w-6 p-0">
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {departmentKeyWorks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">暂无部门工作</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGoal ? '编辑目标' : '添加目标'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>类型 <span className="text-red-500">*</span></Label>
              <Select
                value={formData.type}
                onValueChange={(v: any) => setFormData({...formData, type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company-strategy">公司战略</SelectItem>
                  <SelectItem value="company-key-work">年度重点工作</SelectItem>
                  <SelectItem value="department-key-work">部门重点工作</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'department-key-work' && (
              <div>
                <Label>部门 <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => setFormData({...formData, department: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>标题 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="输入目标标题"
              />
            </div>

            <div>
              <Label>简介</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="简要描述（选填）"
                rows={2}
              />
            </div>

            <div>
              <Label>详细内容</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="详细描述目标内容、具体措施等（选填）"
                rows={5}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                取消
              </Button>
              <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
