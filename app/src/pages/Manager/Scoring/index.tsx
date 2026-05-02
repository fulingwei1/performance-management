import { useState, useEffect, useCallback } from 'react';
import { performanceApi } from '@/services/api';
import { usePerformanceStore } from '@/stores/performanceStore';
import { ScoreSelectorWithCriteria } from '@/components/score/ScoreSelectorWithCriteria';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  CheckCircle2,
  Clock,
  Send,
  ChevronRight,
  FileText,
  Star,
  AlertCircle,
} from 'lucide-react';

// 模板指标类型
interface TemplateMetric {
  metricId: string;
  metricCode: string;
  metricName: string;
  weight: number;
  required: boolean;
  description?: string;
  scoringCriteria?: Record<string, string>;
}

interface AssessmentTemplate {
  id: string;
  name: string;
  description?: string;
  departmentType: string;
  applicablePositions: string[];
  metrics: TemplateMetric[];
  status: 'active' | 'inactive';
}

interface ScoreRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  subDepartment?: string;
  month: string;
  status: string;
  totalScore?: number;
  level?: string;
  templateId?: string;
  templateName?: string;
  departmentType?: string;
  metricScores?: Array<{
    metricId: string;
    metricName: string;
    metricCode: string;
    weight: number;
    score: number;
    level: string;
    comment?: string;
  }>;
  selfSummary?: string;
  achievements?: string;
  issues?: string;
}

interface ScoringState {
  [metricId: string]: {
    score: number;
    level: string;
    comment: string;
  };
}

export function ScoringManagement({ embedded = false }: { embedded?: boolean }) {
  const { records, fetchTeamRecords } = usePerformanceStore();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ScoreRecord | null>(null);
  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [scoring, setScoring] = useState<ScoringState>({});
  const [managerComment, setManagerComment] = useState('');
  const [nextMonthWorkArrangement, setNextMonthWorkArrangement] = useState('');
  const [scoreEvidence, setScoreEvidence] = useState('');
  const [monthlyStarRecommended, setMonthlyStarRecommended] = useState(false);
  const [monthlyStarCategory, setMonthlyStarCategory] = useState('');
  const [monthlyStarReason, setMonthlyStarReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 获取当前月份的记录
  const currentMonthRecords = (records as unknown as ScoreRecord[]).filter(
    (r) => r.month === currentMonth
  );

  const pendingRecords = currentMonthRecords.filter(
    (r) => r.status === 'submitted' || r.status === 'draft'
  );
  const completedRecords = currentMonthRecords.filter((r) => r.status === 'completed');

  useEffect(() => {
    fetchTeamRecords(undefined, currentMonth);
  }, [currentMonth, fetchTeamRecords]);

  // 打开评分抽屉
  const handleOpenScoring = useCallback(async (record: ScoreRecord) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
    setManagerComment('');
    setNextMonthWorkArrangement('');
    setScoreEvidence('');
    setMonthlyStarRecommended(false);
    setMonthlyStarCategory('');
    setMonthlyStarReason('');

    // 获取模板
    setLoadingTemplate(true);
    try {
      const res = await performanceApi.getRecordTemplate(record.id);
      if (res.success && res.data) {
        setTemplate(res.data);
        // 初始化评分状态
        const initialScoring: ScoringState = {};
        for (const metric of res.data.metrics || []) {
          initialScoring[metric.metricId] = {
            score: 1.0,
            level: 'L3',
            comment: '',
          };
        }
        setScoring(initialScoring);
      } else {
        setTemplate(null);
        // 没有模板时使用默认4项
        setScoring({
          taskCompletion: { score: 1.0, level: 'L3', comment: '' },
          initiative: { score: 1.0, level: 'L3', comment: '' },
          projectFeedback: { score: 1.0, level: 'L3', comment: '' },
          qualityImprovement: { score: 1.0, level: 'L3', comment: '' },
        });
      }
    } catch (e) {
      setTemplate(null);
      setScoring({
        taskCompletion: { score: 1.0, level: 'L3', comment: '' },
        initiative: { score: 1.0, level: 'L3', comment: '' },
        projectFeedback: { score: 1.0, level: 'L3', comment: '' },
        qualityImprovement: { score: 1.0, level: 'L3', comment: '' },
      });
    } finally {
      setLoadingTemplate(false);
    }
  }, []);

  // 更新单个指标评分
  const updateMetricScore = (metricId: string, score: number) => {
    const levelMap: Record<number, string> = {
      0.5: 'L1',
      0.7: 'L2',
      1.0: 'L3',
      1.2: 'L4',
      1.5: 'L5',
    };
    setScoring((prev) => ({
      ...prev,
      [metricId]: {
        ...prev[metricId],
        score,
        level: levelMap[score] || 'L3',
      },
    }));
  };

  // 计算加权总分
  const calculateWeightedScore = (): number => {
    if (template && template.metrics.length > 0) {
      let weightedSum = 0;
      let totalWeight = 0;
      for (const metric of template.metrics) {
        const s = scoring[metric.metricId];
        if (s) {
          weightedSum += s.score * metric.weight;
          totalWeight += metric.weight;
        }
      }
      return totalWeight > 0 ? parseFloat((weightedSum / totalWeight).toFixed(2)) : 1.0;
    }
    // 默认4项
    return (
      (scoring['taskCompletion']?.score || 1.0) * 0.4 +
      (scoring['initiative']?.score || 1.0) * 0.3 +
      (scoring['projectFeedback']?.score || 1.0) * 0.2 +
      (scoring['qualityImprovement']?.score || 1.0) * 0.1
    );
  };

  // 提交评分
  const handleSubmitScore = async () => {
    if (!selectedRecord) return;

    if (!managerComment.trim()) {
      toast.error('请填写评语');
      return;
    }
    if (!nextMonthWorkArrangement.trim()) {
      toast.error('请填写下月工作安排');
      return;
    }

    const totalScore = calculateWeightedScore();
    if ((totalScore >= 1.4 || totalScore < 0.9) && scoreEvidence.trim().length < 10) {
      toast.error('评分特别优秀或明显偏低时，必须填写不少于10个字的具体事例说明');
      return;
    }

    if (monthlyStarRecommended && (!monthlyStarCategory || monthlyStarReason.trim().length < 10)) {
      toast.error('推荐每月之星时，必须选择推荐类型并填写不少于10个字的推荐理由');
      return;
    }

    setSubmitting(true);
    try {
      let metricScores: any[] | undefined;
      let taskCompletion: number | undefined;
      let initiative: number | undefined;
      let projectFeedback: number | undefined;
      let qualityImprovement: number | undefined;

      if (template && template.metrics.length > 0) {
        // 动态模板评分
        metricScores = template.metrics.map((m) => {
          const s = scoring[m.metricId] || { score: 1.0, level: 'L3', comment: '' };
          return {
            metricId: m.metricId,
            metricName: m.metricName,
            metricCode: m.metricCode,
            weight: m.weight,
            score: s.score,
            level: s.level,
            comment: s.comment,
          };
        });
      } else {
        // 旧版固定4项
        taskCompletion = scoring['taskCompletion']?.score || 1.0;
        initiative = scoring['initiative']?.score || 1.0;
        projectFeedback = scoring['projectFeedback']?.score || 1.0;
        qualityImprovement = scoring['qualityImprovement']?.score || 1.0;
      }

      const success = await usePerformanceStore.getState().submitScore({
        id: selectedRecord.id,
        taskCompletion,
        initiative,
        projectFeedback,
        qualityImprovement,
        managerComment,
        nextMonthWorkArrangement,
        scoreEvidence,
        monthlyStarRecommended,
        monthlyStarCategory,
        monthlyStarReason,
        monthlyStarPublic: true,
        // 动态模板
        templateId: template?.id,
        templateName: template?.name,
        departmentType: template?.departmentType || selectedRecord.departmentType,
        metricScores,
      } as any);

      if (success) {
        toast.success('评分提交成功');
        setIsDrawerOpen(false);
        setSelectedRecord(null);
        setTemplate(null);
        fetchTeamRecords(undefined, currentMonth);
      } else {
        toast.error('评分提交失败');
      }
    } catch (e: any) {
      toast.error(e.message || '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const totalScore = calculateWeightedScore();

  const content = (
    <div className="space-y-6">
      {/* 月份选择 + 统计 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label>选择月份</Label>
              <Input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">待评分</p>
                <p className="text-2xl font-bold text-yellow-700">{pendingRecords.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">已评分</p>
                <p className="text-2xl font-bold text-green-700">{completedRecords.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 评分维度说明（有模板时显示） */}
      {template && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {template.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {template.metrics.map((m) => (
                <div key={m.metricId} className="bg-white rounded-lg p-3 border">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{m.metricName}</p>
                    <Badge className="bg-blue-100 text-blue-700">权重 {m.weight}%</Badge>
                  </div>
                  {m.description && (
                    <p className="text-xs text-gray-500 mt-1">{m.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 待评分列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            待评分员工 ({pendingRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer"
                onClick={() => handleOpenScoring(record)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-semibold">
                    {record.employeeName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{record.employeeName}</p>
                    <p className="text-sm text-gray-500">
                      {record.department} {record.subDepartment} · {record.status === 'draft' ? '未提交' : '已提交'}
                    </p>
                  </div>
                </div>
                <Button size="sm">
                  去评分
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
            {pendingRecords.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p>本月所有员工已评分完毕</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 已评分列表 */}
      {completedRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              已评分员工 ({completedRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedRecords
                .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
                .map((record, index) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow bg-gray-50"
                    onClick={() => handleOpenScoring(record)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-blue-100 text-blue-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{record.employeeName}</p>
                        <p className="text-sm text-gray-500">
                          {record.department} {record.subDepartment}
                        </p>
                      </div>
                    </div>
                    <ScoreDisplay score={record.totalScore || 1.0} showLabel size="sm" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // 评分抽屉
  const scoringDrawer = (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <DrawerContent className="max-w-3xl mx-auto max-h-[90vh] flex flex-col">
        <DrawerHeader className="border-b flex-shrink-0">
          <DrawerTitle>
            {selectedRecord?.employeeName} - {selectedRecord?.month} 绩效评分
          </DrawerTitle>
          {template && (
            <p className="text-sm text-gray-500 mt-1">模板：{template.name}</p>
          )}
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 总分预览 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">综合得分</p>
                <ScoreDisplay score={totalScore} showProgress size="lg" />
              </div>
              {template && template.metrics.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">计算公式</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {template.metrics
                      .map((m) => {
                        const s = scoring[m.metricId]?.score || 1.0;
                        return `${s.toFixed(1)}×${m.weight}%`;
                      })
                      .join(' + ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 动态指标评分 */}
          {loadingTemplate ? (
            <div className="text-center py-8 text-gray-400">加载评分模板中...</div>
          ) : template && template.metrics.length > 0 ? (
            <div className="space-y-6">
              {template.metrics.map((metric) => (
                <div key={metric.metricId}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="font-medium text-gray-900">{metric.metricName}</label>
                      {metric.description && (
                        <p className="text-sm text-gray-500">{metric.description}</p>
                      )}
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">权重 {metric.weight}%</Badge>
                  </div>
                  <ScoreSelectorWithCriteria
                    value={scoring[metric.metricId]?.score || 1.0}
                    onChange={(v) => updateMetricScore(metric.metricId, v)}
                    dimensionKey={metric.metricCode}
                  />
                  <Textarea
                    placeholder="评分备注（可选）"
                    value={scoring[metric.metricId]?.comment || ''}
                    onChange={(e) =>
                      setScoring((prev) => ({
                        ...prev,
                        [metric.metricId]: { ...prev[metric.metricId], comment: e.target.value },
                      }))
                    }
                    className="mt-2 min-h-[60px]"
                  />
                </div>
              ))}
            </div>
          ) : (
            // 旧版固定4项
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="font-medium text-gray-900">承担任务量及任务完成情况</label>
                    <p className="text-sm text-gray-500">
                      评估员工承担任务的数量、难度及完成情况
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">权重 40%</Badge>
                </div>
                <ScoreSelectorWithCriteria
                  value={scoring['taskCompletion']?.score || 1.0}
                  onChange={(v) =>
                    setScoring((prev) => ({
                      ...prev,
                      taskCompletion: { ...prev['taskCompletion'], score: v },
                    }))
                  }
                  dimensionKey="taskCompletion"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="font-medium text-gray-900">主动性态度与遵守纪律</label>
                    <p className="text-sm text-gray-500">
                      评估员工工作主动性、责任心及纪律遵守情况
                    </p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">权重 30%</Badge>
                </div>
                <ScoreSelectorWithCriteria
                  value={scoring['initiative']?.score || 1.0}
                  onChange={(v) =>
                    setScoring((prev) => ({
                      ...prev,
                      initiative: { ...prev['initiative'], score: v },
                    }))
                  }
                  dimensionKey="initiative"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="font-medium text-gray-900">参与项目经理的反馈情况</label>
                    <p className="text-sm text-gray-500">
                      评估员工在项目中的配合度及反馈质量
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">权重 20%</Badge>
                </div>
                <ScoreSelectorWithCriteria
                  value={scoring['projectFeedback']?.score || 1.0}
                  onChange={(v) =>
                    setScoring((prev) => ({
                      ...prev,
                      projectFeedback: { ...prev['projectFeedback'], score: v },
                    }))
                  }
                  dimensionKey="projectFeedback"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="font-medium text-gray-900">工作质量意识与工作改进</label>
                    <p className="text-sm text-gray-500">
                      评估员工工作质量及持续改进意识
                    </p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700">权重 10%</Badge>
                </div>
                <ScoreSelectorWithCriteria
                  value={scoring['qualityImprovement']?.score || 1.0}
                  onChange={(v) =>
                    setScoring((prev) => ({
                      ...prev,
                      qualityImprovement: { ...prev['qualityImprovement'], score: v },
                    }))
                  }
                  dimensionKey="qualityImprovement"
                />
              </div>
            </div>
          )}

          {/* 评语 */}
          <div>
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              综合评价 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="请输入对该员工的综合评价..."
              value={managerComment}
              onChange={(e) => setManagerComment(e.target.value)}
              className="min-h-[100px] mt-2"
            />
          </div>

          {/* 下月工作安排 */}
          <div>
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              下月工作安排 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="请输入下月工作安排..."
              value={nextMonthWorkArrangement}
              onChange={(e) => setNextMonthWorkArrangement(e.target.value)}
              className="min-h-[100px] mt-2"
            />
          </div>

          {/* 具体事例说明（极端评分时） */}
          {(totalScore >= 1.4 || totalScore < 0.9) && (
            <div>
              <Label className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                具体事例说明（评分≥1.4或<0.9时必填，≥10字）
              </Label>
              <Textarea
                placeholder="请说明具体事例..."
                value={scoreEvidence}
                onChange={(e) => setScoreEvidence(e.target.value)}
                className="min-h-[80px] mt-2"
              />
            </div>
          )}

          {/* 每月之星推荐 */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <Label className="text-base">推荐每月之星</Label>
                </div>
                <Switch
                  checked={monthlyStarRecommended}
                  onCheckedChange={setMonthlyStarRecommended}
                />
              </div>
              {monthlyStarRecommended && (
                <div className="space-y-4">
                  <div>
                    <Label>推荐类型</Label>
                    <Select value={monthlyStarCategory} onValueChange={setMonthlyStarCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efficiency">效率之星</SelectItem>
                        <SelectItem value="quality">质量之星</SelectItem>
                        <SelectItem value="innovation">创新之星</SelectItem>
                        <SelectItem value="service">服务之星</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>推荐理由（≥10字）</Label>
                    <Textarea
                      placeholder="请说明推荐理由..."
                      value={monthlyStarReason}
                      onChange={(e) => setMonthlyStarReason(e.target.value)}
                      className="mt-1 min-h-[80px]"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 底部操作栏 */}
        <div className="flex-shrink-0 border-t bg-white p-6">
          <div className="flex justify-end gap-3 max-w-3xl mx-auto">
            <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitScore} disabled={submitting}>
              <Send className="w-4 h-4 mr-2" />
              {submitting ? '提交中...' : '提交评分'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );

  if (embedded) {
    return (
      <>
        {content}
        {scoringDrawer}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">评分管理</h1>
        <p className="text-sm text-gray-500 mt-1">对团队成员进行月度绩效评分</p>
      </div>
      {content}
      {scoringDrawer}
    </div>
  );
}
