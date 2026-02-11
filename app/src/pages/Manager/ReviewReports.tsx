import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, MessageSquare, Star } from 'lucide-react';
import { useOKRStore } from '@/stores/okrStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function ReviewReports() {
  const { teamReports, fetchTeamReports, reviewReport, loading } = useOKRStore();
  const [reviewDialog, setReviewDialog] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(3);

  useEffect(() => { fetchTeamReports(); }, [fetchTeamReports]);

  const handleReview = async () => {
    if (!reviewDialog || !comment) return;
    await reviewReport(reviewDialog, { comment, rating });
    setReviewDialog(null);
    setComment('');
    setRating(3);
  };

  const pending = teamReports.filter(r => r.status === 'submitted');
  const reviewed = teamReports.filter(r => r.status === 'reviewed');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">月报审阅</h1>
        <p className="text-gray-500 mt-1">审阅下属月度汇报并给出点评</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">待审阅</p>
            <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">已审阅</p>
            <p className="text-2xl font-bold text-green-600">{reviewed.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : teamReports.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">暂无月度汇报</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {/* Pending first */}
          {pending.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-3">待审阅 ({pending.length})</h3>
              {pending.map(report => (
                <Card key={report.id} className="mb-3 border-l-4 border-l-yellow-400">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{report.employeeName}</span>
                        <span className="text-sm text-gray-500">{report.month}</span>
                      </div>
                      <Button size="sm" onClick={() => { setReviewDialog(report.id); setComment(''); setRating(3); }}>
                        <MessageSquare className="w-3 h-3 mr-1" /> 点评
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">{report.summary}</p>
                    {report.achievements && report.achievements.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-gray-500 mt-2">
                        {report.achievements.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {reviewed.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-3">已审阅 ({reviewed.length})</h3>
              {reviewed.map(report => (
                <Card key={report.id} className="mb-3 border-l-4 border-l-green-400">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{report.employeeName}</span>
                        <span className="text-sm text-gray-500">{report.month}</span>
                      </div>
                      <Badge className="bg-green-100 text-green-700">已审阅</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{report.summary}</p>
                    {report.reviewComment && (
                      <div className="bg-green-50 rounded p-2 mt-2 text-sm text-green-700">
                        <span className="font-medium">点评：</span>{report.reviewComment}
                        {report.reviewRating && <span className="ml-2">⭐ {report.reviewRating}/5</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>审阅点评</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>评分 (1-5)</Label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRating(n)} className={cn('w-8 h-8 rounded-full flex items-center justify-center', n <= rating ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400')}>
                    <Star className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>点评内容</Label>
              <textarea className="w-full border rounded-md p-2 text-sm min-h-[100px]" value={comment} onChange={e => setComment(e.target.value)} placeholder="输入审阅意见..." />
            </div>
            <Button onClick={handleReview} className="w-full" disabled={!comment}>提交点评</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
