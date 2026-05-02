import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { assessmentTemplateApi, employeeApi, performanceConfigApi } from '@/services/api';

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
  templateAssignments: Record<string, string>;
  mergeRankGroups: any[];
}

interface TemplateOption {
  id: string;
  name: string;
  departmentType: string;
  status?: string;
}

interface SelectedUnitSummary {
  unitKey: string;
  unitName: string;
  employeeCount: number;
  exactTemplateId: string | null;
  effectiveTemplateId: string | null;
  effectiveTemplateName: string | null;
  inheritedFromUnitKey: string | null;
  missingTemplate: boolean;
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
  templateAssignments: {},
  mergeRankGroups: [],
};

const ASSESSMENT_ROLES = new Set(['employee', 'manager']);

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

function isParticipatingEmployee(
  employee: Employee,
  participation: RankingConfig['participation']
): boolean {
  const unitKey = getEmployeeUnitKey(employee);
  if (participation.excludedEmployeeIds.includes(employee.id)) return false;
  if (participation.includedEmployeeIds.includes(employee.id)) return true;
  const unitDecision = resolveUnitDecision(unitKey, participation.includedUnitKeys, participation.excludedUnitKeys);
  if (unitDecision) return unitDecision === 'include';
  return participation.mode !== 'include';
}

function isDescendantKey(value: string, key: string): boolean {
  return value === key || value.startsWith(`${key}/`);
}

function getTemplateTypeLabel(departmentType?: string): string {
  switch (departmentType) {
    case 'sales':
      return '销售类';
    case 'engineering':
      return '工程类';
    case 'manufacturing':
      return '生产类';
    case 'management':
      return '管理类';
    default:
      return '支持类';
  }
}

function getDepartmentTypeByName(departmentName?: string): string {
  const value = String(departmentName || '').trim();
  if (/营销|销售/.test(value)) return 'sales';
  if (/项目管理/.test(value)) return 'engineering';
  if (/工程|技术|研发/.test(value)) return 'engineering';
  if (/制造|生产|品质/.test(value)) return 'manufacturing';
  if (/总经|管理|总办/.test(value)) return 'management';
  return 'support';
}

function getPreferredDepartmentType(unitKey: string): string {
  const rootDepartment = unitKey.split('/')[0] || unitKey;
  return getDepartmentTypeByName(rootDepartment);
}

function getTemplateAssignmentDetail(
  unitKey: string,
  templateAssignments: Record<string, string>
): {
  exactTemplateId: string | null;
  effectiveTemplateId: string | null;
  inheritedFromUnitKey: string | null;
} {
  const exactTemplateId = templateAssignments[unitKey] || null;
  if (exactTemplateId) {
    return {
      exactTemplateId,
      effectiveTemplateId: exactTemplateId,
      inheritedFromUnitKey: null,
    };
  }

  let inheritedFromUnitKey: string | null = null;
  let effectiveTemplateId: string | null = null;

  for (const [configuredUnitKey, templateId] of Object.entries(templateAssignments)) {
    if (!templateId) continue;
    if (!matchesConfiguredUnit(unitKey, configuredUnitKey)) continue;
    if (!inheritedFromUnitKey || configuredUnitKey.length > inheritedFromUnitKey.length) {
      inheritedFromUnitKey = configuredUnitKey;
      effectiveTemplateId = templateId;
    }
  }

  return {
    exactTemplateId: null,
    effectiveTemplateId,
    inheritedFromUnitKey,
  };
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
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [rankingConfig, setRankingConfig] = useState<RankingConfig>(defaultConfig);
  const rankingConfigRef = useRef<RankingConfig>(defaultConfig);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const updateRankingConfig = (updater: (current: RankingConfig) => RankingConfig) => {
    setRankingConfig((prev) => {
      const next = updater(prev);
      rankingConfigRef.current = next;
      return next;
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [empResult, configResult, templateResult] = await Promise.allSettled([
        employeeApi.getAll(),
        performanceConfigApi.getRankingConfig(),
        assessmentTemplateApi.getAll({ includeMetrics: false }),
      ]);

      let nextEmployees: Employee[] = [];
      let nextConfig: RankingConfig = defaultConfig;

      if (empResult.status === 'fulfilled' && empResult.value.success) {
        nextEmployees = empResult.value.data || [];
        setEmployees(nextEmployees);
      } else {
        const reason = empResult.status === 'rejected' ? empResult.reason?.message : empResult.value?.message;
        toast.error('员工档案加载失败: ' + (reason || '未知错误'));
      }

      if (configResult.status === 'fulfilled' && configResult.value.success) {
        const configData = configResult.value.data || {};
        nextConfig = {
          ...defaultConfig,
          ...configData,
          participation: {
            ...defaultConfig.participation,
            ...(configData.participation || {}),
          },
          templateAssignments: {
            ...defaultConfig.templateAssignments,
            ...(configData.templateAssignments || {}),
          },
        };
        rankingConfigRef.current = nextConfig;
        setRankingConfig(nextConfig);
      }

      if (templateResult.status === 'fulfilled' && templateResult.value.success) {
        setTemplates(
          (templateResult.value.data || []).filter((template: TemplateOption) => template.status !== 'archived')
        );
      } else {
        const reason = templateResult.status === 'rejected'
          ? templateResult.reason?.message
          : templateResult.value?.message;
        toast.error('考核模板加载失败: ' + (reason || '未知错误'));
      }
    } catch (error: any) {
      toast.error('加载数据失败: ' + (error.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = useMemo(
    () => employees.filter((employee) => (
      (!employee.status || employee.status === 'active') && ASSESSMENT_ROLES.has(employee.role)
    )),
    [employees]
  );
  const orgTree = useMemo(() => buildOrgTree(activeEmployees), [activeEmployees]);
  const orgNodeMap = useMemo(() => {
    const map = new Map<string, OrgNode>();
    const visit = (node: OrgNode) => {
      map.set(node.key, node);
      node.children.forEach(visit);
    };
    orgTree.forEach(visit);
    return map;
  }, [orgTree]);
  const templateMap = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  const participation = rankingConfig.participation;

  const isParticipating = (employee: Employee): boolean => isParticipatingEmployee(employee, participation);

  const isMarked = (employee: Employee): boolean => (
    participation.mode === 'include' ? isParticipating(employee) : !isParticipating(employee)
  );

  const participantCount = activeEmployees.filter(isParticipating).length;
  const selectedMarkCount = activeEmployees.filter(isMarked).length;
  const requiredTemplateUnitKeys = useMemo(
    () => participation.mode === 'include' ? unique(participation.includedUnitKeys) : [],
    [participation.includedUnitKeys, participation.mode]
  );
  const selectedUnitSummaries = useMemo<SelectedUnitSummary[]>(() => (
    requiredTemplateUnitKeys.map((unitKey) => {
      const detail = getTemplateAssignmentDetail(unitKey, rankingConfig.templateAssignments);
      const node = orgNodeMap.get(unitKey);
      const employeeCount = node ? getNodeEmployees(node).length : 0;
      const effectiveTemplate = detail.effectiveTemplateId ? templateMap.get(detail.effectiveTemplateId) : null;
      return {
        unitKey,
        unitName: node?.name || unitKey.split('/').slice(-1)[0] || unitKey,
        employeeCount,
        exactTemplateId: detail.exactTemplateId,
        effectiveTemplateId: detail.effectiveTemplateId,
        effectiveTemplateName: effectiveTemplate?.name || null,
        inheritedFromUnitKey:
          detail.inheritedFromUnitKey && detail.inheritedFromUnitKey !== unitKey
            ? detail.inheritedFromUnitKey
            : null,
        missingTemplate: !detail.effectiveTemplateId,
      };
    })
  ).sort((a, b) => a.unitKey.localeCompare(b.unitKey, 'zh-Hans-CN')), [
    orgNodeMap,
    rankingConfig.templateAssignments,
    requiredTemplateUnitKeys,
    templateMap,
  ]);
  const missingTemplateUnits = selectedUnitSummaries.filter((summary) => summary.missingTemplate);
  const selectedTemplateCount = Object.keys(rankingConfig.templateAssignments || {}).length;

  const setParticipation = (updater: (current: RankingConfig['participation']) => RankingConfig['participation']) => {
    updateRankingConfig((prev) => ({
      ...prev,
      participation: updater(prev.participation),
    }));
  };

  const setMode = (mode: ParticipationMode) => {
    updateRankingConfig((prev) => {
      if (prev.participation.mode === mode) return prev;
      return {
        ...prev,
        participation: {
          ...prev.participation,
          mode,
          enabledUnitKeys: [],
          includedUnitKeys: [],
          excludedUnitKeys: [],
          includedEmployeeIds: [],
          excludedEmployeeIds: [],
        },
        templateAssignments: {},
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
    updateRankingConfig((prev) => {
      const current = prev.participation;
      const includeUnits = current.includedUnitKeys.filter((key) => !isDescendantKey(key, node.key));
      const excludeUnits = current.excludedUnitKeys.filter((key) => !isDescendantKey(key, node.key));
      const includedEmployeeIds = current.includedEmployeeIds.filter((id) => !nodeEmployeeIds.has(id));
      const excludedEmployeeIds = current.excludedEmployeeIds.filter((id) => !nodeEmployeeIds.has(id));
      const nextTemplateAssignments = Object.fromEntries(
        Object.entries(prev.templateAssignments || {}).filter(([key]) => !isDescendantKey(key, node.key))
      );

      if (current.mode === 'include') {
        const isInheritedExcluded = current.excludedUnitKeys.some((key) => node.key.startsWith(`${key}/`));
        const nextIncludedUnits = checked || isInheritedExcluded ? unique([...includeUnits, node.key]) : includeUnits;
        return {
          ...prev,
          participation: {
            ...current,
            includedUnitKeys: checked ? nextIncludedUnits : includeUnits,
            enabledUnitKeys: checked ? nextIncludedUnits : includeUnits,
            excludedUnitKeys: checked ? excludeUnits : unique([...excludeUnits, node.key]),
            includedEmployeeIds,
            excludedEmployeeIds,
          },
          templateAssignments: nextTemplateAssignments,
        };
      }

      const isInheritedExcluded = current.excludedUnitKeys.some((key) => node.key.startsWith(`${key}/`));
      const nextIncludedUnits = !checked && isInheritedExcluded ? unique([...includeUnits, node.key]) : includeUnits;
      return {
        ...prev,
        participation: {
          ...current,
          includedUnitKeys: nextIncludedUnits,
          enabledUnitKeys: nextIncludedUnits,
          excludedUnitKeys: checked ? unique([...excludeUnits, node.key]) : excludeUnits,
          includedEmployeeIds,
          excludedEmployeeIds,
        },
        templateAssignments: nextTemplateAssignments,
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

  const setUnitTemplate = (unitKey: string, templateId: string) => {
    updateRankingConfig((prev) => {
      const nextAssignments = { ...(prev.templateAssignments || {}) };
      if (!templateId || templateId === '__inherit__') {
        delete nextAssignments[unitKey];
      } else {
        nextAssignments[unitKey] = templateId;
      }
      return {
        ...prev,
        templateAssignments: nextAssignments,
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

  const handleSave = async () => {
    const latestConfig = rankingConfigRef.current;
    const latestParticipation = latestConfig.participation;
    const latestRequiredTemplateUnitKeys = latestParticipation.mode === 'include'
      ? unique(latestParticipation.includedUnitKeys)
      : [];
    const latestMissingTemplateUnits = latestRequiredTemplateUnitKeys.filter((unitKey) => (
      !getTemplateAssignmentDetail(unitKey, latestConfig.templateAssignments).effectiveTemplateId
    ));

    if (latestParticipation.mode === 'include' && latestRequiredTemplateUnitKeys.length > 0 && latestMissingTemplateUnits.length > 0) {
      const previewNames = latestMissingTemplateUnits
        .slice(0, 3)
        .map((unitKey) => orgNodeMap.get(unitKey)?.name || unitKey.split('/').slice(-1)[0] || unitKey)
        .join('、');
      const suffix = latestMissingTemplateUnits.length > 3 ? ` 等 ${latestMissingTemplateUnits.length} 个部门` : '';
      toast.error(`还有参与考核的部门未选择模板：${previewNames}${suffix}`);
      return;
    }

    setSaving(true);
    try {
      await performanceConfigApi.updateRankingConfig(latestConfig as unknown as Record<string, unknown>);
      toast.success('考核范围和部门模板已保存，后续生成任务、考核表单和排名都会按这个配置生效');
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
              考核范围配置
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
          <Badge variant="outline" className="text-sm">已选模板：{selectedTemplateCount} 个</Badge>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            已保存配置摘要
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            保存后，这里会展示“参与考核的部门”和“该部门当前生效的考核模板”。模板内容请在“考核模板”页里维护，这里只负责选择使用哪个模板。
          </div>

          {participation.mode !== 'include' ? (
            <div className="rounded-lg border bg-gray-50 p-4 text-sm text-muted-foreground">
              当前是“默认全员参与、勾选不参与”的模式，所以这里不单独展示参与部门模板。要按部门指定模板，请切换到“勾选参与考核”模式。
            </div>
          ) : selectedUnitSummaries.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {selectedUnitSummaries.map((summary) => {
                const template = summary.effectiveTemplateId ? templateMap.get(summary.effectiveTemplateId) : null;
                return (
                  <div key={summary.unitKey} className="rounded-lg border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{summary.unitName}</div>
                        <div className="mt-1 text-xs text-gray-500">{summary.unitKey}</div>
                        <div className="mt-1 text-xs text-gray-500">参与人数：{summary.employeeCount} 人</div>
                      </div>
                      <Badge variant={summary.missingTemplate ? 'outline' : 'secondary'}>
                        {summary.missingTemplate ? '未选模板' : '已选模板'}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {template ? (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            {template.name}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getTemplateTypeLabel(template.departmentType)}
                          </Badge>
                          {summary.inheritedFromUnitKey && (
                            <Badge variant="outline" className="text-xs">
                              继承自：{summary.inheritedFromUnitKey}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-700">
                          还没有选择考核模板
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border bg-gray-50 p-4 text-sm text-muted-foreground">
              当前还没有勾选参与考核的部门。先在下面组织树里勾选要参与考核的部门，再为这些部门选择模板。
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            参与部门对应考核模板
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            这里不是新建模板的地方，只是为“已选参与考核的部门”指定要使用的模板。模板内容请到上面的“考核模板”页维护。
          </div>

          {participation.mode !== 'include' ? (
            <div className="rounded-lg border bg-gray-50 p-4 text-sm text-muted-foreground">
              当前是“勾选不参与考核”模式，系统默认其他部门都参与，因此这里不强制逐个选模板。若你想明确指定参与部门和对应模板，请切换到“勾选参与考核”模式。
            </div>
          ) : selectedUnitSummaries.length > 0 ? (
            <div className="space-y-3">
              {selectedUnitSummaries.map((summary) => {
                const inheritedTemplate = summary.inheritedFromUnitKey && summary.effectiveTemplateId
                  ? templateMap.get(summary.effectiveTemplateId)
                  : null;
                const exactTemplate = summary.exactTemplateId ? templateMap.get(summary.exactTemplateId) : null;
                const preferredDepartmentType = getPreferredDepartmentType(summary.unitKey);
                const recommendedTemplates = templates.filter(
                  (template) => template.departmentType === preferredDepartmentType
                );
                const otherTemplates = templates.filter(
                  (template) => template.departmentType !== preferredDepartmentType
                );
                return (
                  <div key={`assignment-${summary.unitKey}`} className="rounded-lg border bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{summary.unitName}</div>
                        <div className="text-xs text-gray-500">{summary.unitKey}</div>
                        <div className="mt-1 text-xs text-gray-500">参与人数：{summary.employeeCount} 人</div>
                      </div>

                      <div className="w-full lg:w-[360px]">
                        <Select
                          value={summary.exactTemplateId || '__inherit__'}
                          onValueChange={(value) => setUnitTemplate(summary.unitKey, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="请选择考核模板" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__inherit__">
                              {inheritedTemplate
                                ? `继承上级模板：${inheritedTemplate.name}`
                                : '未单独指定（请选择模板）'}
                            </SelectItem>
                            {recommendedTemplates.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>
                                  推荐模板：{getTemplateTypeLabel(preferredDepartmentType)}
                                </SelectLabel>
                                {recommendedTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name} · {getTemplateTypeLabel(template.departmentType)}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {otherTemplates.length > 0 && (
                              <>
                                <SelectSeparator />
                                <SelectGroup>
                                  <SelectLabel>其他类型模板</SelectLabel>
                                  {otherTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name} · {getTemplateTypeLabel(template.departmentType)}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        推荐类型：{getTemplateTypeLabel(preferredDepartmentType)}
                      </Badge>
                      {exactTemplate ? (
                        <Badge variant="secondary" className="text-xs">
                          当前指定：{exactTemplate.name}
                        </Badge>
                      ) : inheritedTemplate ? (
                        <Badge variant="outline" className="text-xs">
                          当前继承：{inheritedTemplate.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-700">
                          这个参与部门还没有选择模板
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border bg-gray-50 p-4 text-sm text-muted-foreground">
              先在下面组织树里勾选要参与考核的部门，这里才会出现模板选择框。
            </div>
          )}

          {missingTemplateUnits.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  还有 {missingTemplateUnits.length} 个参与考核的部门没有选择模板，当前不能保存。请先到这里选好模板；如果模板本身还没有建好，请切到“考核模板”页先维护。
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              保存后会影响后续任务生成、绩效看板统计和排名口径。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
