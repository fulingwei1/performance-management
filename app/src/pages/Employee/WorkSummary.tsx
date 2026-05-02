import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Send, Calendar, FileText, Loader2, CheckCircle, Lightbulb } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { FrozenAlert } from '@/components/FrozenAlert';
import { StructuredTagSelector } from '@/components/StructuredTagSelector';
import { performanceApi } from '@/services/api';
import analysisTagsData from '@/data/performance-analysis-tags.json';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function WorkSummary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { saveSummary, loading, error } = usePerformanceStore();

  const monthParam = searchParams.get('month');
  const initialMonth = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)
    ? new Date(`${monthParam}-01T00:00:00`)
    : new Date();
  
  const [month, setMonth] = useState<Date>(initialMonth);
  const [selfSummary, setSelfSummary] = useState('');
  const [nextMonthPlan, setNextMonthPlan] = useState('');
  const [employeeIssueTags, setEmployeeIssueTags] = useState<string[]>([]);
  const [resourceNeedTags, setResourceNeedTags] = useState<string[]>([]);
  const [improvementSuggestion, setImprovementSuggestion] = useState('');
  const [suggestionAnonymous, setSuggestionAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, _setShowSuccess] = useState(false);
  const [showDraftSuccess, setShowDraftSuccess] = useState(false);
  
  // 冻结状态
  const [frozen, setFrozen] = useState(false);
  const [deadline, setDeadline] = useState<string | undefined>(undefined);
  const [recordId, setRecordId] = useState<string | null>(null);
  
  // 加载该月份的记录（检测冻结状态）
  useEffect(() => {
    const loadRecord = async () => {
      if (!user) return;
      
      const monthStr = format(month, 'yyyy-MM');
      try {
        const response = await performanceApi.getMyRecordByMonth(monthStr);
        if (response.success && response.data) {
          const record = response.data;
          setRecordId(record.id);
          setFrozen(record.frozen || false);
          setDeadline(record.deadline);
          
          // 如果记录已存在，加载已保存的内容；空草稿要清空旧月份遗留输入
          setSelfSummary(record.selfSummary || '');
          setNextMonthPlan(record.nextMonthPlan || '');
          setEmployeeIssueTags(record.employeeIssueTags || []);
          setResourceNeedTags(record.resourceNeedTags || []);
          setImprovementSuggestion(record.improvementSuggestion || '');
          setSuggestionAnonymous(record.suggestionAnonymous === true);
        } else {
          // 该月份无记录，清空状态
          setRecordId(null);
          setFrozen(false);
          setDeadline(undefined);
          setSelfSummary('');
          setNextMonthPlan('');
          setEmployeeIssueTags([]);
          setResourceNeedTags([]);
          setImprovementSuggestion('');
          setSuggestionAnonymous(false);
        }
      } catch (error) {
        console.error('加载记录失败:', error);
        toast.error('加载记录失败');
      }
    };
    
    loadRecord();
  }, [month, user]);
  
  const handleSave = async (isDraft: boolean) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    const monthStr = format(month, 'yyyy-MM');
    const recordId = `rec-${user.id}-${monthStr}`;
    
    const success = await saveSummary({
      id: recordId,
      employeeId: user.id,
      employeeName: user.name,
      department: user.department,
      subDepartment: user.subDepartment,
      assessorId: user.managerId || '',
      month: monthStr,
      selfSummary,
      nextMonthPlan,
      employeeIssueTags,
      resourceNeedTags,
      improvementSuggestion,
      suggestionAnonymous,
      status: isDraft ? 'draft' : 'submitted'
    });
    
    if (success && !isDraft) {
      navigate('/employee/dashboard');
    } else if (success && isDraft) {
      setShowDraftSuccess(true);
      setTimeout(() => setShowDraftSuccess(false), 3000);
    }

    setIsSubmitting(false);
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">月度工作总结</h1>
          <p className="text-gray-500 mt-1">填写本月工作总结及下月计划</p>
        </motion.div>
        
        {/* Success Alert */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700">
                工作总结提交成功！经理将进行评分
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Draft Success Alert */}
        {showDraftSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <Alert className="bg-blue-50 border-blue-200">
              <Save className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                草稿保存成功！您可以随时返回修改或继续填写
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4"
          >
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
        
        {/* Frozen Alert */}
        <motion.div variants={itemVariants} className="mb-4">
          <FrozenAlert frozen={frozen} deadline={deadline} />
        </motion.div>
        
        {/* Form */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                工作总结表单
              </CardTitle>
              <CardDescription>
                请如实填写本月工作完成情况及下月工作计划
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Month Selection */}
              <div className="space-y-2">
                <Label>考核月份</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !month && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {month ? format(month, 'yyyy年MM月', { locale: zhCN }) : '选择月份'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={month}
                      onSelect={(date) => date && setMonth(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Self Summary */}
              <div className="space-y-2">
                <Label htmlFor="summary">
                  本月工作总结
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="summary"
                  placeholder="请描述本月完成的主要工作、项目经验与收获、遇到的困难与解决方案..."
                  value={selfSummary}
                  onChange={(e) => setSelfSummary(e.target.value)}
                  disabled={frozen}
                  className="min-h-[150px] resize-none"
                />
                <p className="text-xs text-gray-400">
                  建议包含：主要完成工作、项目经验、困难与解决方案
                </p>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-2">
                    <div className="text-sm font-medium text-gray-900">本月问题反馈标签</div>
                    <div className="text-xs text-gray-500 mt-1">如果本月有明显阻碍，直接勾选，后面可以自动分析员工高频反馈问题。</div>
                  </div>
                  <StructuredTagSelector
                    value={employeeIssueTags}
                    onChange={setEmployeeIssueTags}
                    groups={analysisTagsData.employeeIssueFeedbacks}
                    maxCount={4}
                    emptyText="可选 1-4 个本月主要问题"
                  />
                </div>
              </div>
              
              {/* Next Month Plan */}
              <div className="space-y-2">
                <Label htmlFor="plan">
                  下月工作计划
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="plan"
                  placeholder="请描述下月工作目标、计划开展的项目、需要协调的资源..."
                  value={nextMonthPlan}
                  onChange={(e) => setNextMonthPlan(e.target.value)}
                  disabled={frozen}
                  className="min-h-[150px] resize-none"
                />
                <p className="text-xs text-gray-400">
                  建议包含：工作目标、计划项目、资源需求
                </p>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-2">
                    <div className="text-sm font-medium text-gray-900">下月资源诉求标签</div>
                    <div className="text-xs text-gray-500 mt-1">提前告诉经理你下月最需要的支持，便于后续协同和分析。</div>
                  </div>
	                  <StructuredTagSelector
	                    value={resourceNeedTags}
	                    onChange={setResourceNeedTags}
	                    groups={analysisTagsData.resourceNeedTags}
	                    maxCount={4}
	                    emptyText="可选 1-4 个资源诉求"
	                  />
	                </div>
	              </div>

	              {/* Improvement Suggestion */}
	              <div className="space-y-2">
	                <div className="flex items-start justify-between gap-3">
	                  <div>
	                    <Label htmlFor="improvement-suggestion" className="flex items-center gap-2">
	                      <Lightbulb className="h-4 w-4 text-amber-500" />
	                      合理化建议（选填）
	                    </Label>
	                    <p className="mt-1 text-xs text-gray-500">
	                      可写流程改进、降本增效、安全质量、工具设备、协同机制等建议；显名建议被采纳落地后可追溯奖励。
	                    </p>
	                  </div>
	                  <label className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-gray-600">
	                    <input
	                      type="checkbox"
	                      checked={suggestionAnonymous}
	                      onChange={(event) => setSuggestionAnonymous(event.target.checked)}
	                      disabled={frozen}
	                      className="h-4 w-4 rounded border-gray-300"
	                    />
	                    匿名提交
	                  </label>
	                </div>
	                <Textarea
	                  id="improvement-suggestion"
	                  placeholder="例如：建议优化某流程、减少重复录入、提升交付效率或降低质量风险……"
	                  value={improvementSuggestion}
	                  onChange={(e) => setImprovementSuggestion(e.target.value)}
	                  disabled={frozen}
	                  className="min-h-[110px] resize-none"
	                />
	                <p className="text-xs text-gray-400">
	                  匿名提交后，经理侧汇总只显示“匿名提交”；不填写则不会生成建议记录。
	                </p>
	              </div>
	              
	              {/* Actions */}
	              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting || loading || frozen}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  保存草稿
                </Button>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={isSubmitting || loading || frozen || !selfSummary || !nextMonthPlan}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  提交
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Tips */}
        <motion.div variants={itemVariants} className="mt-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-6">
              <h4 className="font-medium text-blue-900 mb-2">填写提示</h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>工作总结应客观真实，突出重点和亮点</li>
                <li>计划应具体可行，明确目标和措施</li>
                <li>可在提交前保存草稿，随时修改</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
