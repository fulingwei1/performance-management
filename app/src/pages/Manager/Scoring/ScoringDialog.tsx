import { useState, useEffect } from 'react';
import { FileText, Send, X, AlertCircle, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { ScoreSelectorWithCriteria } from '@/components/score/ScoreSelectorWithCriteria';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { scoreDimensions, scoreLevels, getLevelLabel, getLevelColor, resolveGroupType } from '@/lib/config';
import { KeywordSelector } from '@/components/KeywordSelector';
import { AIAssistant } from '@/components/AIAssistant';
import keywordsData from '@/data/evaluation-keywords.json';

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
  totalScore: number;
  loading: boolean;
  onSubmit: () => void;
}

export function ScoringDialog({
  open, onOpenChange, selectedRecord, isNoSummary,
  scores, setScores, managerComment, setManagerComment,
  nextMonthWorkArrangement, setNextMonthWorkArrangement,
  totalScore, loading, onSubmit
}: ScoringDialogProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  
  // AI助手状态
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiType, setAiType] = useState<'manager-comment' | 'work-arrangement'>('manager-comment');
  
  // 打开AI助手
  const handleOpenAI = (type: 'manager-comment' | 'work-arrangement') => {
    setAiType(type);
    setAiDrawerOpen(true);
  };
  
  // 采用AI建议
  const handleAdoptAI = (content: string) => {
    if (aiType === 'manager-comment') {
      setManagerComment(content);
    } else {
      setNextMonthWorkArrangement(content);
    }
    setAiDrawerOpen(false);
  };
  
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
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedRecord.selfSummary}</p>
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
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedRecord.nextMonthPlan}</p>
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
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-medium">部门经理综合评价<span className="text-red-500 ml-1">*</span></CardTitle>
                          <p className="text-xs text-gray-500 mt-1">请对员工本月的整体工作表现进行评价（关键词已自动插入）</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAI('manager-comment')}
                          className="border-purple-300 text-purple-700 hover:bg-purple-50 shrink-0"
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          AI 建议
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea placeholder="请输入对员工本月工作的综合评价..." value={managerComment} onChange={(e) => setManagerComment(e.target.value)} className="min-h-[160px] resize-none" />
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-medium">下月工作安排<span className="text-red-500 ml-1">*</span></CardTitle>
                          <p className="text-xs text-gray-500 mt-1">请填写对员工下月工作的安排和期望</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAI('work-arrangement')}
                          className="border-purple-300 text-purple-700 hover:bg-purple-50 shrink-0"
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          AI 建议
                        </Button>
                      </div>
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
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={onSubmit} disabled={loading || !managerComment || !nextMonthWorkArrangement} className="min-w-[120px]">
              {loading ? '保存中...' : (selectedRecord?.status === 'completed' || selectedRecord?.status === 'scored') ? '保存修改' : '提交评分'}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* AI Assistant Drawer */}
      <Sheet open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>AI 助手</SheetTitle>
          </SheetHeader>
          <AIAssistant
            type={aiType}
            requestData={{
              employeeId: selectedRecord?.employeeId,
              selfSummary: selectedRecord?.selfSummary || '',
              scores: scores,
              currentComment: aiType === 'work-arrangement' ? managerComment : undefined
            }}
            onAdopt={handleAdoptAI}
          />
        </SheetContent>
      </Sheet>
    </Dialog>
  );
}
