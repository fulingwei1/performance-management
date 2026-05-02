import { useState, useEffect } from 'react';
import { FileText, Send, X, AlertCircle, TrendingUp, Clock, WalletCards } from 'lucide-react';
import { ScoreSelectorWithCriteria } from '@/components/score/ScoreSelectorWithCriteria';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { scoreDimensions, scoreLevels, getLevelLabel, getLevelColor, resolveGroupType } from '@/lib/config';
import { levelToScore, scoreToLevel } from '@/lib/calculateScore';
import { KeywordSelector } from '@/components/KeywordSelector';
import { StructuredTagSelector } from '@/components/StructuredTagSelector';
import { salaryIntegrationApi } from '@/services/api';
import keywordsData from '@/data/evaluation-keywords.json';
import analysisTagsData from '@/data/performance-analysis-tags.json';

const monthlyStarCategories = [
  '核心技术骨干',
  '潜力人才之星',
  '突出贡献之星',
  '敬业付出之星',
  '进步神速之星',
  '技术创新之星',
  '团队活跃之星'
];

interface SalaryForecastRow {
  employeeExternalId: string;
  employeeName: string;
  periodLabel: string;
  basePerformanceSalary: number;
  currentPerformanceSalary: number;
  currentCoefficient: number;
  draftScore: number;
  draftCoefficient: number;
  adjustmentAmount: number;
  forecastPerformanceSalary: number;
  changeAmount: number;
  dataStatus: 'ready' | 'missing_payroll' | string;
  message?: string;
}

const parseAssessmentMonth = (month?: string): { year: number; month: number } | null => {
  const text = String(month || '').trim();
  const match = text.match(/(\d{4})[-年/](\d{1,2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const parsedMonth = Number(match[2]);
  if (!year || parsedMonth < 1 || parsedMonth > 12) return null;
  return { year, month: parsedMonth };
};

const formatCurrency = (value?: number) => (
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
);

interface ScoringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRecord: any;
  isNoSummary: boolean;
  scores: { taskCompletion: number; initiative: number; projectFeedback: number; qualityImprovement: number };
  setScores: (fn: (prev: any) => any) => void;
  managerComment: string;
  setManagerComment: (v: string) => void;
  nextMonthWorkArrangement: string;
  setNextMonthWorkArrangement: (v: string) => void;
  evaluationKeywords: string[];
  setEvaluationKeywords: (keywords: string[]) => void;
  issueTypeTags: string[];
  setIssueTypeTags: (tags: string[]) => void;
  highlightTags: string[];
  setHighlightTags: (tags: string[]) => void;
  workTypeTags: string[];
  setWorkTypeTags: (tags: string[]) => void;
  improvementActionTags: string[];
  setImprovementActionTags: (tags: string[]) => void;
  issueAttributionTags: string[];
  setIssueAttributionTags: (tags: string[]) => void;
  workloadTags: string[];
  setWorkloadTags: (tags: string[]) => void;
  managerSuggestionTags: string[];
  setManagerSuggestionTags: (tags: string[]) => void;
  scoreEvidence: string;
  setScoreEvidence: (value: string) => void;
  monthlyStarRecommended: boolean;
  setMonthlyStarRecommended: (value: boolean) => void;
  monthlyStarCategory: string;
  setMonthlyStarCategory: (value: string) => void;
  monthlyStarReason: string;
  setMonthlyStarReason: (value: string) => void;
  monthlyStarPublic: boolean;
  setMonthlyStarPublic: (value: boolean) => void;
  totalScore: number;
  loading: boolean;
  onSubmit: () => void;
}

export function ScoringDialog({
  open, onOpenChange, selectedRecord, isNoSummary,
  scores, setScores, managerComment, setManagerComment,
  nextMonthWorkArrangement, setNextMonthWorkArrangement,
  evaluationKeywords, setEvaluationKeywords,
  issueTypeTags, setIssueTypeTags,
  highlightTags, setHighlightTags,
  workTypeTags, setWorkTypeTags,
  improvementActionTags, setImprovementActionTags,
  issueAttributionTags, setIssueAttributionTags,
  workloadTags, setWorkloadTags,
  managerSuggestionTags, setManagerSuggestionTags,
  scoreEvidence, setScoreEvidence,
  monthlyStarRecommended, setMonthlyStarRecommended,
  monthlyStarCategory, setMonthlyStarCategory,
  monthlyStarReason, setMonthlyStarReason,
  monthlyStarPublic, setMonthlyStarPublic,
  totalScore, loading, onSubmit
}: ScoringDialogProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(evaluationKeywords || []);
  const [salaryForecast, setSalaryForecast] = useState<SalaryForecastRow | null>(null);
  const [salaryForecastLoading, setSalaryForecastLoading] = useState(false);
  const [salaryForecastError, setSalaryForecastError] = useState('');
  
  const requiresScoreEvidence = totalScore >= 1.4 || totalScore < 0.9;
  const scoreEvidenceLabel = totalScore >= 1.4 ? '优秀/特别突出事例' : totalScore < 0.9 ? '低分/明显不足事例' : '评分事例说明';
  const draftCoefficient = levelToScore(scoreToLevel(Number(totalScore || 0)));
  
  // 获取员工级别映射
  const getEmployeeLevel = (level?: string): 'basic' | 'senior' | 'manager' | 'executive' => {
    if (!level) return 'basic';
    if (level === 'senior' || level === 'intermediate') return 'senior';
    if (level === 'manager') return 'manager';
    if (level === 'executive' || level === 'gm') return 'executive';
    return 'basic';
  };

  // 将选中的关键词转换为文本
  const getKeywordText = (keywordIds: string[]) => {
    const allKeywords = [...keywordsData.positive, ...keywordsData.negative];
    const selected = allKeywords.filter((kw: any) => keywordIds.includes(kw.id));
    const positive = selected.filter((kw: any) => kw.id.startsWith('p')).map((kw: any) => kw.text);
    const negative = selected.filter((kw: any) => kw.id.startsWith('n')).map((kw: any) => kw.text);
    
    let text = '';
    if (positive.length > 0) {
      text += `优点：${positive.join('、')}`;
    }
    if (negative.length > 0) {
      if (text) text += '；';
      text += `待改进：${negative.join('、')}`;
    }
    return text;
  };

  // 当关键词变化时，自动更新评语
  useEffect(() => {
    setSelectedKeywords(evaluationKeywords || []);
  }, [evaluationKeywords, selectedRecord?.id, open]);

  useEffect(() => {
    setEvaluationKeywords(selectedKeywords);
  }, [selectedKeywords, setEvaluationKeywords]);

  useEffect(() => {
    setSalaryForecast(null);
    setSalaryForecastError('');

    if (!open) return;
    const parsedMonth = parseAssessmentMonth(selectedRecord?.month);
    if (!selectedRecord?.employeeId || !selectedRecord?.employeeName || !parsedMonth) {
      setSalaryForecastLoading(false);
      return;
    }

    let cancelled = false;
    setSalaryForecastLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await salaryIntegrationApi.getSalaryForecast({
          periodType: 'monthly',
          year: parsedMonth.year,
          month: parsedMonth.month,
          employees: [
            {
              employeeExternalId: selectedRecord.employeeId,
              employeeName: selectedRecord.employeeName,
              department: selectedRecord.department,
              subDepartment: selectedRecord.subDepartment,
              draftScore: Number(totalScore || 0),
              draftCoefficient,
            },
          ],
        });

        if (cancelled) return;
        if (!response?.success) {
          setSalaryForecastError(response?.message || '薪资预测读取失败');
          return;
        }

        setSalaryForecast(response?.data?.rows?.[0] || null);
      } catch (error: any) {
        if (!cancelled) {
          setSalaryForecastError(error?.message || '薪资预测读取失败');
        }
      } finally {
        if (!cancelled) {
          setSalaryForecastLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    open,
    selectedRecord?.employeeId,
    selectedRecord?.employeeName,
    selectedRecord?.department,
    selectedRecord?.subDepartment,
    selectedRecord?.month,
    totalScore,
    draftCoefficient,
  ]);

  useEffect(() => {
    if (selectedKeywords.length > 0) {
      const keywordText = getKeywordText(selectedKeywords);
      if (keywordText) {
        // 如果评语为空，直接设置
        if (!managerComment.trim()) {
          setManagerComment(keywordText + '。\n\n');
        } else {
          // 如果评语不为空，检查是否已包含关键词标记
          const hasKeywordMarker = managerComment.includes('优点：') || managerComment.includes('待改进：');
          if (!hasKeywordMarker) {
            // 在开头插入关键词
            setManagerComment(keywordText + '。\n\n' + managerComment);
          }
        }
      }
    } else if (managerComment.includes('优点：') || managerComment.includes('待改进：')) {
      const cleaned = managerComment
        .replace(/^优点：.*?(?:；待改进：.*?)?。\n\n/s, '')
        .replace(/^待改进：.*?。\n\n/s, '')
        .trimStart();
      if (cleaned !== managerComment) {
        setManagerComment(cleaned);
      }
    }
  }, [selectedKeywords]);

  const getGroupBadge = (groupType: 'high' | 'low' | null, level?: any) => {
    const resolved = resolveGroupType(groupType, level);
    if (!resolved) return <Badge variant="outline" className="text-gray-400">未分组</Badge>;
    return resolved === 'high'
      ? <Badge className="bg-purple-100 text-purple-700">高分组</Badge>
      : <Badge className="bg-green-100 text-green-700">低分组</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!fixed !inset-0 !translate-x-0 !translate-y-0 !flex !flex-col !p-0 !gap-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none !border-0 !shadow-none overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="border-b px-6 py-4 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-xl font-semibold text-white shadow-lg">
                {selectedRecord?.employeeName?.charAt(0)}
              </div>
              <div>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  {selectedRecord?.employeeName}
                  {(selectedRecord?.groupType || selectedRecord?.employeeLevel) &&
                    getGroupBadge(selectedRecord.groupType, selectedRecord.employeeLevel)}
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor: `${getLevelColor(selectedRecord?.employeeLevel)}15`, color: getLevelColor(selectedRecord?.employeeLevel) }}>
                    {getLevelLabel(selectedRecord?.employeeLevel)}
                  </span>
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedRecord?.department} · {selectedRecord?.subDepartment} · <span className="font-medium text-blue-600">{selectedRecord?.month}</span> 月度考核
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl px-6 py-3 border border-blue-100">
                <p className="text-xs text-gray-500 mb-1">综合得分</p>
                <ScoreDisplay score={totalScore} showLabel={false} size="lg" />
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => onOpenChange(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Employee info */}
          <div className="w-[480px] border-r bg-gray-50/50 overflow-y-auto">
            <div className="p-6 space-y-5">
              {isNoSummary && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-orange-800 text-sm">员工未提交自我评价总结</p>
                        <p className="text-xs text-orange-700 mt-1">您可以直接进行评分，系统会自动标记为"未提交总结"状态。</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />本月自我评价总结
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRecord?.selfSummary ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedRecord.selfSummary}</p>
                      {(selectedRecord?.employeeIssueTags || []).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500">员工反馈问题标签</p>
                          <div className="flex flex-wrap gap-2">
                            {(selectedRecord.employeeIssueTags || []).map((tag: string) => (
                              <Badge key={tag} className="bg-orange-100 text-orange-700">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400"><Clock className="w-6 h-6 mx-auto mb-2" /><p className="text-sm">员工暂未填写</p></div>
                  )}
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />下月工作计划
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRecord?.nextMonthPlan ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedRecord.nextMonthPlan}</p>
                      {(selectedRecord?.resourceNeedTags || []).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500">员工资源诉求标签</p>
                          <div className="flex flex-wrap gap-2">
                            {(selectedRecord.resourceNeedTags || []).map((tag: string) => (
                              <Badge key={tag} className="bg-blue-100 text-blue-700">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400"><Clock className="w-6 h-6 mx-auto mb-2" /><p className="text-sm">员工暂未填写</p></div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right: Scoring */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <Tabs defaultValue="scoring" className="h-full">
                <TabsList className="w-full mb-6 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger value="scoring" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">维度评分</TabsTrigger>
                  <TabsTrigger value="comment" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">综合评价</TabsTrigger>
                </TabsList>
                <TabsContent value="scoring" className="mt-0 space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl p-5 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">当前得分</p>
                          <p className="text-3xl font-bold text-blue-600">{totalScore.toFixed(2)}</p>
                        </div>
                        <div className="h-12 w-px bg-gray-200"></div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">计算公式</p>
                          <p className="text-sm text-gray-600 font-mono">
                            <span className="text-blue-600">{scores.taskCompletion.toFixed(1)}</span>×40% + 
                            <span className="text-green-600 ml-1">{scores.initiative.toFixed(1)}</span>×30% + 
                            <span className="text-purple-600 ml-1">{scores.projectFeedback.toFixed(1)}</span>×20% + 
                            <span className="text-orange-600 ml-1">{scores.qualityImprovement.toFixed(1)}</span>×10%
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {scoreLevels.slice(0, 3).map((level) => (
                          <div key={level.level} className="text-center px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: `${level.color}15`, color: level.color }}>
                            <div className="font-bold">{level.level}</div>
                            <div>{level.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Card className="shadow-sm border-emerald-100 bg-emerald-50/40">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <WalletCards className="w-4 h-4 text-emerald-600" />
                        绩效工资预测（只读）
                      </CardTitle>
                      <p className="text-xs text-gray-500">
                        从薪资系统读取绩效工资基数，仅预测绩效工资部分，不显示实发工资、税前工资等敏感字段。
                      </p>
                    </CardHeader>
                    <CardContent>
                      {salaryForecastLoading && (
                        <div className="text-sm text-gray-500">正在读取薪资系统预测值...</div>
                      )}
                      {!salaryForecastLoading && salaryForecastError && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{salaryForecastError}</span>
                        </div>
                      )}
                      {!salaryForecastLoading && !salaryForecastError && salaryForecast && (
                        salaryForecast.dataStatus === 'missing_payroll' ? (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{salaryForecast.message || '薪资系统暂无该月份工资基数，暂不能预测。'}</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            <div className="rounded-lg bg-white px-3 py-2 border">
                              <p className="text-xs text-gray-500">绩效工资基数</p>
                              <p className="mt-1 text-base font-semibold text-gray-900">{formatCurrency(salaryForecast.basePerformanceSalary)}</p>
                            </div>
                            <div className="rounded-lg bg-white px-3 py-2 border">
                              <p className="text-xs text-gray-500">本次草稿系数</p>
                              <p className="mt-1 text-base font-semibold text-blue-600">{salaryForecast.draftCoefficient.toFixed(2)}</p>
                            </div>
                            <div className="rounded-lg bg-white px-3 py-2 border">
                              <p className="text-xs text-gray-500">预计绩效工资</p>
                              <p className="mt-1 text-base font-semibold text-emerald-700">{formatCurrency(salaryForecast.forecastPerformanceSalary)}</p>
                            </div>
                            <div className="rounded-lg bg-white px-3 py-2 border">
                              <p className="text-xs text-gray-500">较当前变化</p>
                              <p className={`mt-1 text-base font-semibold ${salaryForecast.changeAmount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {salaryForecast.changeAmount >= 0 ? '+' : ''}{formatCurrency(salaryForecast.changeAmount)}
                              </p>
                              {salaryForecast.adjustmentAmount !== 0 && (
                                <p className="mt-1 text-[11px] text-gray-500">含调整额 {formatCurrency(salaryForecast.adjustmentAmount)}</p>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-2 gap-5">
                    {scoreDimensions.map((dim, index) => {
                      const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316'];
                      const borderColors = ['#BFDBFE', '#A7F3D0', '#DDD6FE', '#FED7AA'];
                      const color = colors[index];
                      const borderColor = borderColors[index];
                      return (
                        <Card key={dim.key} className="shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                {dim.name}
                              </CardTitle>
                              <Badge variant="outline" style={{ color, borderColor }}>权重 {(dim.weight * 100).toFixed(0)}%</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{dim.description}</p>
                          </CardHeader>
                          <CardContent>
                            <ScoreSelectorWithCriteria
                              value={scores[dim.key as keyof typeof scores]}
                              onChange={(v) => setScores(prev => ({ ...prev, [dim.key]: v }))}
                              dimensionKey={dim.key}
                            />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
                <TabsContent value="comment" className="mt-0 space-y-5">
                  {/* 关键词选择器 */}
                  <Card className="shadow-sm border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">快速评价标签</CardTitle>
                      <p className="text-xs text-gray-500">快速选择评价关键词，自动生成评价模板</p>
                    </CardHeader>
                    <CardContent>
                      <KeywordSelector
                        value={selectedKeywords}
                        onChange={setSelectedKeywords}
                        employeeLevel={getEmployeeLevel(selectedRecord?.employeeLevel)}
                        maxCount={7}
                      />
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">绩效分析标签</CardTitle>
                      <p className="text-xs text-gray-500">为后续绩效分析报告沉淀结构化数据，经理可直接勾选。</p>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">问题类型标签</div>
                          <div className="text-xs text-gray-500">记录本月主要短板，方便后续统计高频问题。</div>
                        </div>
                        <StructuredTagSelector
                          value={issueTypeTags}
                          onChange={setIssueTypeTags}
                          groups={analysisTagsData.issueTypes}
                          maxCount={4}
                          emptyText="可选 1-4 个主要问题"
                        />
                      </div>

                      <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">亮点贡献标签</div>
                          <div className="text-xs text-gray-500">沉淀员工优势，后续可做优秀案例和亮点复盘。</div>
                        </div>
                        <StructuredTagSelector
                          value={highlightTags}
                          onChange={setHighlightTags}
                          groups={analysisTagsData.highlights}
                          maxCount={4}
                          emptyText="可选 1-4 个亮点贡献"
                        />
                      </div>

                      <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">项目 / 工作类型标签</div>
                          <div className="text-xs text-gray-500">标记员工本月主要工作类型，后续可分析不同工作类型的得分差异。</div>
                        </div>
                        <StructuredTagSelector
                          value={workTypeTags}
                          onChange={setWorkTypeTags}
                          groups={analysisTagsData.workTypes}
                          maxCount={3}
                          emptyText="可选 1-3 个主要工作类型"
                        />
                      </div>

                      <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">改进动作标签</div>
                          <div className="text-xs text-gray-500">提前沉淀后续辅导动作，方便季度汇总时形成闭环。</div>
                        </div>
                        <StructuredTagSelector
                          value={improvementActionTags}
                          onChange={setImprovementActionTags}
                          groups={analysisTagsData.improvementActions}
                          maxCount={4}
                          emptyText="可选 1-4 个后续改进动作"
                        />
                      </div>

                      <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">问题归因标签</div>
                          <div className="text-xs text-gray-500">判断问题主要来自个人、协同、客户还是资源，为后续责任分析做准备。</div>
                        </div>
                        <StructuredTagSelector
                          value={issueAttributionTags}
                          onChange={setIssueAttributionTags}
                          groups={analysisTagsData.issueAttributions}
                          maxCount={2}
                          emptyText="可选 1-2 个问题归因"
                        />
                      </div>

                      <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">工作负荷标签</div>
                          <div className="text-xs text-gray-500">标记员工本月工作量感受，避免只看分数不看负荷。</div>
                        </div>
                        <StructuredTagSelector
                          value={workloadTags}
                          onChange={setWorkloadTags}
                          groups={analysisTagsData.workloadLevels}
                          maxCount={1}
                          emptyText="请选择 1 个工作负荷判断"
                        />
                      </div>

                      <div className="space-y-2 rounded-lg border border-gray-200 p-4 xl:col-span-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">经理建议等级</div>
                          <div className="text-xs text-gray-500">帮助后续做季度人才盘点，区分保持、关注、重点辅导和重点培养对象。</div>
                        </div>
                        <StructuredTagSelector
                          value={managerSuggestionTags}
                          onChange={setManagerSuggestionTags}
                          groups={analysisTagsData.managerSuggestionLevels}
                          maxCount={1}
                          emptyText="请选择 1 个经理建议等级"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={requiresScoreEvidence ? 'shadow-sm border-amber-200 bg-amber-50/60' : 'shadow-sm'}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        {scoreEvidenceLabel}
                        {requiresScoreEvidence && <span className="text-red-500 ml-1">*</span>}
                      </CardTitle>
                      <p className="text-xs text-gray-500">
                        综合得分达到优秀（≥1.40）或低于合格线（&lt;0.90）时，必须补充具体事件、项目或行为依据。
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="请写清楚具体事实，例如：负责某项目提前交付、关键问题闭环、重大质量事故、反复延期等..."
                        value={scoreEvidence}
                        onChange={(event) => setScoreEvidence(event.target.value)}
                        className="min-h-[110px] resize-none"
                      />
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-purple-200 bg-purple-50/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-sm font-medium">每月之星推荐</CardTitle>
                          <p className="text-xs text-gray-500 mt-1">如本月表现突出，可顺手推荐；HR 后续汇总评选。</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="monthly-star-toggle" className="text-sm">推荐</Label>
                          <Switch
                            id="monthly-star-toggle"
                            checked={monthlyStarRecommended}
                            onCheckedChange={(checked) => {
                              setMonthlyStarRecommended(checked);
                              if (checked && !monthlyStarReason.trim()) {
                                setMonthlyStarReason(scoreEvidence || managerComment || '');
                              }
                            }}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    {monthlyStarRecommended && (
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>推荐类型<span className="text-red-500 ml-1">*</span></Label>
                            <Select value={monthlyStarCategory} onValueChange={setMonthlyStarCategory}>
                              <SelectTrigger>
                                <SelectValue placeholder="选择每月之星类型" />
                              </SelectTrigger>
                              <SelectContent>
                                {monthlyStarCategories.map((category) => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
                            <div>
                              <Label htmlFor="monthly-star-public" className="text-sm">进入公示名单</Label>
                              <p className="text-xs text-gray-500">关闭后仅作为内部推荐草稿</p>
                            </div>
                            <Switch id="monthly-star-public" checked={monthlyStarPublic} onCheckedChange={setMonthlyStarPublic} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>推荐理由<span className="text-red-500 ml-1">*</span></Label>
                          <Textarea
                            placeholder="请用具体事例说明推荐理由，例如：解决关键技术问题、主动支援项目、持续改进效率等..."
                            value={monthlyStarReason}
                            onChange={(event) => setMonthlyStarReason(event.target.value)}
                            className="min-h-[110px] resize-none"
                          />
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">部门经理综合评价<span className="text-red-500 ml-1">*</span></CardTitle>
                      <p className="text-xs text-gray-500 mt-1">请对员工本月的整体工作表现进行评价（关键词已自动插入）</p>
                    </CardHeader>
                    <CardContent>
                      <Textarea placeholder="请输入对员工本月工作的综合评价..." value={managerComment} onChange={(e) => setManagerComment(e.target.value)} className="min-h-[160px] resize-none" />
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">下月工作安排<span className="text-red-500 ml-1">*</span></CardTitle>
                      <p className="text-xs text-gray-500 mt-1">请填写对员工下月工作的安排和期望</p>
                    </CardHeader>
                    <CardContent>
                      <Textarea placeholder="请输入对员工下月工作的安排和建议..." value={nextMonthWorkArrangement} onChange={(e) => setNextMonthWorkArrangement(e.target.value)} className="min-h-[160px] resize-none" />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex items-center justify-between shrink-0">
          <div className="text-sm text-gray-500">
            {(!managerComment || !nextMonthWorkArrangement) && (
              <span className="text-orange-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />请填写综合评价和下月工作安排后提交
              </span>
            )}
            {requiresScoreEvidence && scoreEvidence.trim().length < 10 && managerComment && nextMonthWorkArrangement && (
              <span className="text-orange-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />高分或低分需要补充具体事例说明
              </span>
            )}
            {monthlyStarRecommended && (!monthlyStarCategory || monthlyStarReason.trim().length < 10) && managerComment && nextMonthWorkArrangement && (
              <span className="text-orange-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />每月之星推荐需要类型和推荐理由
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button
              onClick={onSubmit}
              disabled={
                loading ||
                !managerComment ||
                !nextMonthWorkArrangement ||
                (requiresScoreEvidence && scoreEvidence.trim().length < 10) ||
                (monthlyStarRecommended && (!monthlyStarCategory || monthlyStarReason.trim().length < 10))
              }
              className="min-w-[120px]"
            >
              {loading ? '保存中...' : (selectedRecord?.status === 'completed' || selectedRecord?.status === 'scored') ? '保存修改' : '提交评分'}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>

    </Dialog>
  );
}
