import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Edit, Trash2, Copy, Eye, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { assessmentTemplateApi } from '@/services/api';
import { TemplateEditor } from './TemplateEditor';
import { useAuthStore } from '@/stores/authStore';

const DEPARTMENT_TYPES = [
  { value: 'sales', label: '销售类', color: 'bg-green-100 text-green-700', icon: '💰' },
  { value: 'engineering', label: '工程类', color: 'bg-blue-100 text-blue-700', icon: '🔧' },
  { value: 'manufacturing', label: '生产类', color: 'bg-orange-100 text-orange-700', icon: '🏭' },
  { value: 'support', label: '支持类', color: 'bg-purple-100 text-purple-700', icon: '📋' },
  { value: 'management', label: '管理类', color: 'bg-red-100 text-red-700', icon: '👔' }
];

interface TemplateGroupDefinition {
  key: string;
  label: string;
  hint: string;
  patterns?: RegExp[];
  fallback?: boolean;
  hiddenWhenEmpty?: boolean;
}

interface TemplateGroupConfig {
  icon: string;
  emptyText: string;
  groups: TemplateGroupDefinition[];
}

const TEMPLATE_LEVEL_SLOTS = [
  { key: 'standard', label: '标准模板', hint: '岗位默认/兜底模板' },
  { key: 'junior', label: '初级模板', hint: 'L1-L2/助理、初级' },
  { key: 'intermediate', label: '中级模板', hint: 'L3/可独立承担工作' },
  { key: 'senior', label: '高级模板', hint: 'L4+/高级、主管、专家' },
] as const;

type TemplateLevelSlotKey = typeof TEMPLATE_LEVEL_SLOTS[number]['key'];

const GROUPED_TEMPLATE_CONFIG: Record<string, TemplateGroupConfig> = {
  engineering: {
    icon: '🔧',
    emptyText: '当前还没有该岗位的考核模板。后续可按这个岗位新增模板，并填写适用岗位和任职等级。',
    groups: [
      { key: 'mechanical', label: '机械工程师', hint: '机械设计、3D、机构方案', patterns: [/机械|3D|mech/i] },
      { key: 'electrical', label: '电气工程师 / PLC', hint: '电气设计、PLC、自动化控制', patterns: [/电气|PLC|自动化|elec/i] },
      { key: 'testing', label: '测试/调试工程师', hint: '测试、现场调试、验证交付', patterns: [/测试|调试|debug/i] },
      { key: 'hardware', label: '硬件工程师', hint: '硬件设计、板卡、电路', patterns: [/硬件|电路|板卡|hardware/i] },
      { key: 'software', label: '软件工程师', hint: '上位机、视觉、算法、软件开发', patterns: [/软件|视觉|上位机|算法|software|sw/i] },
      { key: 'presales', label: '售前技术工程师', hint: '方案评估、售前技术支持', patterns: [/售前|方案评估|方案支持|presales/i] },
      { key: 'project', label: '项目工程师 / 项目经理', hint: '项目交付、计划、协调', patterns: [/项目|交付|pm/i] },
      { key: 'general', label: '未归类工程模板', hint: '仅用于承接暂时无法匹配到具体岗位的模板，不作为岗位显示', fallback: true, hiddenWhenEmpty: true },
    ],
  },
  manufacturing: {
    icon: '🏭',
    emptyText: '当前还没有该生产岗位组的考核模板。后续可按接线组、钳工组、电工组新增对应模板。',
    groups: [
      { key: 'wiring', label: '接线组', hint: '接线、配线、布线、线束、电控柜接线', patterns: [/接线|配线|布线|线束|电控柜|电箱|wiring/i] },
      { key: 'fitter', label: '钳工组', hint: '钳工、装配、机械装配、设备组装', patterns: [/钳工|装配|机械装配|设备组装|组装|fitter|assembly/i] },
      { key: 'electrician', label: '电工组', hint: '电工、电气安装、电气装配、现场电气整改', patterns: [/电工|电气安装|电气装配|电气整改|electrician/i] },
      { key: 'general', label: '未归类生产模板', hint: '仅用于承接暂时无法匹配到具体生产岗位的模板，不作为岗位显示', fallback: true, hiddenWhenEmpty: true },
    ],
  },
  support: {
    icon: '📋',
    emptyText: '当前还没有该支持岗位的考核模板。后续可按采购、质量、售后、人事行政财务等岗位新增模板。',
    groups: [
      { key: 'purchase', label: '采购/供应链', hint: '交期、成本、供应商、急单响应', patterns: [/采购|供应链|供应商|purch/i] },
      { key: 'quality', label: '质量/体系', hint: '质量检验、体系建设、客诉处理、改进闭环', patterns: [/质量|品质|QA|QC|体系|客诉|检验/i] },
      { key: 'service', label: '售后/客服', hint: '售后响应、客户满意度、问题闭环', patterns: [/售后|客服|客户服务|service/i] },
      { key: 'hr-admin-finance', label: '人事/行政/财务支持', hint: '人事行政、财务、后勤等职能支持', patterns: [/人事|行政|财务|HR|后勤|support/i] },
      { key: 'general', label: '未归类支持模板', hint: '仅用于承接暂时无法匹配到具体支持岗位的模板，不作为岗位显示', fallback: true, hiddenWhenEmpty: true },
    ],
  },
};

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
  createdBy?: string;
  createdAt: string;
  applicableRoles?: string[];
  applicableLevels?: string[];
  applicablePositions?: string[];
  metrics?: Metric[];
}

interface AssessmentTemplatesProps {
  mode?: 'hr' | 'manager';
}

function getTemplateSearchContent(template: Template) {
  return [
    template.id,
    template.name,
    template.description || '',
    ...(template.applicablePositions || []),
  ].join(' ');
}

function getTemplateGroupKey(template: Template, groups: TemplateGroupDefinition[]) {
  const content = getTemplateSearchContent(template);
  const matchedGroup = groups.find((group) =>
    group.patterns?.some((pattern) => pattern.test(content))
  );

  if (matchedGroup) return matchedGroup.key;
  return groups.find((group) => group.fallback)?.key || groups[groups.length - 1]?.key;
}

function buildTemplateGroups(templates: Template[], config: TemplateGroupConfig) {
  const map = new Map<string, Template[]>(
    config.groups.map((group) => [group.key, []])
  );

  templates.forEach((template) => {
    const groupKey = getTemplateGroupKey(template, config.groups);
    map.get(groupKey)?.push(template);
  });

  return config.groups.map((group) => ({
    ...group,
    templates: map.get(group.key) || [],
  }));
}

function getTemplateLevelSlotKey(template: Template): TemplateLevelSlotKey {
  const content = getTemplateSearchContent(template);
  const levels = template.applicableLevels || [];

  if (template.isDefault || levels.length === 0) return 'standard';
  if (levels.some((level) => ['assistant', 'junior'].includes(level)) || /初级|助理|实习|学徒|junior/i.test(content)) {
    return 'junior';
  }
  if (levels.includes('intermediate') || /中级|intermediate/i.test(content)) {
    return 'intermediate';
  }
  if (levels.some((level) => ['senior', 'manager'].includes(level)) || /高级|主管|经理|专家|senior/i.test(content)) {
    return 'senior';
  }

  return 'standard';
}

function buildLevelSlots(templates: Template[]) {
  const map = new Map<TemplateLevelSlotKey, Template[]>(
    TEMPLATE_LEVEL_SLOTS.map((slot) => [slot.key, []])
  );

  templates.forEach((template) => {
    const slotKey = getTemplateLevelSlotKey(template);
    map.get(slotKey)?.push(template);
  });

  return TEMPLATE_LEVEL_SLOTS.map((slot) => ({
    ...slot,
    templates: map.get(slot.key) || [],
  }));
}

export function AssessmentTemplates({ mode = 'hr' }: AssessmentTemplatesProps) {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const result = await assessmentTemplateApi.getAll({ includeMetrics: true, status: 'active' });

      if (result.success) {
        setTemplates(result.data || []);
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
      await assessmentTemplateApi.delete(id);
      toast.success('模板已删除');
      loadTemplates();
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
    if (mode === 'manager' && (template.createdBy !== user?.id || template.isDefault)) {
      toast.info('经理建议先复制模板，再编辑自己的模板版本');
      return;
    }
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

  const getLevelLabels = (levels?: string[]) => {
    const map: Record<string, string> = {
      assistant: 'L1/助理',
      junior: 'L2/初级',
      intermediate: 'L3/中级',
      senior: 'L4+/高级',
      manager: 'M1+/经理',
    };
    return (levels || []).map((level) => map[level] || level);
  };

  const filteredTemplates = useMemo(() => {
    if (filterType === 'all') return templates;
    return templates.filter((template) => template.departmentType === filterType);
  }, [filterType, templates]);

  const ungroupedTemplates = useMemo(
    () => filteredTemplates.filter((template) => !GROUPED_TEMPLATE_CONFIG[template.departmentType]),
    [filteredTemplates]
  );

  const groupedTemplateSections = useMemo(() => {
    return Object.entries(GROUPED_TEMPLATE_CONFIG)
      .map(([departmentType, config]) => {
        const departmentTemplates = filteredTemplates.filter(
          (template) => template.departmentType === departmentType
        );

        return {
          departmentType,
          config,
          typeConfig: getTypeConfig(departmentType),
          total: departmentTemplates.length,
          groups: buildTemplateGroups(departmentTemplates, config),
        };
      })
      .filter((section) => section.departmentType === filterType || section.total > 0);
  }, [filteredTemplates, filterType]);

  const templateCounts = useMemo(() => {
    return DEPARTMENT_TYPES.reduce<Record<string, number>>((acc, type) => {
      acc[type.value] = templates.filter((template) => template.departmentType === type.value).length;
      return acc;
    }, {});
  }, [templates]);

  const renderTemplateCard = (template: Template) => {
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
              <div className="flex flex-wrap gap-2 mt-2">
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
                {mode === 'manager' && template.createdBy === user?.id && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    我的模板
                  </Badge>
                )}
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

          <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <div>
              <span className="font-medium text-gray-800">任职等级：</span>
              {getLevelLabels(template.applicableLevels).length > 0
                ? getLevelLabels(template.applicableLevels).join('、')
                : '部门类型兜底'}
            </div>
            <div>
              <span className="font-medium text-gray-800">适用岗位：</span>
              {template.applicablePositions && template.applicablePositions.length > 0
                ? template.applicablePositions.slice(0, 4).join('、') + (template.applicablePositions.length > 4 ? '…' : '')
                : '未限定岗位'}
            </div>
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
              disabled={mode === 'manager' && (template.createdBy !== user?.id || template.isDefault)}
            >
              <Edit className="w-3 h-3 mr-1" />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(template)}
              aria-label={`复制模板 ${template.name}`}
            >
              <Copy className="w-3 h-3" />
            </Button>
            {(!template.isDefault && mode !== 'manager') || (mode === 'manager' && template.createdBy === user?.id && !template.isDefault) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(template.id)}
                aria-label={`删除模板 ${template.name}`}
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTemplateLevelSlots = (templatesInGroup: Template[]) => {
    const levelSlots = buildLevelSlots(templatesInGroup);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {levelSlots.map((slot) => (
          <div key={slot.key} className="rounded-xl border bg-white/70 p-3">
            <div className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-gray-900">{slot.label}</div>
                <Badge variant="outline">{slot.templates.length}</Badge>
              </div>
              <div className="mt-1 text-xs text-gray-500">{slot.hint}</div>
            </div>

            {slot.templates.length > 0 ? (
              <div className="space-y-3">
                {slot.templates.map(renderTemplateCard)}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-gray-50 p-4 text-center text-sm text-gray-500">
                未配置{slot.label}
              </div>
            )}
          </div>
        ))}
      </div>
    );
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
          <p className="text-gray-500 mt-1">
            {mode === 'manager'
              ? '经理可以复制标准模板，形成自己的部门模板版本，再绑定给本团队使用。'
              : '按岗位序列和任职资格等级维护考核模板，系统生成任务时自动匹配员工'}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {mode === 'manager' ? '创建自定义模板' : '创建模板'}
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
          const count = templateCounts[type.value] || 0;
          return (
            <Button
              key={type.value}
              variant={filterType === type.value ? 'default' : 'outline'}
              onClick={() => setFilterType(type.value)}
              size="sm"
              aria-label={`筛选${type.label}模板`}
            >
              {type.icon} {type.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* 模板列表 */}
      <div className="space-y-6">
        {ungroupedTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ungroupedTemplates.map(renderTemplateCard)}
          </div>
        )}

        {groupedTemplateSections.map((section) => {
          const visibleGroups = section.groups.filter(
            (group) => !group.hiddenWhenEmpty || group.templates.length > 0
          );
          const groupsToRender = section.departmentType === filterType
            ? visibleGroups
            : visibleGroups.filter((group) => group.templates.length > 0);

          return (
            <div key={section.departmentType} className="space-y-5">
              {groupsToRender.map((group) => (
                <Card key={`${section.departmentType}-${group.key}`} className="border-blue-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base flex flex-wrap items-center gap-2">
                          <span>{section.config.icon}</span>
                          {group.label}
                          <Badge className={section.typeConfig.color}>{section.typeConfig.label}</Badge>
                          <Badge variant="outline">{group.templates.length} 个模板</Badge>
                        </CardTitle>
                        <p className="mt-1 text-sm text-gray-500">{group.hint}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {group.templates.length === 0 ? (
                      <div className="mb-4 rounded-lg border border-dashed bg-gray-50 p-4 text-sm text-gray-500">
                        {section.config.emptyText}
                      </div>
                    ) : null}
                    {renderTemplateLevelSlots(group.templates)}
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{filterType === 'all' ? '暂无模板' : '当前分类下暂无模板'}</p>
            {filterType === 'all' ? (
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                创建第一个模板
              </Button>
            ) : null}
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
            managerMode={mode === 'manager'}
            onSave={handleSave}
            onCancel={() => setShowEditor(false)}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
