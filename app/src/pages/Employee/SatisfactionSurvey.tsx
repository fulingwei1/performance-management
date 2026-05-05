import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  satisfactionSurveyApi,
  SatisfactionSurvey as SatisfactionSurveyType,
  SatisfactionSurveyResponse,
} from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const SCORE_LABELS: Record<number, string> = {
  1: '非常不满意',
  2: '不太满意',
  3: '一般',
  4: '比较满意',
  5: '非常满意',
};

type CurrentSurveyPayload = {
  survey: SatisfactionSurveyType;
  myResponse?: SatisfactionSurveyResponse | null;
};

export function SatisfactionSurvey() {
  const [survey, setSurvey] = useState<SatisfactionSurveyType | null>(null);
  const [myResponse, setMyResponse] = useState<SatisfactionSurveyResponse | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadCurrent = async () => {
    setLoading(true);
    try {
      const response = await satisfactionSurveyApi.getCurrent();
      if (response.success && response.data) {
        const payload = response.data as CurrentSurveyPayload;
        setSurvey(payload.survey);
        setMyResponse(payload.myResponse || null);
        setScores(payload.myResponse?.scores || {});
        setComment(payload.myResponse?.comment || '');
        setAnonymous(payload.myResponse?.anonymous !== false);
      } else {
        setSurvey(null);
        setMyResponse(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载满意度调查失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrent();
  }, []);

  const allQuestionsAnswered = useMemo(() => {
    if (!survey) return false;
    return survey.questions.every((question) => Number(scores[question.key]) >= 1 && Number(scores[question.key]) <= 5);
  }, [scores, survey]);

  const handleSubmit = async () => {
    if (!survey) return;
    if (!allQuestionsAnswered) {
      toast.error('请完成所有满意度评分');
      return;
    }

    setSubmitting(true);
    try {
      const response = await satisfactionSurveyApi.submitResponse(survey.id, {
        scores,
        comment,
        anonymous,
      });
      if (response.success) {
        toast.success('满意度调查已提交');
        await loadCurrent();
      } else {
        toast.error(response.message || '提交失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在加载满意度调查...
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              半年度满意度调查
            </CardTitle>
            <CardDescription>当前半年度还没有开放的满意度调查。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">HR 开启后，你可以在这里填写；系统会每半年自动准备一次调查。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const closed = survey.status !== 'open';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">半年度满意度调查</h1>
        <p className="mt-1 text-sm text-gray-500">每半年填写一次，帮助 HR 了解绩效考核和工作支持体验。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            {survey.title}
          </CardTitle>
          <CardDescription>
            周期：{survey.startDate} 至 {survey.endDate} · 状态：{survey.status === 'open' ? '开放填写' : survey.status === 'closed' ? '已关闭' : '草稿'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {myResponse && (
            <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              已提交过本期调查；在调查关闭前可以再次提交覆盖原答卷。
            </div>
          )}

          {closed && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              当前调查未开放，暂不能提交。
            </div>
          )}

          <div className="space-y-4">
            {survey.questions.map((question, index) => (
              <div key={question.key} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{index + 1}. {question.label}</p>
                    {question.description && <p className="mt-1 text-xs text-gray-500">{question.description}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((score) => {
                      const active = scores[question.key] === score;
                      return (
                        <button
                          key={score}
                          type="button"
                          disabled={closed}
                          onClick={() => setScores((prev) => ({ ...prev, [question.key]: score }))}
                          className={`rounded-lg border px-3 py-2 text-sm transition ${
                            active
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          } ${closed ? 'cursor-not-allowed opacity-60' : ''}`}
                          title={SCORE_LABELS[score]}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {scores[question.key] && (
                  <p className="mt-2 text-xs text-gray-500">已选：{scores[question.key]} 分（{SCORE_LABELS[scores[question.key]]}）</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">补充意见或建议（选填）</label>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={closed}
              rows={4}
              placeholder="例如：希望绩效反馈更及时、评分依据更透明、资源支持更充分……"
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={anonymous}
              disabled={closed}
              onChange={(event) => setAnonymous(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              匿名汇总展示
              <span className="mt-1 block text-xs text-gray-500">默认匿名。HR 统计页只展示汇总和匿名意见；如取消匿名，意见会显示姓名。</span>
            </span>
          </label>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={closed || submitting || !allQuestionsAnswered}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {myResponse ? '更新提交' : '提交调查'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
