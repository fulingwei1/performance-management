import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Building2, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { hrApi, assessmentTemplateApi, employeeApi, levelTemplateRuleApi } from '@/services/api';

interface Employee {
  id: string;
  name: string;
  department: string;
  subDepartment?: string;
  role: string;
  level: string;
  position?: string;
  status?: string;
}

interface DeptNode {
  name: string;
  isSub: boolean;
  parent?: string;
  empCount: number;
  children: DeptNode[];
}

interface ScopeConfig {
  rootDepts: string[];
  subDeptsByRoot: Record<string, string[]>;
}

interface DeptTypeTemplate {
  departmentType: string;
  level: string;
  templateId: string;
}

export default function AssessmentScopeSettings() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [scope, setScope] = useState<ScopeConfig>({ rootDepts: [], subDeptsByRoot: {} });
  const [rules, setRules] = useState<DeptTypeTemplate[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, tplRes, scopeRes, rulesRes] = await Promise.all([
        employeeApi.getAll(),
        assessmentTemplateApi.getAll({ includeMetrics: false }),
        hrApi.getAssessmentScope(),
        levelTemplateRuleApi.getAllRules(),
      ]);
      if (empRes.success) setEmployees(empRes.data || []);
      if (tplRes.success) setTemplates(tplRes.data || []);
      if (scopeRes.success) setScope(scopeRes.data || { rootDepts: [], subDeptsByRoot: {} });
      if (rulesRes.success) {
        const ruleList = (rulesRes.data || []).map((r: any) => ({
          departmentType: r.departmentType,
          level: r.level,
          templateId: r.templateId,
        }));
        setRules(ruleList);
      }
    } catch (e) {
      toast.error('加载数据失败: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  // 构建部门树
  const buildDeptTree = (): DeptNode[] => {
    const activeEmps = employees.filter(e => e.status === 'active');
    const deptMap = new Map<string, { subDepts: Set<string>, empCount: number }>();

    for (const emp of activeEmps) {
      const dept = emp.department || '未分配';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { subDepts: new Set(), empCount: 0 });
      }
      const entry = deptMap.get(dept)!;
      entry.empCount++;
      if (emp.subDepartment) {
        entry.subDepts.add(emp.subDepartment);
      }
    }

    return Array.from(deptMap.entries()).map(([name, data]) => ({
      name,
      isSub: false,
      empCount: data.empCount,
      children: Array.from(data.subDepts).map(sub => {
        const subCount = activeEmps.filter(e => e.department === name && e.subDepartment === sub).length;
        return { name: sub, isSub: true, parent: name, empCount: subCount, children: [] };
      })
    }));
  };

  const deptTree = buildDeptTree();

  const isInScope = (dept: string, subDept?: string): boolean => {
    if (scope.rootDepts.includes(dept)) return true;
    if (subDept && scope.subDeptsByRoot[dept]?.includes(subDept)) return true;
    return false;
  };

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const toggleRootDept = (dept: string, checked: boolean) => {
    setScope(prev => {
      const newRootDepts = checked
        ? [...prev.rootDepts, dept]
        : prev.rootDepts.filter(d => d !== dept);
      if (!checked) {
        const { [dept]: _, ...rest } = prev.subDeptsByRoot;
        return { rootDepts: newRootDepts, subDeptsByRoot: rest };
      }
      return { rootDepts: newRootDepts, subDeptsByRoot: { ...prev.subDeptsByRoot } };
    });
  };

  const toggleSubDept = (dept: string, subDept: string, checked: boolean) => {
    setScope(prev => {
      const subs = prev.subDeptsByRoot[dept] || [];
      const newSubs = checked
        ? [...new Set([...subs, subDept])]
        : subs.filter(s => s !== subDept);
      return {
        rootDepts: prev.rootDepts,
        subDeptsByRoot: { ...prev.subDeptsByRoot, [dept]: newSubs }
      };
    });
  };

  const getDeptType = (dept: string): string => {
    const d = dept?.trim() || '';
    if (/营销|销售/.test(d)) return 'sales';
    if (/工程|技术|研发/.test(d)) return 'engineering';
    if (/制造|生产|品质/.test(d)) return 'manufacturing';
    if (/总经|管理|总办/.test(d)) return 'management';
    return 'support';
  };

  const getRuleTemplateId = (deptType: string, level: string): string => {
    return rules.find(r => r.departmentType === deptType && r.level === level)?.templateId || '';
  };

  const setRule = (deptType: string, level: string, templateId: string) => {
    setRules(prev => {
      const idx = prev.findIndex(r => r.departmentType === deptType && r.level === level);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { departmentType: deptType, level, templateId };
        return next;
      }
      return [...prev, { departmentType, level, templateId }];
    });
  };

  const getTemplatesForDeptType = (deptType: string) => {
    return templates.filter(t => t.departmentType === deptType);
  };

  const DEPARTMENT_TYPES = [
    { key: 'engineering', label: '工程技术' },
    { key: 'manufacturing', label: '生产制造' },
    { key: 'sales', label: '销售营销' },
    { key: 'support', label: '职能支持' },
    { key: 'management', label: '管理层' },
  ];

  const LEVELS = [
    { key: 'junior', label: '初级/普通员工' },
    { key: 'senior', label: '高级/主管' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. 保存考核范围
      await hrApi.updateAssessmentScope(scope);

      // 2. 保存模板规则
      if (rules.length > 0) {
        await levelTemplateRuleApi.batchSetRules(rules);
      }

      toast.success('配置已保存');
      await loadData();
    } catch (e: any) {
      toast.error('保存失败: ' + (e.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  // 统计
  const inScopeCount = employees.filter(e =>
    e.status === 'active' && isInScope(e.department, e.subDepartment)
  ).length;

  const ruleCount = rules.filter(r => r.templateId).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* 顶部 */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              考核范围与模板配置
            </h1>
            <p className="text-muted-foreground mt-1">
              选择参与考核的部门，并为各部门类型配置考核模板
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </div>
        <div className="flex gap-3 mt-3">
          <Badge variant="outline" className="text-sm">
            参与考核：{inScopeCount} 人
          </Badge>
          <Badge variant="secondary" className="text-sm">
            不参与：{employees.filter(e => e.status === 'active').length - inScopeCount} 人
          </Badge>
          <Badge variant="default" className="text-sm">
            模板规则：{ruleCount} 条
          </Badge>
        </div>
      </motion.div>

      {/* 1. 部门范围 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            参与考核的部门
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {deptTree.map(dept => {
              const isExpanded = expandedDepts.has(dept.name);
              const rootChecked = scope.rootDepts.includes(dept.name);
              const hasSubDepts = dept.children.length > 0;

              return (
                <div key={dept.name} className="border rounded-lg">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => hasSubDepts && toggleDept(dept.name)}>
                    {hasSubDepts && (
                      isExpanded
                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <Checkbox
                      checked={rootChecked}
                      onCheckedChange={(checked) => toggleRootDept(dept.name, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium flex-1">{dept.name}</span>
                    <Badge variant="outline">{dept.empCount}人</Badge>
                    {rootChecked && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  </div>

                  {isExpanded && hasSubDepts && (
                    <div className="border-t">
                      {dept.children.map(sub => {
                        const subChecked = isInScope(dept.name, sub.name);
                        return (
                          <div key={sub.name} className="flex items-center gap-3 p-3 pl-12 hover:bg-gray-50">
                            <Checkbox
                              checked={subChecked}
                              onCheckedChange={(checked) => toggleSubDept(dept.name, sub.name, !!checked)}
                            />
                            <span className="flex-1 text-sm">{sub.name}</span>
                            <Badge variant="outline">{sub.empCount}人</Badge>
                            {subChecked && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. 模板规则 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            部门类型 × 层级 → 考核模板
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DEPARTMENT_TYPES.map(dt => {
              const availableTemplates = getTemplatesForDeptType(dt.key);
              if (availableTemplates.length === 0) return null;

              return (
                <div key={dt.key} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3 text-sm">{dt.label}（{dt.key}）</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {LEVELS.map(level => {
                      const selected = getRuleTemplateId(dt.key, level.key);
                      return (
                        <div key={`${dt.key}:${level.key}`} className="flex items-center gap-3 p-2 rounded border bg-gray-50">
                          <span className="text-sm w-28">{level.label}</span>
                          <div className="flex-1">
                            <Select
                              value={selected}
                              onValueChange={(v) => setRule(dt.key, level.key, v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="选择模板" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTemplates.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {selected && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 说明 */}
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              勾选一级部门 = 该部门所有员工参与考核
            </p>
            <p className="flex items-center gap-2">
              <ChevronDown className="w-4 h-4" />
              展开后可只勾选部分二级部门，实现精确控制
            </p>
            <p className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              模板规则按「部门类型 × 层级」设置，匹配到该类型和层级的员工自动使用对应模板
            </p>
            <p className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              如果未设置模板规则，系统将使用默认模板
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
