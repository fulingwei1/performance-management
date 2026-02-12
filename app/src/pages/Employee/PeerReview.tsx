import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, MessageSquare, Send, Users, Sparkles, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/score/StarRating';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ReviewState {
  collaboration: number;
  professionalism: number;
  communication: number;
  comment: string;
}

export function EmployeePeerReview() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  // 生成分配
  useEffect(() => {
    const fetchAssignments = async () => {
      if (user) {
        try {
          const response = await api.peerReview.getMyTasks(currentMonth);
          console.log('获取到的待评价任务:', response);

          if (response.success && response.data) {
            const tasks = response.data;
            // 过滤出尚未提交的评价任务（协作度、专业度、沟通都为1表示未评分）
            const pendingTasks = tasks.filter((t: any) =>
              t.collaboration === 1 &&
              t.professionalism === 1 &&
              t.communication === 1
            );

            console.log('待评价任务:', pendingTasks);

            setAssignments(pendingTasks.map((t: any) => ({
              revieweeId: t.revieweeId,
              revieweeName: t.revieweeName,
              department: user.subDepartment,
              recordId: t.id
            })));
          }
        } catch (error) {
          console.error('获取待评价任务失败:', error);
        }
      }
    };

    fetchAssignments();
  }, [user, currentMonth]);
  
  const handleReviewChange = (revieweeId: string, field: keyof ReviewState, value: number | string) => {
    setReviews(prev => ({
      ...prev,
      [revieweeId]: {
        ...prev[revieweeId],
        [field]: value
      }
    }));
  };
  
  /**
   * AI生成评价意见
   */
  const handleGenerateComment = async (revieweeId: string, revieweeName: string) => {
    if (!user) return;

    const review = reviews[revieweeId] || { collaboration: 0, professionalism: 0, communication: 0, comment: '' };
    
    if (!review.collaboration || !review.professionalism || !review.communication) {
      return; // 评分未完成，不生成
    }

    setAiLoading(prev => ({ ...prev, [revieweeId]: true }));

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${API_BASE_URL}/ai/peer-review-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reviewerName: user.name,
          revieweeName,
          scores: {
            collaboration: review.collaboration,
            professionalism: review.professionalism,
            communication: review.communication
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const versions = result.data.versions || [];
        if (versions.length > 0) {
          handleReviewChange(revieweeId, 'comment', versions[0]);
        }
      }
    } catch (error) {
      console.error('Error generating AI comment:', error);
    } finally {
      setAiLoading(prev => ({ ...prev, [revieweeId]: false }));
    }
  };
  
  const handleSubmit = async (revieweeId: string) => {
    setSubmitting(true);
    try {
      const review = reviews[revieweeId];
      const assignment = assignments.find(a => a.revieweeId === revieweeId);

      const response = await api.peerReview.submitReview({
        id: assignment?.recordId || revieweeId,
        collaboration: review.collaboration,
        professionalism: review.professionalism,
        communication: review.communication,
        comment: review.comment
      });

      if (response.success) {
        setSubmitted(prev => [...prev, revieweeId]);
      }
    } catch (error) {
      console.error('提交评价失败:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const isReviewComplete = (revieweeId: string) => {
    const review = reviews[revieweeId];
    return review && 
           review.collaboration > 0 && 
           review.professionalism > 0 && 
           review.communication > 0;
  };
  
  // 统计
  const totalReviews = assignments.length;
  const completedReviews = submitted.length;
  const completionRate = totalReviews > 0 ? (completedReviews / totalReviews) * 100 : 0;
  
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">360度评分</h1>
          <p className="text-gray-500 mt-1">对部门内随机分配的协作同事进行多维度评价</p>
        </div>
      </motion.div>
      
      {/* Progress */}
      <motion.div variants={itemVariants} className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">评分进度</p>
                <p className="text-2xl font-bold mt-1">
                  {completedReviews} / {totalReviews}
                </p>
              </div>
              <div className="flex-1 mx-6">
                <Progress value={completionRate} className="h-3" />
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">完成度</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(completionRate)}%
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-blue-700">
                系统已为您随机分配 <strong>{totalReviews}</strong> 位同部门同事进行评分
                {totalReviews < 3 && '（部门人数不足3人）'}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Reviewee List */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          待评同事
        </h3>
        
        {assignments.map((reviewee, index) => {
          const isSubmitted = submitted.includes(reviewee.revieweeId);
          const review = reviews[reviewee.revieweeId] || { collaboration: 0, professionalism: 0, communication: 0, comment: '' };
          
          return (
            <Card 
              key={reviewee.revieweeId}
              className={cn(
                "transition-all duration-200",
                isSubmitted && "bg-green-50 border-green-200"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold",
                      isSubmitted ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {isSubmitted ? <CheckCircle className="w-6 h-6" /> : reviewee.revieweeName.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{reviewee.revieweeName}</CardTitle>
                      <CardDescription>{reviewee.department}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">评分 {index + 1}/{totalReviews}</Badge>
                    
                    {isSubmitted ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        已完成
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {isReviewComplete(reviewee.revieweeId) ? '可提交' : '待评分'}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className={cn("pt-0", isSubmitted && "opacity-60")}>
                <div className="border-t pt-4 space-y-6">
                  {/* Collaboration */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        协作态度
                      </label>
                      <span className="text-sm text-gray-500">
                        {review.collaboration > 0 ? `${review.collaboration} 星` : '未评分'}
                      </span>
                    </div>
                    <StarRating
                      value={review.collaboration}
                      onChange={(v) => handleReviewChange(reviewee.revieweeId, 'collaboration', v)}
                      size="lg"
                      readOnly={isSubmitted}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      评估该同事在项目协作中的配合度和积极性
                    </p>
                  </div>
                  
                  {/* Professionalism */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        专业能力
                      </label>
                      <span className="text-sm text-gray-500">
                        {review.professionalism > 0 ? `${review.professionalism} 星` : '未评分'}
                      </span>
                    </div>
                    <StarRating
                      value={review.professionalism}
                      onChange={(v) => handleReviewChange(reviewee.revieweeId, 'professionalism', v)}
                      size="lg"
                      readOnly={isSubmitted}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      评估该同事的专业技能水平和问题解决能力
                    </p>
                  </div>
                  
                  {/* Communication */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        沟通效率
                      </label>
                      <span className="text-sm text-gray-500">
                        {review.communication > 0 ? `${review.communication} 星` : '未评分'}
                      </span>
                    </div>
                    <StarRating
                      value={review.communication}
                      onChange={(v) => handleReviewChange(reviewee.revieweeId, 'communication', v)}
                      size="lg"
                      readOnly={isSubmitted}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      评估该同事的沟通表达和信息传递效率
                    </p>
                  </div>
                  
                  {/* Comment */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        评价建议（可选）
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateComment(reviewee.revieweeId, reviewee.revieweeName)}
                        disabled={aiLoading[reviewee.revieweeId] || isSubmitted || !isReviewComplete(reviewee.revieweeId)}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        {aiLoading[reviewee.revieweeId] ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-1" />
                        )}
                        AI 帮我写
                      </Button>
                    </div>
                    <Textarea
                      placeholder="请描述您对该同事的评价和建议..."
                      value={review.comment}
                      onChange={(e) => handleReviewChange(reviewee.revieweeId, 'comment', e.target.value)}
                      className="min-h-[80px]"
                      disabled={isSubmitted}
                    />
                  </div>
                  
                  {/* Submit */}
                  {!isSubmitted && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleSubmit(reviewee.revieweeId)}
                        disabled={!isReviewComplete(reviewee.revieweeId) || submitting}
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        提交评分
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {assignments.length === 0 && (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">部门内暂无其他员工需要评分</p>
          </Card>
        )}
      </motion.div>
      
      {/* Tips */}
      <motion.div variants={itemVariants} className="mt-6">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-6">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              评分说明
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>系统每月随机分配2位同部门同事（自己不参与评价自己，不满2人则按实际人数）</li>
              <li>请根据实际协作体验进行客观评价</li>
              <li>评分采用5星制，1星最低，5星最高</li>
              <li>评价建议为选填项，但有助于被评人改进</li>
              <li>提交后评分不可修改</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
