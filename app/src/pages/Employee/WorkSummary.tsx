import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Send, Calendar, FileText, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AIAssistant } from '@/components/AIAssistant';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function WorkSummary() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { saveSummary, loading, error } = usePerformanceStore();
  
  const [month, setMonth] = useState<Date>(new Date());
  const [selfSummary, setSelfSummary] = useState('');
  const [nextMonthPlan, setNextMonthPlan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, _setShowSuccess] = useState(false);
  const [showDraftSuccess, setShowDraftSuccess] = useState(false);
  
  // AI助手状态
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiType, setAiType] = useState<'self-summary' | 'next-month-plan'>('self-summary');
  
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
  
  // 打开AI助手
  const handleOpenAI = (type: 'self-summary' | 'next-month-plan') => {
    setAiType(type);
    setAiDrawerOpen(true);
  };
  
  // 采用AI建议
  const handleAdoptAI = (content: string) => {
    if (aiType === 'self-summary') {
      setSelfSummary(content);
    } else {
      setNextMonthPlan(content);
    }
    setAiDrawerOpen(false);
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
              
              {/* Self Summary with AI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="summary">
                    本月工作总结
                    <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAI('self-summary')}
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    AI 帮我写
                  </Button>
                </div>
                <Textarea
                  id="summary"
                  placeholder="请描述本月完成的主要工作、项目经验与收获、遇到的困难与解决方案..."
                  value={selfSummary}
                  onChange={(e) => setSelfSummary(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
                <p className="text-xs text-gray-400">
                  建议包含：主要完成工作、项目经验、困难与解决方案
                </p>
              </div>
              
              {/* Next Month Plan with AI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan">
                    下月工作计划
                    <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAI('next-month-plan')}
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    AI 帮我写
                  </Button>
                </div>
                <Textarea
                  id="plan"
                  placeholder="请描述下月工作目标、计划开展的项目、需要协调的资源..."
                  value={nextMonthPlan}
                  onChange={(e) => setNextMonthPlan(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
                <p className="text-xs text-gray-400">
                  建议包含：工作目标、计划项目、资源需求
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting || loading}
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
                  disabled={isSubmitting || loading || !selfSummary || !nextMonthPlan}
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
                <li className="text-purple-700 font-medium">💡 点击"AI 帮我写"可以获取AI建议</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* AI Assistant Drawer */}
      <Sheet open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>AI 助手</SheetTitle>
          </SheetHeader>
          <AIAssistant
            type={aiType}
            requestData={{
              employeeId: user?.id,
              month: format(month, 'yyyy-MM'),
              currentSummary: aiType === 'next-month-plan' ? selfSummary : undefined
            }}
            onAdopt={handleAdoptAI}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
