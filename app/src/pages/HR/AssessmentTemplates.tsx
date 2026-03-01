import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Edit, Trash2, Copy, Eye, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { TemplateEditor } from './TemplateEditor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEPARTMENT_TYPES = [
  { value: 'sales', label: '销售类', color: 'bg-green-100 text-green-700', icon: '💰' },
  { value: 'engineering', label: '工程类', color: 'bg-blue-100 text-blue-700', icon: '🔧' },
  { value: 'manufacturing', label: '生产类', color: 'bg-orange-100 text-orange-700', icon: '🏭' },
  { value: 'support', label: '支持类', color: 'bg-purple-100 text-purple-700', icon: '📋' },
  { value: 'management', label: '管理类', color: 'bg-red-100 text-red-700', icon: '👔' }
];

interface Metric {
  id: string;
  metricName: string;
  metricCode: string;
  weight: number;
  category: string;
  evaluationType: 'quantitative' | 'qualitative';
}

interface Template {
  id: string;
  name: string;
  description?: string;
  departmentType: string;
  isDefault: boolean;
  status: string;
  createdAt: string;
  metrics?: Metric[];
}

export function AssessmentTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadTemplates();
  }, [filterType]);

  const loadTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('departmentType', filterType);
      params.append('includeMetrics', 'true');
      
      const response = await fetch(`${API_URL}/api/assessment-templates?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTemplates(result.data || []);
        }
      }
    } catch (error) {
      console.error('加载模板失败:', error);
      toast.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const response = await fetch(`${API_URL}/api/assessment-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        toast.success('模板已删除');
        loadTemplates();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      console.error('删除模板失败:', error);
      toast.error('删除失败');
    }
  };

  const handleCopy = async (template: Template) => {
    const newTemplate = {
      ...template,
      name: `${template.name} (副本)`,
      isDefault: false,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };

    setSelectedTemplate(newTemplate as any);
    setViewMode(false);
    setShowEditor(true);
  };

  const handleView = (template: Template) => {
    setSelectedTemplate(template);
    setViewMode(true);
    setShowEditor(true);
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setViewMode(false);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setViewMode(false);
    setShowEditor(true);
  };

  const handleSave = () => {
    setShowEditor(false);
    setSelectedTemplate(null);
    loadTemplates();
  };

  const getTypeConfig = (type: string) => {
    return DEPARTMENT_TYPES.find(t => t.value === type) || DEPARTMENT_TYPES[3];
  };

  const getMetricsSummary = (metrics?: Metric[]) => {
    if (!metrics || metrics.length === 0) return '无指标';
    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    return `${metrics.length} 个指标 (总权重: ${totalWeight.toFixed(0)}%)`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">考核模板管理</h2>
          <p className="text-gray-500 mt-1">管理不同部门类型的考核指标模板</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          创建模板
        </Button>
      </div>

      {/* 筛选器 */}
      <div className="flex gap-2">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterType('all')}
          size="sm"
        >
          全部 ({templates.length})
        </Button>
        {DEPARTMENT_TYPES.map(type => {
          const count = templates.filter(t => t.departmentType === type.value).length;
          return (
            <Button
              key={type.value}
              variant={filterType === type.value ? 'default' : 'outline'}
              onClick={() => setFilterType(type.value)}
              size="sm"
            >
              {type.icon} {type.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => {
          const typeConfig = getTypeConfig(template.departmentType);
          
          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{typeConfig.icon}</span>
                      {template.name}
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                      {template.isDefault && (
                        <Badge className="bg-blue-100 text-blue-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          默认
                        </Badge>
                      )}
                      <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                        {template.status === 'active' ? '启用' : '归档'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description || '暂无描述'}
                </p>
                
                <div className="text-sm text-gray-500 mb-4">
                  {getMetricsSummary(template.metrics)}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(template)}
                    className="flex-1"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    查看
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(template)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  {!template.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {templates.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无模板</p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              创建第一个模板
            </Button>
          </div>
        </Card>
      )}

      {/* 模板编辑器对话框 */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewMode ? '查看模板' : selectedTemplate ? '编辑模板' : '创建模板'}
            </DialogTitle>
          </DialogHeader>
          <TemplateEditor
            template={selectedTemplate}
            viewMode={viewMode}
            onSave={handleSave}
            onCancel={() => setShowEditor(false)}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
