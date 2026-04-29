import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, CheckCircle, Save, BarChart3, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { assessmentTemplateApi, levelTemplateRuleApi } from '@/services/api';

// 部门类型定义
const DEPARTMENT_TYPES = [
  { key: 'engineering', label: '工程技术', departments: ['工程技术中心'] },
  { key: 'manufacturing', label: '生产制造', departments: ['制造中心'] },
  { key: 'sales', label: '销售营销', departments: ['营销中心'] },
  { key: 'support', label: '职能支持', departments: ['人力行政部', '财务部', '采购部', '项目管理部', '教育装备事业部', '总经办'] },
  { key: 'management', label: '管理层', departments: ['总经办', '总公司'] },
];

const LEVELS = [
  { key: 'junior', label: '初级/普通员工' },
  { key: 'senior', label: '高级/主管' },
];

interface Template {
  id: string;
  name: string;
  departmentType: string;
  description?: string;
}

interface Rule {
  id: string;
  departmentType: string;
  level: string;
  templateId: string;
  templateName: string;
}

export default function TemplateAssignment() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // 规则编辑状态: `${departmentType}:${level}` -> templateId
  const [editState, setEditState] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tplRes, rulesRes] = await Promise.all([
        assessmentTemplateApi.getAll({ includeMetrics: false }),
        levelTemplateRuleApi.getAllRules()
      ]);
      if (tplRes.success) setTemplates(tplRes.data || []);
      if (rulesRes.success) {
        const ruleList = rulesRes.data || [];
        setRules(ruleList);
        // 初始化编辑状态
        const state: Record<string, string> = {};
        ruleList.forEach((r: Rule) => {
          state[`${r.departmentType}:${r.level}`] = r.templateId;
        });
        setEditState(state);
      }
    } catch (e) {
      toast.error('加载失败: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  const getTemplatesForDeptType = (deptType: string) =>
    templates.filter(t => t.departmentType === deptType);

  const getCurrentRule = (deptType: string, level: string) =>
    rules.find(r => r.departmentType === deptType && r.level === level);

  const handleSelect = (deptType: string, level: string, templateId: string) => {
    setEditState(prev => ({ ...prev, [`${deptType}:${level}`]: templateId }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 收集所有已选择的规则
      const rulesToSave = Object.entries(editState)
        .filter(([, templateId]) => templateId)
        .map(([key, templateId]) => {
          const [deptType, level] = key.split(':');
          return { departmentType: deptType, level, templateId };
        });

      if (rulesToSave.length === 0) {
        toast.error('请至少设置一条规则');
        return;
      }

      const result = await levelTemplateRuleApi.batchSetRules(rulesToSave);
      if (result.success) {
        toast.success(`保存成功，已设置 ${rulesToSave.length} 条规则`);
        await loadData();
      }
    } catch (e) {
      toast.error('保存失败: ' + String(e));
    } finally {
      setSaving(false);
    }
  };

  const getRuleSourceIcon = (deptType: string, level: string) => {
    const hasRule = getCurrentRule(deptType, level);
    const hasEdit = editState[`${deptType}:${level}`];
    if (hasRule) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (hasEdit) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <AlertTriangle className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">模板规则配置</h1>
            <p className="text-muted-foreground mt-1">
              按「部门类型 × 层级」设置考核模板，设置后自动覆盖所有匹配员工
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存所有规则'}
          </button>
        </div>
      </motion.div>

      {/* 规则表格 */}
      <div className="space-y-4">
        {DEPARTMENT_TYPES.map(dept => (
          <motion.div key={dept.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  {dept.label}
                  <span className="text-xs text-muted-foreground">
                    ({dept.departments.join('、')})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LEVELS.map(level => {
                    const key = `${dept.key}:${level.key}`;
                    const currentRule = getCurrentRule(dept.key, level.key);
                    const selectedTemplate = editState[key];
                    const availableTemplates = getTemplatesForDeptType(dept.key);

                    return (
                      <div key={key} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                        {getRuleSourceIcon(dept.key, level.key)}
                        <div className="flex-1">
                          <div className="text-sm font-medium mb-1">{level.label}</div>
                          <Select
                            value={selectedTemplate || ''}
                            onValueChange={(v) => handleSelect(dept.key, level.key, v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="选择考核模板" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTemplates.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {currentRule && (
                            <div className="text-xs text-muted-foreground mt-1">
                              当前：{currentRule.templateName}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 说明 */}
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• 模板匹配优先级：<strong>个人绑定</strong> → <strong>层级规则</strong> → <strong>自动匹配</strong> → <strong>默认模板</strong></p>
            <p>• 部门经理也可以在「差异化评分」页面为特定员工单独绑定模板（覆盖层级规则）</p>
            <p>• 层级规则设置后永久生效，每月自动使用，无需重复配置</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
