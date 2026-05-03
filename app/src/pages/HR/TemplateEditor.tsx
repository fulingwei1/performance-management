import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { assessmentTemplateApi } from '@/services/api';

const DEPARTMENT_TYPES = [
  { value: 'sales', label: '销售类', icon: '💰' },
  { value: 'engineering', label: '工程类', icon: '🔧' },
  { value: 'manufacturing', label: '生产类', icon: '🏭' },
  { value: 'support', label: '支持类', icon: '📋' },
  { value: 'management', label: '管理类', icon: '👔' }
];

const CATEGORIES = [
  { value: 'performance', label: '绩效指标' },
  { value: 'behavior', label: '行为指标' },
  { value: 'innovation', label: '创新指标' },
  { value: 'collaboration', label: '协作指标' }
];

const QUALIFICATION_LEVELS = [
  { value: 'assistant', label: 'L1/助理/实习' },
  { value: 'junior', label: 'L2/初级' },
  { value: 'intermediate', label: 'L3/中级' },
  { value: 'senior', label: 'L4+/高级' },
  { value: 'manager', label: 'M1+/主管/经理' },
];

const ROLE_OPTIONS = [
  { value: 'employee', label: '员工' },
  { value: 'manager', label: '部门经理' },
];

interface Metric {
  id?: string;
  metricName: string;
  metricCode: string;
  category: string;
  weight: number;
  description?: string;
  evaluationType: 'quantitative' | 'qualitative';
  sortOrder: number;
  scoringCriteria?: ScoringCriterion[];
}

interface ScoringCriterion {
  id?: string;
  level: string;
  score: number;
  description: string;
  minValue?: number;
  maxValue?: number;
}

interface Template {
  id?: string;
  name: string;
  description?: string;
  departmentType: string;
  isDefault: boolean;
  status: string;
  applicableRoles?: string[];
  applicableLevels?: string[];
  applicablePositions?: string[];
  priority?: number;
  metrics?: Metric[];
}

interface TemplateEditorProps {
  template: Template | null;
  viewMode: boolean;
  managerMode?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const DEFAULT_SCORING_CRITERIA: ScoringCriterion[] = [
  { level: 'L1', score: 0.5, description: '不合格：结果明显低于要求，影响工作交付，需要重点辅导和限期改进' },
  { level: 'L2', score: 0.8, description: '待改进：部分达到要求，但质量、进度或主动性存在明显不足' },
  { level: 'L3', score: 1.0, description: '合格：基本达到岗位要求和本月目标，工作结果稳定可接受' },
  { level: 'L4', score: 1.2, description: '良好：超过岗位要求，能主动推动问题解决，交付质量较高' },
  { level: 'L5', score: 1.5, description: '优秀：显著超出预期，形成标杆成果或可复用经验，对团队有明显贡献' },
];

function ensureScoringCriteria(metric: Partial<Metric>): ScoringCriterion[] {
  const criteriaByLevel = new Map(
    (metric.scoringCriteria || []).map((criterion) => [criterion.level, criterion])
  );

  return DEFAULT_SCORING_CRITERIA.map((defaultCriterion) => ({
    ...defaultCriterion,
    ...criteriaByLevel.get(defaultCriterion.level),
    score: Number(criteriaByLevel.get(defaultCriterion.level)?.score ?? defaultCriterion.score),
    description: criteriaByLevel.get(defaultCriterion.level)?.description || defaultCriterion.description,
  }));
}

function normalizeMetrics(metrics: Metric[] = []): Metric[] {
  return metrics.map((metric, index) => ({
    ...metric,
    sortOrder: metric.sortOrder ?? index,
    scoringCriteria: ensureScoringCriteria(metric),
  }));
}

function toggleArrayValue(values: string[] = [], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function parsePositionInput(value: string): string[] {
  return value
    .split(/[，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPositions(values?: string[]): string {
  return (values || []).join('，');
}

export function TemplateEditor({ template, viewMode, managerMode = false, onSave, onCancel }: TemplateEditorProps) {
  const [formData, setFormData] = useState<Template>({
    name: '',
    description: '',
    departmentType: 'support',
    isDefault: false,
    status: 'active',
    metrics: []
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        ...template,
        metrics: normalizeMetrics(template.metrics || [])
      });
    } else {
      setFormData({
        name: '',
        description: '',
        departmentType: 'support',
        isDefault: false,
        status: 'active',
        metrics: []
      });
    }
  }, [template]);

  const handleAddMetric = () => {
    const newMetric: Metric = {
      metricName: '',
      metricCode: '',
      category: 'performance',
      weight: 10,
      evaluationType: 'quantitative',
      sortOrder: formData.metrics?.length || 0,
      scoringCriteria: ensureScoringCriteria({})
    };
    
    setFormData({
      ...formData,
      metrics: [...(formData.metrics || []), newMetric]
    });
  };

  const handleUpdateMetric = (index: number, field: keyof Metric, value: any) => {
    const newMetrics = [...(formData.metrics || [])];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    setFormData({ ...formData, metrics: newMetrics });
  };

  const handleUpdateScoringCriterion = (metricIndex: number, level: string, description: string) => {
    const newMetrics = [...(formData.metrics || [])];
    const currentMetric = newMetrics[metricIndex];
    const scoringCriteria = ensureScoringCriteria(currentMetric).map((criterion) => (
      criterion.level === level ? { ...criterion, description } : criterion
    ));
    newMetrics[metricIndex] = { ...currentMetric, scoringCriteria };
    setFormData({ ...formData, metrics: newMetrics });
  };

  const handleDeleteMetric = (index: number) => {
    const newMetrics = formData.metrics?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, metrics: newMetrics });
  };

  const handleMoveMetric = (index: number, direction: 'up' | 'down') => {
    if (!formData.metrics) return;
    
    const newMetrics = [...formData.metrics];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newMetrics.length) return;
    
    [newMetrics[index], newMetrics[targetIndex]] = [newMetrics[targetIndex], newMetrics[index]];
    
    // 更新 sortOrder
    newMetrics.forEach((metric, idx) => {
      metric.sortOrder = idx;
    });
    
    setFormData({ ...formData, metrics: newMetrics });
  };

  const getTotalWeight = () => {
    return formData.metrics?.reduce((sum, m) => sum + (m.weight || 0), 0) || 0;
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('请输入模板名称');
      return false;
    }
    
    if (!formData.metrics || formData.metrics.length === 0) {
      toast.error('请至少添加一个考核指标');
      return false;
    }
    
    const totalWeight = getTotalWeight();
    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error(`权重总和必须为100%，当前为${totalWeight.toFixed(1)}%`);
      return false;
    }
    
    for (const metric of formData.metrics) {
      if (!metric.metricName.trim()) {
        toast.error('指标名称不能为空');
        return false;
      }
      if (!metric.metricCode.trim()) {
        toast.error('指标代码不能为空');
        return false;
      }
      const incompleteCriteria = ensureScoringCriteria(metric).some((criterion) => !criterion.description.trim());
      if (incompleteCriteria) {
        toast.error(`${metric.metricName || '指标'} 的 L1-L5 评分描述不能为空`);
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    
    try {
      const payload = {
        ...formData,
        metrics: normalizeMetrics(formData.metrics || []),
      };

      if (template?.id) {
        await assessmentTemplateApi.update(template.id, payload as unknown as Record<string, unknown>);
      } else {
        await assessmentTemplateApi.create(payload as unknown as Record<string, unknown>);
      }
      toast.success(template?.id ? '模板已更新' : '模板已创建');
      onSave();
    } catch (error) {
      console.error('保存模板失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = getTotalWeight();
  const weightColor = Math.abs(totalWeight - 100) < 0.01 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <h3 className="font-medium text-lg">基本信息</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>模板名称 *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={viewMode}
              placeholder="如：销售部门标准模板"
            />
          </div>
          
          <div>
            <Label>部门类型 *</Label>
            <Select
              value={formData.departmentType}
              onValueChange={(value) => setFormData({ ...formData, departmentType: value })}
              disabled={viewMode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label>描述</Label>
          <Input
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            disabled={viewMode}
            placeholder="模板的使用说明"
          />
        </div>

        <div className="rounded-lg border bg-blue-50/50 p-4">
          <div className="mb-3">
            <h4 className="font-medium text-sm">任职资格适用范围</h4>
            <p className="mt-1 text-xs text-gray-500">
              系统生成考核任务时，会优先按员工档案里的“岗位 + 任职资格等级”匹配模板；部门模板只作为特殊覆盖。
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs">适用等级</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUALIFICATION_LEVELS.map((level) => (
                  <Button
                    key={level.value}
                    type="button"
                    variant={(formData.applicableLevels || []).includes(level.value) ? 'default' : 'outline'}
                    size="sm"
                    disabled={viewMode}
                    onClick={() => setFormData({
                      ...formData,
                      applicableLevels: toggleArrayValue(formData.applicableLevels, level.value),
                    })}
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">适用角色</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <Button
                    key={role.value}
                    type="button"
                    variant={(formData.applicableRoles || []).includes(role.value) ? 'default' : 'outline'}
                    size="sm"
                    disabled={viewMode || (managerMode && role.value !== 'manager')}
                    onClick={() => setFormData({
                      ...formData,
                      applicableRoles: toggleArrayValue(formData.applicableRoles, role.value),
                    })}
                  >
                    {role.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">适用岗位</Label>
              <Input
                value={formatPositions(formData.applicablePositions)}
                onChange={(event) => setFormData({
                  ...formData,
                  applicablePositions: parsePositionInput(event.target.value),
                })}
                disabled={viewMode}
                placeholder="如：销售工程师，销售助理，大客户经理"
              />
              <div className="mt-1 text-xs text-gray-500">
                多个岗位用逗号隔开；留空表示仅按部门类型/等级兜底。
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              disabled={viewMode || managerMode}
            />
            <Label>{managerMode ? '经理创建的模板默认不设为全局默认模板' : '设为默认模板'}</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'archived' })}
              disabled={viewMode}
            />
            <Label>启用</Label>
          </div>
        </div>
      </div>

      {/* 考核指标 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-lg">考核指标</h3>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${weightColor}`}>
              总权重: {totalWeight.toFixed(1)}%
            </span>
            {!viewMode && (
              <Button onClick={handleAddMetric} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                添加指标
              </Button>
            )}
          </div>
        </div>

        {formData.metrics && formData.metrics.length > 0 ? (
          <div className="space-y-3">
            {formData.metrics.map((metric, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                {(() => {
                  const scoringCriteria = ensureScoringCriteria(metric);
                  return (
                <div className="grid grid-cols-12 gap-3">
                  {/* 排序 */}
                  {!viewMode && (
                    <div className="col-span-1 flex flex-col gap-1 justify-center">
                      <button
                        onClick={() => handleMoveMetric(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <GripVertical className="w-4 h-4 mx-auto text-gray-400" />
                      <button
                        onClick={() => handleMoveMetric(index, 'down')}
                        disabled={index === formData.metrics!.length - 1}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                  
                  {/* 指标信息 */}
                  <div className={viewMode ? 'col-span-12' : 'col-span-11'}>
                    <div className="grid grid-cols-12 gap-3">
                      {/* 指标名称 */}
                      <div className="col-span-3">
                        <Label className="text-xs">指标名称 *</Label>
                        <Input
                          value={metric.metricName}
                          onChange={(e) => handleUpdateMetric(index, 'metricName', e.target.value)}
                          disabled={viewMode}
                          placeholder="如：销售额完成率"
                          size="sm"
                        />
                      </div>
                      
                      {/* 指标代码 */}
                      <div className="col-span-2">
                        <Label className="text-xs">代码 *</Label>
                        <Input
                          value={metric.metricCode}
                          onChange={(e) => handleUpdateMetric(index, 'metricCode', e.target.value.toUpperCase())}
                          disabled={viewMode}
                          placeholder="SALES_RATE"
                          size="sm"
                        />
                      </div>
                      
                      {/* 分类 */}
                      <div className="col-span-2">
                        <Label className="text-xs">分类</Label>
                        <Select
                          value={metric.category}
                          onValueChange={(value) => handleUpdateMetric(index, 'category', value)}
                          disabled={viewMode}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* 权重 */}
                      <div className="col-span-1">
                        <Label className="text-xs">权重(%)</Label>
                        <Input
                          type="number"
                          value={metric.weight}
                          onChange={(e) => handleUpdateMetric(index, 'weight', parseFloat(e.target.value) || 0)}
                          disabled={viewMode}
                          min="0"
                          max="100"
                          step="0.1"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      {/* 评估类型 */}
                      <div className="col-span-2">
                        <Label className="text-xs">评估类型</Label>
                        <Select
                          value={metric.evaluationType}
                          onValueChange={(value: any) => handleUpdateMetric(index, 'evaluationType', value)}
                          disabled={viewMode}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quantitative">量化</SelectItem>
                            <SelectItem value="qualitative">定性</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* 删除按钮 */}
                      {!viewMode && (
                        <div className="col-span-2 flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMetric(index)}
                            className="w-full h-8"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* 描述 */}
                    <div className="mt-2">
                      <Label className="text-xs">说明</Label>
                      <Input
                        value={metric.description || ''}
                        onChange={(e) => handleUpdateMetric(index, 'description', e.target.value)}
                        disabled={viewMode}
                        placeholder="如：实际销售额/目标销售额"
                        size="sm"
                      />
                    </div>

                    <div className="mt-3 rounded-lg border bg-white p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">L1-L5 评分描述</Label>
                        <Badge variant="outline" className="text-xs">系数 0.5 / 0.8 / 1.0 / 1.2 / 1.5</Badge>
                      </div>
                      <div className="space-y-2">
                        {scoringCriteria.map((criterion) => (
                          <div key={criterion.level} className="grid grid-cols-[80px_1fr] gap-2 items-center">
                            <div className="flex items-center gap-2">
                              <Badge variant={criterion.level === 'L3' ? 'default' : 'secondary'}>
                                {criterion.level}
                              </Badge>
                              <span className="text-xs text-gray-500">{criterion.score.toFixed(1)}</span>
                            </div>
                            <Input
                              value={criterion.description}
                              onChange={(event) => handleUpdateScoringCriterion(index, criterion.level, event.target.value)}
                              disabled={viewMode}
                              className="h-8 text-sm"
                              placeholder={`${criterion.level} 对应的评价描述`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                  );
                })()}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            暂无指标，点击"添加指标"开始配置
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {!viewMode && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <X className="w-4 h-4 mr-1" />
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      )}
      
      {viewMode && (
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            关闭
          </Button>
        </div>
      )}
    </div>
  );
}
