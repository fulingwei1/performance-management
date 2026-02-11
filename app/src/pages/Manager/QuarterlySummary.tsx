import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Send, Calendar, FileText, Loader2, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useHRStore } from '@/stores/hrStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function QuarterlySummary() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const saveQuarterlySummary = useHRStore(state => state.saveQuarterlySummary);
  const fetchQuarterlySummary = useHRStore(state => state.fetchQuarterlySummary);
  const getQuarterlySummary = useHRStore(state => state.getQuarterlySummary);

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [year, setYear] = useState(currentYear.toString());
  const [quarter, setQuarter] = useState(`Q${currentQuarter}`);
  const [quarterlySummary, setQuarterlySummary] = useState('');
  const [nextQuarterPlan, setNextQuarterPlan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDraftSuccess, setShowDraftSuccess] = useState(false);

  const quarterKey = `${year}-${quarter}`;

  useEffect(() => {
    if (!user) return;
    const existing = getQuarterlySummary(user.id, quarterKey);
    if (existing) {
      setQuarterlySummary(existing.summary);
      setNextQuarterPlan(existing.nextQuarterPlan);
    } else {
      setQuarterlySummary('');
      setNextQuarterPlan('');
    }
    let active = true;
    fetchQuarterlySummary(quarterKey).then((record) => {
      if (!active) return;
      if (record) {
        setQuarterlySummary(record.summary);
        setNextQuarterPlan(record.nextQuarterPlan);
      }
    });
    setShowSuccess(false);
    setShowDraftSuccess(false);
    return () => {
      active = false;
    };
  }, [user, quarterKey, getQuarterlySummary, fetchQuarterlySummary]);

  const handleSave = async (isDraft: boolean) => {
    if (!user) return;

    if (!quarterlySummary.trim()) {
      toast.error('请填写季度工作总结');
      return;
    }

    if (!nextQuarterPlan.trim() && !isDraft) {
      toast.error('请填写下季度工作计划');
      return;
    }

    setIsSubmitting(true);

    try {
      await saveQuarterlySummary({
        managerId: user.id,
        managerName: user.name,
        quarter: quarterKey,
        summary: quarterlySummary,
        nextQuarterPlan,
        status: isDraft ? 'draft' : 'submitted'
      });

      if (!isDraft) {
        setShowSuccess(true);
        toast.success('季度总结提交成功！');
        setTimeout(() => {
          navigate('/manager/dashboard');
        }, 2000);
      } else {
        setShowDraftSuccess(true);
        toast.success('草稿保存成功！');
        setTimeout(() => setShowDraftSuccess(false), 3000);
      }
    } catch (error: any) {
      toast.error(error.message || '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">季度工作总结</h1>
        <p className="text-gray-500 mt-1">填写本季度部门工作总结及下季度计划</p>
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
              季度总结提交成功！总经理将进行评分
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

      {/* Form */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              季度总结表单
            </CardTitle>
            <CardDescription>
              请详细填写本季度部门工作完成情况及下季度工作计划
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quarter Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  选择年份
                </Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}年</SelectItem>
                    <SelectItem value={currentYear.toString()}>{currentYear}年</SelectItem>
                    <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}年</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quarter" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  选择季度
                </Label>
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger id="quarter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">第一季度 (1-3月)</SelectItem>
                    <SelectItem value="Q2">第二季度 (4-6月)</SelectItem>
                    <SelectItem value="Q3">第三季度 (7-9月)</SelectItem>
                    <SelectItem value="Q4">第四季度 (10-12月)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Badge className="bg-blue-600">当前</Badge>
              <span className="text-sm text-gray-700">
                {year}年 {quarter === 'Q1' ? '第一' : quarter === 'Q2' ? '第二' : quarter === 'Q3' ? '第三' : '第四'}季度
              </span>
            </div>

            {/* Quarterly Summary */}
            <div className="space-y-2">
              <Label htmlFor="quarterlySummary" className="text-base font-semibold">
                季度工作总结 <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                请总结本季度部门主要工作成果、重点任务完成情况、遇到的挑战及解决方案等（建议300字以上）
              </p>
              <Textarea
                id="quarterlySummary"
                placeholder="示例：
本季度我部门共完成重点项目5个，超额完成季度目标...

主要成果：
1. XX项目按期交付，客户满意度达95%
2. 团队人效提升20%，技术攻关取得突破
3. ...

遇到的挑战与解决：
1. 人员短缺问题通过内部培养和外部招聘得到缓解
2. ...

团队建设：
1. 组织技术分享会6次，团队技术能力明显提升
2. ..."
                value={quarterlySummary}
                onChange={(e) => setQuarterlySummary(e.target.value)}
                className="min-h-[300px] resize-y"
              />
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>已输入 {quarterlySummary.length} 字</span>
                <span className={cn(
                  quarterlySummary.length < 300 && "text-orange-500"
                )}>
                  {quarterlySummary.length < 300 ? '建议至少300字' : '字数充足'}
                </span>
              </div>
            </div>

            {/* Next Quarter Plan */}
            <div className="space-y-2">
              <Label htmlFor="nextQuarterPlan" className="text-base font-semibold">
                下季度工作计划 <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                请规划下季度部门工作重点、预期目标、资源需求等（建议200字以上）
              </p>
              <Textarea
                id="nextQuarterPlan"
                placeholder="示例：
下季度工作重点：

1. 重点项目推进
   - XX项目完成开发并上线
   - XX项目启动并完成30%

2. 团队能力建设
   - 引进高级技术人才2-3名
   - 开展专项技术培训

3. 流程优化
   - 优化项目管理流程，缩短交付周期
   - 建立质量管控体系

预期目标：
- 项目交付准时率达95%以上
- 团队人效提升15%
- ..."
                value={nextQuarterPlan}
                onChange={(e) => setNextQuarterPlan(e.target.value)}
                className="min-h-[250px] resize-y"
              />
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>已输入 {nextQuarterPlan.length} 字</span>
                <span className={cn(
                  nextQuarterPlan.length < 200 && "text-orange-500"
                )}>
                  {nextQuarterPlan.length < 200 ? '建议至少200字' : '字数充足'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={itemVariants} className="mt-6 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => navigate('/manager/dashboard')}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSave(true)}
          disabled={isSubmitting || !quarterlySummary.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存草稿
            </>
          )}
        </Button>
        <Button
          onClick={() => handleSave(false)}
          disabled={isSubmitting || !quarterlySummary.trim() || !nextQuarterPlan.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              提交中...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              提交总结
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
