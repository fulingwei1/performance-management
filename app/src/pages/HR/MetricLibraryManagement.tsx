import { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  Filter,
  Save,
  X,
  BookTemplate
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { metricLibraryApi } from '@/services/api';
import type { PerformanceMetric, MetricTemplate, ScoreLevel, MetricCategory, MetricType } from '@/types';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'performance', label: '业绩类', color: 'bg-blue-100 text-blue-700' },
  { value: 'ability', label: '能力类', color: 'bg-green-100 text-green-700' },
  { value: 'attitude', label: '态度类', color: 'bg-orange-100 text-orange-700' },
  { value: 'bonus', label: '加分项', color: 'bg-purple-100 text-purple-700' },
  { value: 'penalty', label: '扣分项', color: 'bg-red-100 text-red-700' }
];

const TYPES = [
  { value: 'quantitative', label: '定量指标' },
  { value: 'qualitative', label: '定性指标' },
  { value: 'composite', label: '综合指标' }
];

export function MetricLibraryManagement() {
  const [activeTab, setActiveTab] = useState('metrics');
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [templates, setTemplates] = useState<MetricTemplate[]>([]);
  const [_loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // 指标表单
  const [showMetricDialog, setShowMetricDialog] = useState(false);
  const [editingMetric, setEditingMetric] = useState<PerformanceMetric | null>(null);
  const [metricForm, setMetricForm] = useState<{
    name: string;
    code: string;
    category: MetricCategory;
    type: MetricType;
    description: string;
    weight: number;
    minValue: number;
    maxValue: number;
    unit: string;
    targetValue: number | undefined;
    formula: string;
    dataSource: string;
    scoringCriteria: { level: ScoreLevel; score: number; description: string }[];
  }>({
    name: '',
    code: '',
    category: 'performance',
    type: 'quantitative',
    description: '',
    weight: 0,
    minValue: 0,
    maxValue: 100,
    unit: '',
    targetValue: undefined,
    formula: '',
    dataSource: '',
    scoringCriteria: [
      { level: 'L1', score: 0.5, description: '' },
      { level: 'L2', score: 0.8, description: '' },
      { level: 'L3', score: 1.0, description: '' },
      { level: 'L4', score: 1.2, description: '' },
      { level: 'L5', score: 1.5, description: '' }
    ]
  });
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, templatesRes] = await Promise.all([
        metricLibraryApi.getAllMetrics(),
        metricLibraryApi.getAllTemplates()
      ]);
      
      if (metricsRes.success) setMetrics(metricsRes.data);
      if (templatesRes.success) setTemplates(templatesRes.data);
    } catch (error: any) {
      toast.error('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveMetric = async () => {
    try {
      if (editingMetric) {
        await metricLibraryApi.updateMetric(editingMetric.id, metricForm);
        toast.success('指标更新成功');
      } else {
        await metricLibraryApi.createMetric(metricForm);
        toast.success('指标创建成功');
      }
      setShowMetricDialog(false);
      setEditingMetric(null);
      resetMetricForm();
      fetchData();
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    }
  };
  
  const handleDeleteMetric = async (id: string) => {
    if (!confirm('确定要删除该指标吗？')) return;
    try {
      await metricLibraryApi.deleteMetric(id);
      toast.success('指标删除成功');
      fetchData();
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };
  
  const handleInitializeDefaults = async () => {
    try {
      await metricLibraryApi.initializeDefaultMetrics();
      toast.success('默认指标初始化成功');
      fetchData();
    } catch (error: any) {
      toast.error('初始化失败: ' + error.message);
    }
  };
  
  const resetMetricForm = () => {
    setMetricForm({
      name: '',
      code: '',
      category: 'performance',
      type: 'quantitative',
      description: '',
      weight: 0,
      minValue: 0,
      maxValue: 100,
      unit: '',
      targetValue: undefined,
      formula: '',
      dataSource: '',
      scoringCriteria: [
        { level: 'L1', score: 0.5, description: '' },
        { level: 'L2', score: 0.8, description: '' },
        { level: 'L3', score: 1.0, description: '' },
        { level: 'L4', score: 1.2, description: '' },
        { level: 'L5', score: 1.5, description: '' }
      ]
    });
  };
  
  const filteredMetrics = metrics.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };
  
  const getCategoryColor = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-100';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">指标库管理</h2>
          <p className="text-gray-500 mt-1">管理考核指标、评分标准和岗位模板</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInitializeDefaults}>
            <Target className="w-4 h-4 mr-2" />
            初始化默认指标
          </Button>
          <Button variant="outline" onClick={() => metricLibraryApi.exportMetrics()}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="metrics">指标库</TabsTrigger>
          <TabsTrigger value="templates">岗位模板</TabsTrigger>
        </TabsList>
        
        {/* 指标库 */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>考核指标列表</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="搜索指标..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-48"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-32">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部分类</SelectItem>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => { resetMetricForm(); setEditingMetric(null); setShowMetricDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    新建指标
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredMetrics.map(metric => (
                  <Card key={metric.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{metric.name}</h4>
                            <Badge className={getCategoryColor(metric.category)}>
                              {getCategoryLabel(metric.category)}
                            </Badge>
                            <Badge variant="outline">
                              {TYPES.find(t => t.value === metric.type)?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{metric.code} · {metric.description}</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-600">权重: <strong>{metric.weight}%</strong></span>
                            <span className="text-gray-600">范围: {metric.minValue} - {metric.maxValue} {metric.unit}</span>
                            {metric.targetValue && (
                              <span className="text-gray-600">目标值: {metric.targetValue}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setEditingMetric(metric);
                              setMetricForm({
                                name: metric.name,
                                code: metric.code,
                                category: metric.category,
                                type: metric.type,
                                description: metric.description,
                                weight: metric.weight,
                                minValue: metric.minValue,
                                maxValue: metric.maxValue,
                                unit: metric.unit || '',
                                targetValue: metric.targetValue,
                                formula: metric.formula || '',
                                dataSource: metric.dataSource || '',
                                scoringCriteria: metric.scoringCriteria || []
                              });
                              setShowMetricDialog(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteMetric(metric.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredMetrics.length === 0 && (
                <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
                  <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无指标数据</p>
                  <Button variant="outline" className="mt-3" onClick={handleInitializeDefaults}>
                    初始化默认指标
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 岗位模板 */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>岗位指标模板</CardTitle>
              <Button onClick={() => toast.info('功能开发中')}>
                <Plus className="w-4 h-4 mr-2" />
                新建模板
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          {template.positionName && (
                            <p className="text-sm text-gray-500">{template.positionName}</p>
                          )}
                        </div>
                        <BookTemplate className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="mt-3 space-y-1">
                        {template.metrics.map((m, idx) => {
                          const metric = metrics.find(metric => metric.id === m.metricId);
                          return (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600">{metric?.name || m.metricId}</span>
                              <span className="font-medium">{m.weight}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {templates.length === 0 && (
                <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
                  <BookTemplate className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无岗位模板</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* 指标表单对话框 */}
      <Dialog open={showMetricDialog} onOpenChange={setShowMetricDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMetric ? '编辑指标' : '新建指标'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>指标名称 *</Label>
                <Input
                  value={metricForm.name}
                  onChange={(e) => setMetricForm({ ...metricForm, name: e.target.value })}
                  placeholder="请输入指标名称"
                />
              </div>
              <div>
                <Label>指标编码 *</Label>
                <Input
                  value={metricForm.code}
                  onChange={(e) => setMetricForm({ ...metricForm, code: e.target.value })}
                  placeholder="请输入指标编码"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>分类 *</Label>
                <Select 
                  value={metricForm.category} 
                  onValueChange={(v: any) => setMetricForm({ ...metricForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>类型 *</Label>
                <Select 
                  value={metricForm.type} 
                  onValueChange={(v: any) => setMetricForm({ ...metricForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>指标描述</Label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={2}
                value={metricForm.description}
                onChange={(e) => setMetricForm({ ...metricForm, description: e.target.value })}
                placeholder="请输入指标描述"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>权重 (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={metricForm.weight}
                  onChange={(e) => setMetricForm({ ...metricForm, weight: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>最小值</Label>
                <Input
                  type="number"
                  value={metricForm.minValue}
                  onChange={(e) => setMetricForm({ ...metricForm, minValue: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>最大值</Label>
                <Input
                  type="number"
                  value={metricForm.maxValue}
                  onChange={(e) => setMetricForm({ ...metricForm, maxValue: parseFloat(e.target.value) || 100 })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>单位</Label>
                <Input
                  value={metricForm.unit}
                  onChange={(e) => setMetricForm({ ...metricForm, unit: e.target.value })}
                  placeholder="例如：%、个、分"
                />
              </div>
              <div>
                <Label>目标值</Label>
                <Input
                  type="number"
                  value={metricForm.targetValue || ''}
                  onChange={(e) => setMetricForm({ ...metricForm, targetValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="选填"
                />
              </div>
            </div>
            
            <div>
              <Label>计算公式</Label>
              <Input
                value={metricForm.formula}
                onChange={(e) => setMetricForm({ ...metricForm, formula: e.target.value })}
                placeholder="例如：完成率 = 实际完成数 / 计划完成数 * 100%"
              />
            </div>
            
            <div>
              <Label>数据来源</Label>
              <Input
                value={metricForm.dataSource}
                onChange={(e) => setMetricForm({ ...metricForm, dataSource: e.target.value })}
                placeholder="例如：项目管理系统、ERP系统"
              />
            </div>
            
            <div>
              <Label className="text-base font-semibold">评分标准</Label>
              <div className="mt-2 space-y-2">
                {metricForm.scoringCriteria.map((criterion, idx) => (
                  <div key={criterion.level} className="flex gap-2 items-start">
                    <Badge className="mt-2">{criterion.level}</Badge>
                    <Input
                      type="number"
                      step="0.1"
                      className="w-20"
                      value={criterion.score}
                      onChange={(e) => {
                        const newCriteria = [...metricForm.scoringCriteria];
                        newCriteria[idx] = { ...criterion, score: parseFloat(e.target.value) || 0 };
                        setMetricForm({ ...metricForm, scoringCriteria: newCriteria });
                      }}
                    />
                    <Input
                      className="flex-1"
                      placeholder="评分标准描述"
                      value={criterion.description}
                      onChange={(e) => {
                        const newCriteria = [...metricForm.scoringCriteria];
                        newCriteria[idx] = { ...criterion, description: e.target.value };
                        setMetricForm({ ...metricForm, scoringCriteria: newCriteria });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveMetric} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              <Button variant="outline" onClick={() => setShowMetricDialog(false)}>
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MetricLibraryManagement;
