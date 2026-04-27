import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, CheckCircle, Clock } from 'lucide-react';
import { assessmentTemplateApi } from '@/services/api';
import { toast } from 'sonner';

interface Stats {
  totalTemplates: number;
  activeTemplates: number;
  departmentTypes: { type: string; count: number }[];
  totalMetrics: number;
}

export function AssessmentStatsCard() {
  const [stats, setStats] = useState<Stats>({
    totalTemplates: 0,
    activeTemplates: 0,
    departmentTypes: [],
    totalMetrics: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await assessmentTemplateApi.getAll({ includeMetrics: true });
      
      if (result?.success && result.data) {
        const templates = result.data;
        
        const deptTypeCounts: Record<string, number> = {};
        let totalMetrics = 0;
        
        templates.forEach((t: any) => {
          deptTypeCounts[t.departmentType] = (deptTypeCounts[t.departmentType] || 0) + 1;
          if (t.metrics) totalMetrics += t.metrics.length;
        });
        
        setStats({
          totalTemplates: templates.length,
          activeTemplates: templates.filter((t: any) => t.status === 'active').length,
          departmentTypes: Object.entries(deptTypeCounts).map(([type, count]) => ({ type, count })),
          totalMetrics
        });
      }
    } catch (error) {
      console.error('加载统计失败:', error);
      toast.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    sales: { label: '销售类', icon: '💰', color: 'bg-green-100 text-green-700' },
    engineering: { label: '工程类', icon: '🔧', color: 'bg-blue-100 text-blue-700' },
    manufacturing: { label: '生产类', icon: '🏭', color: 'bg-orange-100 text-orange-700' },
    support: { label: '支持类', icon: '📋', color: 'bg-purple-100 text-purple-700' },
    management: { label: '管理类', icon: '👔', color: 'bg-red-100 text-red-700' }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          差异化考核统计
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 总览 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">考核模板</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalTemplates}</div>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">启用中</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{stats.activeTemplates}</div>
            </div>
          </div>

          {/* 部门类型分布 */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">部门类型覆盖</div>
            <div className="flex flex-wrap gap-2">
              {stats.departmentTypes.map(({ type, count }) => {
                const config = TYPE_LABELS[type];
                if (!config) return null;
                
                return (
                  <Badge key={type} className={config.color}>
                    {config.icon} {config.label} ({count})
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* 指标总数 */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">考核指标总数</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{stats.totalMetrics}</span>
            </div>
          </div>

          {/* 提示 */}
          <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
            <Clock className="w-3 h-3 inline mr-1" />
            差异化考核根据部门类型自动应用对应模板
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
