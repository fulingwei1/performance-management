import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, ArrowRight, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { DifferentiatedScoringHelp } from '@/components/help/DifferentiatedScoringHelp';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEPARTMENT_TYPES = {
  sales: { label: '销售类', icon: '💰', color: 'bg-green-100 text-green-700' },
  engineering: { label: '工程类', icon: '🔧', color: 'bg-blue-100 text-blue-700' },
  manufacturing: { label: '生产类', icon: '🏭', color: 'bg-orange-100 text-orange-700' },
  support: { label: '支持类', icon: '📋', color: 'bg-purple-100 text-purple-700' },
  management: { label: '管理类', icon: '👔', color: 'bg-red-100 text-red-700' }
};

const LEVEL_SCORES = [
  { level: 'L5', score: 1.5, label: '卓越 (1.5)', color: 'text-green-600' },
  { level: 'L4', score: 1.2, label: '优秀 (1.2)', color: 'text-blue-600' },
  { level: 'L3', score: 1.0, label: '良好 (1.0)', color: 'text-gray-600' },
  { level: 'L2', score: 0.8, label: '待改进 (0.8)', color: 'text-orange-600' },
  { level: 'L1', score: 0.5, label: '不合格 (0.5)', color: 'text-red-600' }
];

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  department_type?: string;
}

interface Metric {
  id: string;
  metricName: string;
  metricCode: string;
  weight: number;
  category: string;
  description?: string;
  evaluationType: 'quantitative' | 'qualitative';
}

interface Template {
  id: string;
  name: string;
  departmentType: string;
  metrics: Metric[];
}

interface Score {
  metricId: string;
  level: string;
  score: number;
  comment?: string;
}

export function DifferentiatedScoring() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [scores, setScores] = useState<Map<string, Score>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/employees`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 如果是经理，只显示下属
          let employeeList = result.data || [];
          if (user?.role === 'manager') {
            employeeList = employeeList.filter((e: Employee) => e.managerId === user.id);
          }
          setEmployees(employeeList);
        }
      }
    } catch (error) {
      console.error('加载员工失败:', error);
      toast.error('加载员工失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (employee: Employee) => {
    try {
      setLoading(true);
      
      // 获取员工部门信息
      const deptResponse = await fetch(`${API_URL}/api/departments/tree`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      let deptType = 'support'; // 默认类型
      
      if (deptResponse.ok) {
        const deptResult = await deptResponse.json();
        if (deptResult.success) {
          const findDeptType = (depts: any[], name: string): string | null => {
            for (const dept of depts) {
              if (dept.name === name) return dept.department_type || null;
              if (dept.children) {
                const found = findDeptType(dept.children, name);
                if (found) return found;
              }
            }
            return null;
          };
          
          const foundType = findDeptType(deptResult.data || [], employee.department);
          if (foundType) deptType = foundType;
        }
      }
      
      // 加载对应模板
      const templateResponse = await fetch(`${API_URL}/api/assessment-templates/default/${deptType}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (templateResponse.ok) {
        const templateResult = await templateResponse.json();
        if (templateResult.success) {
          setTemplate(templateResult.data);
          setSelectedEmployee({ ...employee, department_type: deptType });
          setScores(new Map());
        } else {
          toast.error('未找到该部门类型的考核模板');
        }
      }
    } catch (error) {
      console.error('加载模板失败:', error);
      toast.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (metricId: string, level: string, score: number) => {
    const newScores = new Map(scores);
    newScores.set(metricId, {
      metricId,
      level,
      score,
      comment: scores.get(metricId)?.comment || ''
    });
    setScores(newScores);
  };

  const handleCommentChange = (metricId: string, comment: string) => {
    const newScores = new Map(scores);
    const existing = newScores.get(metricId) || { metricId, level: '', score: 0 };
    newScores.set(metricId, { ...existing, comment });
    setScores(newScores);
  };

  const calculateTotalScore = () => {
    if (!template) return 0;
    
    let totalWeightedScore = 0;
    
    template.metrics.forEach(metric => {
      const score = scores.get(metric.id);
      if (score) {
        totalWeightedScore += (score.score * metric.weight);
      }
    });
    
    return totalWeightedScore / 100; // 因为权重是百分比
  };

  const getCompletionRate = () => {
    if (!template) return 0;
    const completed = Array.from(scores.values()).filter(s => s.score > 0).length;
    return Math.round((completed / template.metrics.length) * 100);
  };

  const handleSave = async () => {
    if (!selectedEmployee || !template) return;
    
    const completionRate = getCompletionRate();
    if (completionRate < 100) {
      const confirm = window.confirm(
        `还有 ${template.metrics.length - scores.size} 个指标未评分，确定要保存吗？`
      );
      if (!confirm) return;
    }
    
    setSaving(true);
    
    try {
      const scoresArray = template.metrics.map(metric => {
        const score = scores.get(metric.id);
        return {
          metricName: metric.metricName,
          metricCode: metric.metricCode,
          weight: metric.weight,
          level: score?.level || 'L3',
          score: score?.score || 1.0,
          comment: score?.comment || ''
        };
      });
      
      const totalScore = calculateTotalScore();
      
      const payload = {
        employeeId: selectedEmployee.id,
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        templateId: template.id,
        templateName: template.name,
        departmentType: template.departmentType,
        scores: scoresArray,
        totalScore: totalScore,
        evaluatorId: user?.id,
        evaluatorName: user?.name
      };
      
      const response = await fetch(`${API_URL}/api/performance/monthly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        toast.success('评分已保存');
        setSelectedEmployee(null);
        setTemplate(null);
        setScores(new Map());
      } else {
        const error = await response.json();
        toast.error(error.message || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalScore = calculateTotalScore();
  const completionRate = getCompletionRate();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">差异化考核评分</h2>
          <p className="text-gray-500 mt-1">根据员工所在部门类型，使用不同的考核指标进行评分</p>
        </div>
        <DifferentiatedScoringHelp />
      </div>

      {!selectedEmployee ? (
        // 员工选择界面
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              选择评分对象
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索员工姓名或部门..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : filteredEmployees.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEmployees.map(emp => (
                  <div
                    key={emp.id}
                    onClick={() => loadTemplate(emp)}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-sm text-gray-500">
                          {emp.department} - {emp.position}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 mb-2">
                  {searchTerm ? '未找到匹配的员工' : '暂无下属员工'}
                </p>
                <p className="text-sm text-gray-500">
                  {searchTerm ? '试试其他关键词' : '请联系HR确认团队成员配置'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // 评分界面
        <>
          {/* 员工信息和进度 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                    {selectedEmployee.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedEmployee.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-600">{selectedEmployee.department}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">{selectedEmployee.position}</span>
                      {selectedEmployee.department_type && (
                        <>
                          <span className="text-gray-400">•</span>
                          <Badge className={DEPARTMENT_TYPES[selectedEmployee.department_type as keyof typeof DEPARTMENT_TYPES]?.color}>
                            {DEPARTMENT_TYPES[selectedEmployee.department_type as keyof typeof DEPARTMENT_TYPES]?.icon}{' '}
                            {DEPARTMENT_TYPES[selectedEmployee.department_type as keyof typeof DEPARTMENT_TYPES]?.label}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">
                    {totalScore.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">加权总分</div>
                  <div className="mt-2">
                    <div className="text-sm text-gray-500">
                      完成度: {completionRate}%
                    </div>
                    <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {template && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-900">
                    <strong>使用模板:</strong> {template.name}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    共 {template.metrics.length} 个考核指标
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 评分表单 */}
          {template && (
            <Card>
              <CardHeader>
                <CardTitle>考核指标评分</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {template.metrics.map((metric, index) => {
                    const currentScore = scores.get(metric.id);
                    
                    return (
                      <div key={metric.id} className="border-b pb-6 last:border-b-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-medium">
                                {index + 1}. {metric.metricName}
                              </span>
                              <Badge variant="outline">{metric.weight}%</Badge>
                              <Badge variant={metric.evaluationType === 'quantitative' ? 'default' : 'secondary'}>
                                {metric.evaluationType === 'quantitative' ? '量化' : '定性'}
                              </Badge>
                            </div>
                            {metric.description && (
                              <p className="text-sm text-gray-500 mt-1">{metric.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {LEVEL_SCORES.map(level => (
                            <button
                              key={level.level}
                              onClick={() => handleScoreChange(metric.id, level.level, level.score)}
                              className={`p-3 border-2 rounded-lg transition-all ${
                                currentScore?.level === level.level
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-center">
                                <div className={`font-bold ${level.color}`}>{level.level}</div>
                                <div className="text-xs text-gray-600 mt-1">{level.score}</div>
                              </div>
                            </button>
                          ))}
                        </div>

                        <div>
                          <Label className="text-xs">评价说明（可选）</Label>
                          <Input
                            placeholder="请输入具体评价..."
                            value={currentScore?.comment || ''}
                            onChange={(e) => handleCommentChange(metric.id, e.target.value)}
                            className="mt-1"
                          />
                        </div>

                        {currentScore && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-gray-600">
                              得分: {metric.weight}% × {currentScore.score} = {(metric.weight * currentScore.score / 100).toFixed(2)} 分
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedEmployee(null);
                setTemplate(null);
                setScores(new Map());
              }}
            >
              返回
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setScores(new Map())}
                disabled={scores.size === 0}
              >
                清空评分
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || scores.size === 0}
                className={completionRate === 100 ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {saving ? '保存中...' : completionRate === 100 ? '✓ 保存评分' : '保存评分'}
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
