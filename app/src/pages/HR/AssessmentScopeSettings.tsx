import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Save,
  Settings,
  UserRound,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { assessmentTemplateApi, employeeApi, levelTemplateRuleApi, performanceConfigApi } from '@/services/api';

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

interface OrgNode {
  key: string;
  name: string;
  level: 1 | 2 | 3;
  employees: Employee[];
  children: OrgNode[];
}

type ParticipationMode = 'include' | 'exclude';

interface RankingConfig {
  version: 1;
  participation: {
    mode: ParticipationMode;
    enabledUnitKeys: string[];
    includedUnitKeys: string[];
    excludedUnitKeys: string[];
    includedEmployeeIds: string[];
    excludedEmployeeIds: string[];
  };
  groupRank: {
    defaultStrategy: any;
    perUnit: Record<string, any>;
  };
  mergeRankGroups: any[];
}

interface DeptTypeTemplate {
  departmentType: string;
  level: string;
  templateId: string;
}

const defaultConfig: RankingConfig = {
  version: 1,
  participation: {
    mode: 'exclude',
    enabledUnitKeys: [],
    includedUnitKeys: [],
    excludedUnitKeys: [],
    includedEmployeeIds: [],
    excludedEmployeeIds: [],
  },
  groupRank: {
    defaultStrategy: { type: 'by_high_low' },
    perUnit: {},
  },
  mergeRankGroups: [],
};

const DEPARTMENT_TYPES = [
  { key: 'engineering', label: '工程技术' },
  { key: 'manufacturing', label: '生产制造' },
  { key: 'sales', label: '销售营销' },
  { key: 'support', label: '职能支持' },
  { key: 'management', label: '管理层' },
];

const LEVELS = [
  { key: 'senior', label: '高级/主管' },
  { key: 'intermediate', label: '中级' },
  { key: 'junior', label: '初级/普通员工' },
  { key: 'assistant', label: '助理/实习' },
];

function cleanSegment(value?: string): string {
  const normalized = String(value || '').trim();
  return normalized && normalized !== '/' && normalized !== '-' ? normalized : '';
}

function getEmployeeUnitKey(employee: Employee): string {
  const department = cleanSegment(employee.department);
  const subDepartment = cleanSegment(employee.subDepartment);
  return department && subDepartment ? `${department}/${subDepartment}` : department || subDepartment;
}

function matchesConfiguredUnit(unitKey: string, configuredKey: string): boolean {
  return configuredKey === unitKey || unitKey.startsWith(`${configuredKey}/`);
}

function resolveUnitDecision(
  unitKey: string,
  includedUnitKeys: string[],
  excludedUnitKeys: string[]
): 'include' | 'exclude' | null {
  let bestLength = -1;
  let decision: 'include' | 'exclude' | null = null;

  for (const key of includedUnitKeys) {
    if (matchesConfiguredUnit(unitKey, key) && key.length > bestLength) {
      bestLength = key.length;
      decision = 'include';
    }
  }

  for (const key of excludedUnitKeys) {
    if (matchesConfiguredUnit(unitKey, key) && key.length >= bestLength) {
      bestLength = key.length;
      decision = 'exclude';
    }
  }

  return decision;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isDescendantKey(value: string, key: string): boolean {
  return value === key || value.startsWith(`${key}/`);
}

function getNodeEmployees(node: OrgNode): Employee[] {
  return [...node.employees, ...node.children.flatMap(getNodeEmployees)];
}

function buildOrgTree(employees: Employee[]): OrgNode[] {
  const rootMap = new Map<string, OrgNode>();

  const ensureNode = (siblings: OrgNode[], key: string, name: string, level: 1 | 2 | 3) => {
    let node = siblings.find((item) => item.key === key);
    if (!node) {
      node = { key, name, level, employees: [], children: [] };
      siblings.push(node);
    }
    return node;
  };

  for (const employee of employees) {
    const department = cleanSegment(employee.department) || '未分配部门';
    const segments = String(employee.subDepartment || '')
      .split('/')
      .map(cleanSegment)
      .filter(Boolean)
      .slice(0, 2);

    if (!rootMap.has(department)) {
      rootMap.set(department, { key: department, name: department, level: 1, employees: [], children: [] });
    }

    let current = rootMap.get(department)!;
    if (segments.length === 0) {
      current.employees.push(employee);
      continue;
    }

    segments.forEach((segment, index) => {
      const key = `${department}/${segments.slice(0, index + 1).join('/')}`;
      current = ensureNode(current.children, key, segment, (index + 2) as 2 | 3);
    });
    current.employees.push(employee);
  }

  const sortNode = (node: OrgNode): OrgNode => ({
    ...node,
    employees: [...node.employees].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
    children: [...node.children].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')).map(sortNode),
  });

  return Array.from(rootMap.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .map(sortNode);
}

export default function AssessmentScopeSettings() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [rankingConfig, setRankingConfig] = useState<RankingConfig>(defaultConfig);
  const [rules, setRules] = useState<DeptTypeTemplate[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, tplRes, configRes, rulesRes] = await Promise.all([
        employeeApi.getAll(),
        assessmentTemplateApi.getAll({ includeMetrics: false }),
        performanceConfigApi.getRankingConfig(),
        levelTemplateRuleApi.getAllRules(),
      ]);
      if (empRes.success) setEmployees(empRes.data || []);
      if (tplRes.success) setTemplates(tplRes.data || []);
      if (configRes.success) {
        setRankingConfig({
          ...defaultConfig,
          ...(configRes.data || {}),
          participation: {
            ...defaultConfig.participation,
            ...(configRes.data?.participation || {}),
          },
        });
      }
      if (rulesRes.success) {
        setRules((rulesRes.data || []).map((rule: any) => ({
          departmentType: rule.departmentType,
          level: rule.level,
          templateId: rule.templateId,
        })));
      }
    } catch (error: any) {
      toast.error('加载数据失败: ' + (error.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = useMemo(
    () => employees.filter((employee) => !employee.status || employee.status === 'active'),
    [employees]
  );
  const orgTree = useMemo(() => buildOrgTree(activeEmployees), [activeEmployees]);

  const participation = rankingConfig.participation;

  const isParticipating = (employee: Employee): boolean => {
    const unitKey = getEmployeeUnitKey(employee);
    if (participation.excludedEmployeeIds.includes(employee.id)) return false;
    if (participation.includedEmployeeIds.includes(employee.id)) return true;
    const unitDecision = resolveUnitDecision(unitKey, participation.includedUnitKeys, participation.excludedUnitKeys);
    if (unitDecision) return unitDecision === 'include';
    return participation.mode !== 'include';
  };

  const isMarked = (employee: Employee): boolean => (
    participation.mode === 'include' ? isParticipating(employee) : !isParticipating(employee)
  );

  const participantCount = activeEmployees.filter(isParticipating).length;
  const selectedMarkCount = activeEmployees.filter(isMarked).length;
  const ruleCount = rules.filter((rule) => rule.templateId).length;

  const setParticipation = (updater: (current: RankingConfig['participation']) => RankingConfig['participation']) => {
    setRankingConfig((prev) => ({
      ...prev,
      participation: updater(prev.participation),
    }));
  };

  const setMode = (mode: ParticipationMode) => {
    setParticipation((current) => {
      if (current.mode === mode) return current;
      return {
        ...current,
        mode,
        enabledUnitKeys: [],
        includedUnitKeys: [],
        excludedUnitKeys: [],
        includedEmployeeIds: [],
        excludedEmployeeIds: [],
      };
    });
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleUnit = (node: OrgNode, checked: boolean) => {
    const nodeEmployeeIds = new Set(getNodeEmployees(node).map((employee) => employee.id));
    setParticipation((current) => {
      const includeUnits = current.includedUnitKeys.filter((key) => !isDescendantKey(key, node.key));
      const excludeUnits = current.excludedUnitKeys.filter((key) => !isDescendantKey(key, node.key));
      const includedEmployeeIds = current.includedEmployeeIds.filter((id) => !nodeEmployeeIds.has(id));
      const excludedEmployeeIds = current.excludedEmployeeIds.filter((id) => !nodeEmployeeIds.has(id));

      if (current.mode === 'include') {
        const isInheritedExcluded = current.excludedUnitKeys.some((key) => node.key.startsWith(`${key}/`));
        const nextIncludedUnits = checked || isInheritedExcluded ? unique([...includeUnits, node.key]) : includeUnits;
        return {
          ...current,
          includedUnitKeys: checked ? nextIncludedUnits : includeUnits,
          enabledUnitKeys: checked ? nextIncludedUnits : includeUnits,
          excludedUnitKeys: checked ? excludeUnits : unique([...excludeUnits, node.key]),
          includedEmployeeIds,
          excludedEmployeeIds,
        };
      }

      const isInheritedExcluded = current.excludedUnitKeys.some((key) => node.key.startsWith(`${key}/`));
      const nextIncludedUnits = !checked && isInheritedExcluded ? unique([...includeUnits, node.key]) : includeUnits;
      return {
        ...current,
        includedUnitKeys: nextIncludedUnits,
        enabledUnitKeys: nextIncludedUnits,
        excludedUnitKeys: checked ? unique([...excludeUnits, node.key]) : excludeUnits,
        includedEmployeeIds,
        excludedEmployeeIds,
      };
    });
  };

  const toggleEmployee = (employee: Employee, checked: boolean) => {
    setParticipation((current) => {
      const includedEmployeeIds = current.includedEmployeeIds.filter((id) => id !== employee.id);
      const excludedEmployeeIds = current.excludedEmployeeIds.filter((id) => id !== employee.id);
      if (current.mode === 'include') {
        return {
          ...current,
          includedEmployeeIds: checked ? unique([...includedEmployeeIds, employee.id]) : includedEmployeeIds,
          excludedEmployeeIds: checked ? excludedEmployeeIds : unique([...excludedEmployeeIds, employee.id]),
        };
      }
      const unitDecision = resolveUnitDecision(
        getEmployeeUnitKey(employee),
        current.includedUnitKeys,
        current.excludedUnitKeys
      );
      return {
        ...current,
        includedEmployeeIds: !checked && unitDecision === 'exclude'
          ? unique([...includedEmployeeIds, employee.id])
          : includedEmployeeIds,
        excludedEmployeeIds: checked ? unique([...excludedEmployeeIds, employee.id]) : excludedEmployeeIds,
      };
    });
  };

  const getNodeCheckState = (node: OrgNode): boolean | 'indeterminate' => {
    const nodeEmployees = getNodeEmployees(node);
    if (nodeEmployees.length === 0) return false;
    const markedCount = nodeEmployees.filter(isMarked).length;
    if (markedCount === nodeEmployees.length) return true;
    if (markedCount > 0) return 'indeterminate';
    return false;
  };

  const getNodeVisible = (node: OrgNode): boolean => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    if (node.key.toLowerCase().includes(keyword)) return true;
    return getNodeEmployees(node).some((employee) =>
      `${employee.name} ${employee.position || ''} ${employee.id}`.toLowerCase().includes(keyword)
    );
  };

  const getRuleTemplateId = (deptType: string, level: string): string => (
    rules.find((rule) => rule.departmentType === deptType && rule.level === level)?.templateId || ''
  );

  const setRule = (departmentType: string, level: string, templateId: string) => {
    setRules((prev) => {
      const existingIndex = prev.findIndex((rule) => rule.departmentType === departmentType && rule.level === level);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { departmentType, level, templateId };
        return next;
      }
      return [...prev, { departmentType, level, templateId }];
    });
  };

  const getTemplatesForDeptType = (deptType: string) => templates.filter((template) => template.departmentType === deptType);

  const handleSave = async () => {
    setSaving(true);
    try {
      await performanceConfigApi.updateRankingConfig(rankingConfig as unknown as Record<string, unknown>);
      if (rules.length > 0) await levelTemplateRuleApi.batchSetRules(rules);
      toast.success('配置已保存，后续生成任务和绩效看板会按这个范围生效');
      await loadData();
    } catch (error: any) {
      toast.error('保存失败: ' + (error.message || String(error)));
    } finally {
      setSaving(false);
    }
  };

  const renderEmployee = (employee: Employee) => {
    const checked = isMarked(employee);
    return (
      <div key={employee.id} className="flex items-center gap-3 rounded-md px-3 py-2 pl-12 hover:bg-gray-50">
        <Checkbox checked={checked} onCheckedChange={(value) => toggleEmployee(employee, value === true)} />
        <UserRound className="h-4 w-4 text-gray-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
          <div className="text-xs text-gray-500">{employee.position || employee.role} · {employee.level || '未分级'} · {employee.id}</div>
        </div>
        <Badge variant={isParticipating(employee) ? 'default' : 'outline'} className="text-xs">
          {isParticipating(employee) ? '参与' : '不参与'}
        </Badge>
      </div>
    );
  };

  const renderNode = (node: OrgNode) => {
    if (!getNodeVisible(node)) return null;
    const nodeEmployees = getNodeEmployees(node);
    const checkedState = getNodeCheckState(node);
    const isExpanded = expandedKeys.has(node.key) || Boolean(search.trim());
    const hasChildren = node.children.length > 0 || node.employees.length > 0;
    const paddingClass = node.level === 1 ? 'pl-3' : node.level === 2 ? 'pl-8' : 'pl-12';

    return (
      <div key={node.key} className="rounded-lg border bg-white">
        <div className={`flex items-center gap-3 rounded-lg bg-gray-50 p-3 ${paddingClass}`}>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200"
            onClick={() => hasChildren && toggleExpand(node.key)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : <span className="h-4 w-4" />}
          </button>
          <Checkbox checked={checkedState} onCheckedChange={(value) => toggleUnit(node, value === true)} />
          <Building2 className="h-4 w-4 text-gray-500" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900">{node.name}</div>
            <div className="text-xs text-gray-500">{node.key}</div>
          </div>
          <Badge variant="outline">{nodeEmployees.length} 人</Badge>
          {checkedState === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>

        {isExpanded && hasChildren && (
          <div className="space-y-2 border-t p-2">
            {node.children.map(renderNode)}
            {node.employees.map(renderEmployee)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center">加载中...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Settings className="h-6 w-6" />
              考核范围与模板配置
            </h1>
            <p className="mt-1 text-muted-foreground">
              按一级/二级/三级部门或具体员工选择谁参与考核；也可以反过来只勾选不参与的人。
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Badge variant="outline" className="text-sm">参与考核：{participantCount} 人</Badge>
          <Badge variant="secondary" className="text-sm">不参与：{activeEmployees.length - participantCount} 人</Badge>
          <Badge variant="outline" className="text-sm">当前勾选：{selectedMarkCount} 人</Badge>
          <Badge variant="default" className="text-sm">模板规则：{ruleCount} 条</Badge>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            考核范围组织树
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-medium">选择模式</div>
              <div className="text-sm text-muted-foreground">
                当前勾选表示：{participation.mode === 'include' ? '参与考核' : '不参与考核'}；切换模式会清空当前勾选，避免旧规则混在一起。
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={participation.mode === 'include' ? 'default' : 'outline'}
                onClick={() => setMode('include')}
              >
                勾选参与考核
              </Button>
              <Button
                type="button"
                variant={participation.mode === 'exclude' ? 'default' : 'outline'}
                onClick={() => setMode('exclude')}
              >
                勾选不参与考核
              </Button>
            </div>
          </div>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索部门、三级小组、姓名、岗位或工号"
          />

          <div className="space-y-3">
            {orgTree.map(renderNode)}
          </div>

          {activeEmployees.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              当前没有可参与考核的在职员工，请先在人事档案导入页面上传员工档案。
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            部门类型 × 层级 → 考核模板
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DEPARTMENT_TYPES.map((departmentType) => {
              const availableTemplates = getTemplatesForDeptType(departmentType.key);
              if (availableTemplates.length === 0) return null;

              return (
                <div key={departmentType.key} className="rounded-lg border p-4">
                  <h3 className="mb-3 text-sm font-medium">{departmentType.label}（{departmentType.key}）</h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {LEVELS.map((level) => {
                      const selected = getRuleTemplateId(departmentType.key, level.key);
                      return (
                        <div key={`${departmentType.key}:${level.key}`} className="flex items-center gap-3 rounded border bg-gray-50 p-2">
                          <span className="w-28 text-sm">{level.label}</span>
                          <div className="flex-1">
                            <Select value={selected} onValueChange={(value) => setRule(departmentType.key, level.key, value)}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="选择模板" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {selected && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />}
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

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              可勾选一级部门、二级部门、三级小组，也可直接勾选某个员工。
            </p>
            <p className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4" />
              勾选父级会作用到其下所有人员；需要少数人例外时，可以切换到“不参与”模式单独勾选。
            </p>
            <p className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              模板规则按「部门类型 × 层级」设置，员工会自动匹配对应模板。
            </p>
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              保存后会影响后续任务生成、绩效看板统计和排名口径。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
