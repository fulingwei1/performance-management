import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, CheckCircle, AlertCircle, Clock, FileText, Send, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { monthlyAssessmentApi, assessmentTemplateApi, employeeApi } from '@/services/api';

const LEVEL_SCORES = [
  { level: 'L5', score: 1.5, label: '卓越 (1.5)', color: 'text-green-600' },
  { level: 'L4', score: 1.2, label: '优秀 (1.2)', color: 'text-blue-600' },
  { level: 'L3', score: 1.0, label: '良好 (1.0)', color: 'text-gray-600' },
  { level: 'L2', score: 0.8, label: '待改进 (0.8)', color: 'text-orange-600' },
  { level: 'L1', score: 0.5, label: '不合格 (0.5)', color: 'text-red-600' }
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: '已自评', color: 'bg-blue-100 text-blue-700' },
  scored: { label: '已评分', color: 'bg-green-100 text-green-700' },
  completed: { label: '已完成', color: 'bg-purple-100 text-purple-700' },
};

interface Assessment {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  selfSummary?: string;
  nextMonthPlan?: string;
  managerComment?: string;
  nextMonthWorkArrangement?: string;
  totalScore: number;
  status: string;
  scores?: Array<{ metricName: string; metricCode: string; weight: number; level: string; score: number }>;
  templateName?: string;
  createdAt?: string;
}

interface Employee {
  id: string;
  name: string;
  department: string;
  managerId?: string;
}

interface Metric {
  id: string;
  metricName: string;
  metricCode: string;
  weight: number;
  category: string;
  description?: string;
}

interface Template {
  id: string;
  name: string;
  departmentType: string;
  metrics: Metric[];
}

interface ScoreEntry {
  metricCode: string;
  level: string;
  score: number;
  comment?: string;
}

export function UnifiedAssessment() {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'employee';
  const isManager = ['manager', 'hr', 'admin', 'gm'].includes(user?.role || '');

  // Self-assessment state
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [myAssessment, setMyAssessment] = useState<Assessment | null>(null);
  const [selfSummary, setSelfSummary] = useState('');
  const [nextMonthPlan, setNextMonthPlan] = useState('');
  const [selfSubmitting, setSelfSubmitting] = useState(false);

  // Manager scoring state
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Assessment | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [scores, setScores] = useState<Map<string, ScoreEntry>>(new Map());
  const [managerComment, setManagerComment] = useState('');
  const [nextMonthWorkArrangement, setNextMonthWorkArrangement] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load my assessment (employee)
  useEffect(() => {
    if (isEmployee && user) {
      loadMyAssessment();
    }
  }, [currentMonth, isEmployee, user]);

  // Load team assessments (manager)
  useEffect(() => {
    if (isManager) {
      loadMonthlyList();
    }
  }, [currentMonth, isManager]);

  const loadMyAssessment = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await monthlyAssessmentApi.getByMonth(user.userId, currentMonth);
      if (res.success && res.data) {
        setMyAssessment(res.data);
        setSelfSummary(res.data.selfSummary || '');
        setNextMonthPlan(res.data.nextMonthPlan || '');
      } else {
        setMyAssessment(null);
        setSelfSummary('');
        setNextMonthPlan('');
      }
    } catch (error: any) {
      toast.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyList = async () => {
    try {
      setLoading(true);
      const res = await monthlyAssessmentApi.getMonthlyList(currentMonth);
      if (res.success && res.data) {
        setAssessments(res.data);
      }
    } catch (error: any) {
      toast.error(error.message || '加载列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelfSubmit = async () => {
    if (!user) return;
    if (!selfSummary.trim()) {
      toast.error('请填写工作总结');
      return;
    }
    try {
      setSelfSubmitting(true);
      const res = await monthlyAssessmentApi.submitSelfAssessment({
        employeeId: user.userId,
        month: currentMonth,
        selfSummary: selfSummary.trim(),
        nextMonthPlan: nextMonthPlan.trim() || '暂无',
      });
      if (res.success) {
        toast.success('自评提交成功');
        loadMyAssessment();
      } else {
        toast.error(res.message || '提交失败');
      }
    } catch (error: any) {
      toast.error(error.message || '提交失败');
    } finally {
      setSelfSubmitting(false);
    }
  };

  const handleSelectEmployee = async (assessment: Assessment) => {
    setSelectedEmployee(assessment);
    setManagerComment(assessment.managerComment || '');
    setNextMonthWorkArrangement(assessment.nextMonthWorkArrangement || '');
    setScores(new Map());

    // Load template for this assessment
    if (assessment.scores) {
      const newScores = new Map<string, ScoreEntry>();
      for (const s of assessment.scores) {
        newScores.set(s.metricCode, { metricCode: s.metricCode, level: s.level, score: s.score });
      }
      setScores(newScores);
    }
  };

  const handleScoreChange = (metricCode: string, level: string, score: number) => {
    setScores(prev => {
      const next = new Map(prev);
      const existing = next.get(metricCode);
      next.set(metricCode, {
        metricCode,
        level,
        score,
        comment: existing?.comment
      });
      return next;
    });
  };

  const calculateTotalScore = () => {
    if (!template || template.metrics.length === 0) return 0;
    let total = 0;
    for (const metric of template.metrics) {
      const entry = scores.get(metric.metricCode);
      if (entry) {
        total += entry.score * (metric.weight / 100);
      }
    }
    return parseFloat(total.toFixed(2));
  };

  const handleSaveScore = async () => {
    if (!selectedEmployee || !template) return;
    if (!managerComment.trim()) {
      toast.error('请填写评语');
      return;
    }
    if (!nextMonthWorkArrangement.trim()) {
      toast.error('请填写下月工作安排');
      return;
    }

    const finalScores = template.metrics.map(m => {
      const entry = scores.get(m.metricCode);
      return {
        metricName: m.metricName,
        metricCode: m.metricCode,
        weight: m.weight,
        level: entry?.level || 'L3',
        score: entry?.score || 1.0,
        comment: entry?.comment
      };
    });

    const totalScore = calculateTotalScore();

    try {
      setSaving(true);
      const res = await monthlyAssessmentApi.submitScore({
        id: selectedEmployee.id,
        scores: finalScores,
        totalScore,
        managerComment: managerComment.trim(),
        nextMonthWorkArrangement: nextMonthWorkArrangement.trim(),
        status: 'completed',
      });
      if (res.success) {
        toast.success('评分已保存');
        setSelectedEmployee(null);
        loadMonthlyList();
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const filteredAssessments = assessments.filter(a =>
    a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">月度考核</h1>
          <p className="text-gray-500 mt-1">{currentMonth} 考核周期</p>
        </motion.div>

        <div className="flex items-center gap-3 mb-6">
          <Input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="max-w-[200px]"
          />
          {isEmployee && myAssessment && (
            <Badge className={STATUS_MAP[myAssessment.status]?.color || 'bg-gray-100'}>
              {STATUS_MAP[myAssessment.status]?.label || myAssessment.status}
            </Badge>
          )}
        </div>

        <Tabs defaultValue={isManager ? 'list' : 'self'} className="space-y-4">
          <TabsList>
            {isEmployee && <TabsTrigger value="self">我的自评</TabsTrigger>}
            {isManager && <TabsTrigger value="list">考核列表</TabsTrigger>}
            {isManager && <TabsTrigger value="score">评分</TabsTrigger>}
          </TabsList>

          {/* Employee Self-Assessment */}
          {isEmployee && (
            <TabsContent value="self">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      月度工作总结
                    </CardTitle>
                    <CardDescription>请认真填写本月工作总结及下月计划</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="selfSummary">本月工作总结 *</Label>
                      <Textarea
                        id="selfSummary"
                        value={selfSummary}
                        onChange={(e) => setSelfSummary(e.target.value)}
                        placeholder="请总结本月完成的工作、取得的成果、遇到的问题..."
                        className="min-h-[200px] mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nextMonthPlan">下月工作计划</Label>
                      <Textarea
                        id="nextMonthPlan"
                        value={nextMonthPlan}
                        onChange={(e) => setNextMonthPlan(e.target.value)}
                        placeholder="下月的工作目标和计划..."
                        className="min-h-[100px] mt-1"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={handleSelfSubmit} disabled={selfSubmitting}>
                        {selfSubmitting ? '提交中...' : <><Send className="w-4 h-4 mr-2" />提交自评</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {myAssessment && (myAssessment.totalScore > 0 || myAssessment.managerComment) && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        主管评价
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {myAssessment.totalScore > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">总分：</span>
                          <span className="text-2xl font-bold text-blue-600">{myAssessment.totalScore}</span>
                        </div>
                      )}
                      {myAssessment.scores && myAssessment.scores.length > 0 && (
                        <div>
                          <Label>各项得分</Label>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {myAssessment.scores.map((s, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-gray-600">{s.metricName}</span>
                                <span className="font-medium">{s.level} ({s.score})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {myAssessment.managerComment && (
                        <div>
                          <Label>评语</Label>
                          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{myAssessment.managerComment}</p>
                        </div>
                      )}
                      {myAssessment.nextMonthWorkArrangement && (
                        <div>
                          <Label>下月工作安排</Label>
                          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{myAssessment.nextMonthWorkArrangement}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </TabsContent>
          )}

          {/* Manager: Assessment List */}
          {isManager && (
            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      考核列表
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="搜索员工..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-[200px]"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">加载中...</div>
                  ) : filteredAssessments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无考核记录</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>员工</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>总分</TableHead>
                          <TableHead>自评摘要</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssessments.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.employeeName}</TableCell>
                            <TableCell>
                              <Badge className={STATUS_MAP[a.status]?.color || 'bg-gray-100'}>
                                {STATUS_MAP[a.status]?.label || a.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {a.totalScore > 0 ? (
                                <span className="font-bold text-blue-600">{a.totalScore}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {a.selfSummary ? a.selfSummary.slice(0, 30) + '...' : <span className="text-gray-400">未自评</span>}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={selectedEmployee?.id === a.id ? 'default' : 'outline'}
                                onClick={() => handleSelectEmployee(a)}
                              >
                                {selectedEmployee?.id === a.id ? '评分中' : '评分'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Manager: Scoring */}
          {isManager && (
            <TabsContent value="score">
              {!selectedEmployee ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">请从考核列表中选择一个员工进行评分</p>
                  </CardContent>
                </Card>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="mb-4">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{selectedEmployee.employeeName} - {selectedEmployee.month} 考核评分</CardTitle>
                          <CardDescription>
                            {selectedEmployee.templateName || '月度考核'} | 状态: {STATUS_MAP[selectedEmployee.status]?.label || selectedEmployee.status}
                          </CardDescription>
                        </div>
                        <Badge className={STATUS_MAP[selectedEmployee.status]?.color || 'bg-gray-100'}>
                          {STATUS_MAP[selectedEmployee.status]?.label || selectedEmployee.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedEmployee.selfSummary && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <Label className="text-blue-700">员工自评</Label>
                          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{selectedEmployee.selfSummary}</p>
                          {selectedEmployee.nextMonthPlan && (
                            <div className="mt-2">
                              <Label className="text-blue-700">下月计划</Label>
                              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{selectedEmployee.nextMonthPlan}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedEmployee.scores && selectedEmployee.scores.length > 0 && (
                        <div>
                          <Label>评分指标</Label>
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>指标</TableHead>
                                <TableHead>权重</TableHead>
                                <TableHead>得分</TableHead>
                                <TableHead>当前</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedEmployee.scores.map((s, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{s.metricName}</TableCell>
                                  <TableCell>{s.weight}%</TableCell>
                                  <TableCell>
                                    <Select
                                      value={scores.get(s.metricCode)?.level || s.level}
                                      onValueChange={(val) => {
                                        const lv = LEVEL_SCORES.find(l => l.level === val);
                                        if (lv) handleScoreChange(s.metricCode, lv.level, lv.score);
                                      }}
                                    >
                                      <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {LEVEL_SCORES.map(lv => (
                                          <SelectItem key={lv.level} value={lv.level}>{lv.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>{s.score} ({s.level})</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          <div className="mt-4 flex items-center gap-4">
                            <span className="text-gray-600">总分：</span>
                            <span className="text-2xl font-bold text-blue-600">{calculateTotalScore()}</span>
                          </div>
                        </div>
                      )}

                      <div className="mt-6 space-y-4">
                        <div>
                          <Label htmlFor="managerComment">评语 *</Label>
                          <Textarea
                            id="managerComment"
                            value={managerComment}
                            onChange={(e) => setManagerComment(e.target.value)}
                            placeholder="请对该员工本月表现进行评价..."
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="nextMonthWork">下月工作安排 *</Label>
                          <Textarea
                            id="nextMonthWork"
                            value={nextMonthWorkArrangement}
                            onChange={(e) => setNextMonthWorkArrangement(e.target.value)}
                            placeholder="请安排该员工下月的工作..."
                            className="mt-1"
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setSelectedEmployee(null)}>取消</Button>
                          <Button onClick={handleSaveScore} disabled={saving}>
                            {saving ? <><Save className="w-4 h-4 mr-2 animate-spin" />保存中...</> : <><CheckCircle className="w-4 h-4 mr-2" />保存评分</>}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
