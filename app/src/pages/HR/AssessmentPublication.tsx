import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, AlertCircle, XCircle, Send, Trash2, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { assessmentPublicationApi, performanceApi } from '@/services/api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Publication {
  id: string;
  month: string;
  publishedBy: string;
  publishedAt: string;
  publisherName?: string;
}

interface MonthStats {
  totalEmployees: number;
  completedCount: number;
  pendingCount: number;
}

export function AssessmentPublication() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const [monthToUnpublish, setMonthToUnpublish] = useState<string>('');

  // 生成默认月份（当前月份）
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
  }, []);

  // 加载已发布月份列表
  useEffect(() => {
    loadPublications();
  }, []);

  // 当选择月份时，加载该月统计数据
  useEffect(() => {
    if (selectedMonth) {
      loadMonthStats();
    }
  }, [selectedMonth]);

  const loadPublications = async () => {
    try {
      const response = await assessmentPublicationApi.getAllPublished();
      if (response.success) {
        setPublications(response.data || []);
      }
    } catch (error: any) {
      console.error('加载发布列表失败:', error);
    }
  };

  const loadMonthStats = async () => {
    if (!selectedMonth) return;
    
    setStatsLoading(true);
    try {
      const response = await performanceApi.getRecordsByMonth(selectedMonth);
      if (response.success) {
        const records = response.data || [];
        const totalEmployees = records.length;
        const completedCount = records.filter((r: any) => 
          r.taskCompletion !== null && r.managerComment
        ).length;
        const pendingCount = totalEmployees - completedCount;
        
        setMonthStats({
          totalEmployees,
          completedCount,
          pendingCount
        });
      }
    } catch (error: any) {
      console.error('加载月度统计失败:', error);
      setMonthStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedMonth) {
      toast.error('请选择要发布的月份');
      return;
    }

    // 验证该月是否有考核记录
    if (!monthStats || monthStats.totalEmployees === 0) {
      toast.error('该月份没有考核记录，无法发布');
      return;
    }

    // 检查是否有未完成的考核
    if (monthStats.pendingCount > 0) {
      toast.warning(`该月份还有 ${monthStats.pendingCount} 名员工的考核未完成，确定要发布吗？`, {
        action: {
          label: '继续发布',
          onClick: () => doPublish()
        }
      });
      return;
    }

    await doPublish();
  };

  const doPublish = async () => {
    setLoading(true);
    try {
      const response = await assessmentPublicationApi.publish(selectedMonth);
      if (response.success) {
        toast.success(`${selectedMonth} 的考核结果已发布`);
        await loadPublications();
        await loadMonthStats();
      }
    } catch (error: any) {
      toast.error(error.message || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = (month: string) => {
    setMonthToUnpublish(month);
    setShowUnpublishDialog(true);
  };

  const confirmUnpublish = async () => {
    setLoading(true);
    try {
      const response = await assessmentPublicationApi.unpublish(monthToUnpublish);
      if (response.success) {
        toast.success(`${monthToUnpublish} 的发布已取消`);
        await loadPublications();
        setShowUnpublishDialog(false);
      }
    } catch (error: any) {
      toast.error(error.message || '取消发布失败');
    } finally {
      setLoading(false);
    }
  };

  // 检查当前月份是否已发布
  const isPublished = publications.some(p => p.month === selectedMonth);

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
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">考核结果发布</h1>
        <p className="text-gray-500 mt-1">发布月度考核结果，员工可查看正式绩效</p>
      </motion.div>

      {/* Publish Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              发布考核结果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Month Selector */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  选择月份
                </label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handlePublish}
                disabled={loading || statsLoading || isPublished || !selectedMonth}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? '发布中...' : isPublished ? '已发布' : '发布结果'}
              </Button>
            </div>

            {/* Month Statistics */}
            {selectedMonth && monthStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">总人数</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {monthStats.totalEmployees}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">已完成</p>
                        <p className="text-2xl font-bold text-green-600">
                          {monthStats.completedCount}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">待完成</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {monthStats.pendingCount}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedMonth && !monthStats && !statsLoading && (
              <div className="text-center py-6 text-gray-500">
                该月份暂无考核记录
              </div>
            )}

            {isPublished && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">
                  {selectedMonth} 的考核结果已发布
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Published List */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              已发布月份
            </CardTitle>
          </CardHeader>
          <CardContent>
            {publications.length > 0 ? (
              <div className="space-y-3">
                {publications.map((pub) => (
                  <div
                    key={pub.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{pub.month}</span>
                          <Badge className="bg-green-100 text-green-700">
                            已发布
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {pub.publisherName || pub.publishedBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(pub.publishedAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {import.meta.env.DEV && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUnpublish(pub.month)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        取消发布
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无已发布的月份</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Unpublish Confirmation Dialog */}
      <AlertDialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消发布</AlertDialogTitle>
            <AlertDialogDescription>
              确定要取消 {monthToUnpublish} 的考核结果发布吗？
              <br />
              取消后，员工将无法查看该月份的正式考核结果。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnpublish}
              className="bg-red-600 hover:bg-red-700"
            >
              确认取消发布
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
