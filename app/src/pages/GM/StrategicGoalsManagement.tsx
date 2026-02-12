/**
 * 总经理 - 战略目标管理
 * 功能：编辑公司战略、年度重点工作、部门重点工作
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Briefcase, Users, Plus, Save, Edit2, Trash2, Sparkles, Loader2 } from 'lucide-react';
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

  // AI助手状态
  const [aiLoading, setAiLoading] = useState(false);

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

        const result = await response.json();
        
        if (response.ok && result.success) {
          toast.success('更新成功');
          fetchGoals();
          setEditDialogOpen(false);
        } else {
          const errorMsg = result.error || result.message || '更新失败';
          console.error('更新失败:', errorMsg, result);
          toast.error(`更新失败：${errorMsg}`);
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

        const result = await response.json();
        
        if (response.ok && result.success) {
          toast.success('创建成功');
          fetchGoals();
          setEditDialogOpen(false);
        } else {
          const errorMsg = result.error || result.message || '创建失败';
          console.error('创建失败:', errorMsg, result);
          toast.error(`创建失败：${errorMsg}`);
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

  /**
   * AI生成内容
   */
  const handleGenerateAI = async () => {
    setAiLoading(true);
    setAiVersions([]);

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      let endpoint = '';
      let payload: any = { year: currentYear };

      // 根据类型选择不同的AI生成接口
      if (formData.type === 'company-strategy') {
        endpoint = '/ai/company-strategy';
        payload.currentStrategy = formData.content;
        payload.companyName = '金凯博自动化';
        payload.industry = '自动化测试设备';
      } else if (formData.type === 'company-key-work') {
        endpoint = '/ai/company-key-works';
        payload.strategy = companyStrategies[0]?.content;
        payload.companyName = '金凯博自动化';
      } else if (formData.type === 'department-key-work') {
        endpoint = '/ai/department-key-works';
        payload.department = formData.department;
        payload.companyStrategy = companyStrategies[0]?.content;
        payload.companyKeyWorks = companyKeyWorks.map(g => g.title);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        
        // 处理不同的响应格式并自动采用第一个版本
        let contentToAdopt = '';
        
        if (formData.type === 'company-strategy') {
          const versions = result.data.versions || [];
          contentToAdopt = versions[0] || '';
        } else {
          // 对于company-key-works和department-key-works，需要格式化works数组
          const versions = result.data.versions || [];
          if (versions.length > 0 && versions[0].works && Array.isArray(versions[0].works)) {
            contentToAdopt = versions[0].works.map((w: any, idx: number) => 
              `${idx + 1}. ${w.name}\n   ${w.description || ''}`
            ).join('\n\n');
          }
        }

        // 自动采用第一个版本
        if (contentToAdopt) {
          setFormData({ ...formData, content: contentToAdopt });
          toast.success('AI内容已自动填入');
        } else {
          toast.error('AI生成的内容为空');
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

  const companyStrategies = goals.filter(g => g.type === 'company-strategy');
  const companyKeyWorks = goals.filter(g => g.type === 'company-key-work');
  const departmentKeyWorks = goals.filter(g => g.type === 'department-key-work');

  const departments = ['营销中心', '研发中心', '生产中心', '供应链中心', '管理中心'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-6">
        {/* 页面标题 - 优化设计 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              战略目标管理
            </h1>
            <p className="text-gray-500 mt-2">设置公司战略、重点工作和部门目标</p>
          </div>
          <Button 
            onClick={handleCreate} 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加目标
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : (
          <div className="space-y-6">
            {/* 公司战略 - 蓝色主题 */}
            <Card className="border-0 shadow-xl shadow-blue-100 hover:shadow-2xl hover:shadow-blue-200 transition-all duration-300">
              <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-b border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-blue-900 text-lg">公司战略</CardTitle>
                    <CardDescription className="text-blue-600">公司长期发展方向</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 max-h-[600px] overflow-y-auto">
                {companyStrategies.length > 0 ? (
                  <div className="space-y-4">
                    {companyStrategies.map((strategy) => (
                      <motion.div 
                        key={strategy.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-sm text-gray-900 flex-1 pr-2">{strategy.title}</h3>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(strategy)} className="h-7 w-7 p-0 hover:bg-blue-100">
                              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(strategy.id)} className="h-7 w-7 p-0 hover:bg-red-100">
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        {strategy.description && (
                          <p className="text-xs text-gray-600 mb-3 leading-relaxed">{strategy.description}</p>
                        )}
                        {strategy.content && (
                          <div className="text-xs text-gray-700 whitespace-pre-wrap p-3 bg-white rounded-lg border border-blue-100 leading-relaxed">
                            {strategy.content}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                      <Target className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-sm text-gray-400 mb-4">暂未设置公司战略</p>
                    <Button size="sm" variant="outline" onClick={handleCreate} className="border-blue-300 text-blue-600 hover:bg-blue-50">
                      <Plus className="w-3 h-3 mr-1" />
                      添加战略
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 年度重点工作 - 紫色主题 */}
            <Card className="border-0 shadow-xl shadow-purple-100 hover:shadow-2xl hover:shadow-purple-200 transition-all duration-300">
              <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-b border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-purple-900 text-lg">年度重点工作</CardTitle>
                      <CardDescription className="text-purple-600">{currentYear}年度重点任务</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-purple-600 text-white border-0">{companyKeyWorks.length}项</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 max-h-[600px] overflow-y-auto">
                <div className="space-y-3">
                  {companyKeyWorks.map((kw, idx) => (
                    <motion.div 
                      key={kw.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group p-3 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all duration-200 flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white text-sm flex items-center justify-center font-bold shadow-md">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">{kw.title}</p>
                        {kw.description && (
                          <p className="text-xs text-gray-600 leading-relaxed">{kw.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(kw)} className="h-7 w-7 p-0 hover:bg-purple-100">
                          <Edit2 className="w-3.5 h-3.5 text-purple-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(kw.id)} className="h-7 w-7 p-0 hover:bg-red-100">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                  {companyKeyWorks.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                        <Briefcase className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="text-sm text-gray-400">暂无重点工作</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 部门重点工作 - 绿色主题 */}
            <Card className="border-0 shadow-xl shadow-green-100 hover:shadow-2xl hover:shadow-green-200 transition-all duration-300">
              <CardHeader className="bg-gradient-to-br from-green-50 to-green-100/50 border-b border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-green-900 text-lg">部门重点工作</CardTitle>
                      <CardDescription className="text-green-600">各部门年度重点任务</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white border-0">{departmentKeyWorks.length}项</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 max-h-[600px] overflow-y-auto">
                <div className="space-y-3">
                  {departmentKeyWorks.map((dw, idx) => (
                    <motion.div 
                      key={dw.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group p-3 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100 hover:border-green-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="text-xs bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-sm">
                              {dw.department}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mb-1">{dw.title}</p>
                          {dw.description && (
                            <p className="text-xs text-gray-600 leading-relaxed">{dw.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(dw)} className="h-7 w-7 p-0 hover:bg-green-100">
                            <Edit2 className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(dw.id)} className="h-7 w-7 p-0 hover:bg-red-100">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {departmentKeyWorks.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <Users className="w-8 h-8 text-green-400" />
                      </div>
                      <p className="text-sm text-gray-400">暂无部门工作</p>
                    </div>
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
                <div className="flex items-center justify-between mb-2">
                  <Label>详细内容</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateAI}
                    disabled={aiLoading || (formData.type === 'department-key-work' && !formData.department)}
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
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="详细描述目标内容、具体措施等（选填）"
                  rows={5}
                />
                <p className="text-xs text-gray-400 mt-1">
                  💡 点击"AI 帮我写"可以根据已有信息生成建议内容
                </p>
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
