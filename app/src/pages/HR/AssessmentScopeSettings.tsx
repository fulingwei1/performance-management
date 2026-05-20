import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
  managerId?: string;
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

interface TemplateAssignmentPreview {
  employee: {
    id: string;
    name: string;
  };
  template: TemplateOption | null;
  matchReason: string;
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

function hasValidManagerRelationship(employee: Employee, activeEmployeeIds: Set<string>): boolean {
  const managerId = String(employee.managerId || '').trim();
  return Boolean(managerId && managerId !== employee.id && activeEmployeeIds.has(managerId));
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

function getEmployeeTemplateAssignmentKey(employeeId: string): string {
  return `employee:${employeeId}`;
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
  const [assignmentPreviews, setAssignmentPreviews] = useState<Map<string, TemplateAssignmentPreview>>(new Map());
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
      const [empResult, configResult, templateResult, assignmentResult] = await Promise.allSettled([
        employeeApi.getAll(),
        performanceConfigApi.getRankingConfig(),
        assessmentTemplateApi.getAll({ includeMetrics: false, status: 'active' }),
        assessmentTemplateApi.previewAssignments({}),
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

      if (assignmentResult.status === 'fulfilled' && assignmentResult.value.success) {
        const previews = new Map<string, TemplateAssignmentPreview>();
        (assignmentResult.value.data || []).forEach((item: TemplateAssignmentPreview) => {
          if (item?.employee?.id) previews.set(item.employee.id, item);
        });
        setAssignmentPreviews(previews);
      } else {
        setAssignmentPreviews(new Map());
      }
    } catch (error: any) {
      toast.error('加载数据失败: ' + (error.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  const activeEmployeeIds = useMemo(
    () => new Set(
      employees
        .filter((employee) => !employee.status || employee.status === 'active')
        .map((employee) => employee.id)
    ),
    [employees]
  );
  const activeEmployees = useMemo(
    () => employees.filter((employee) => (
      (!employee.status || employee.status === 'active') &&
      hasValidManagerRelationship(employee, activeEmployeeIds)
    )),
    [activeEmployeeIds, employees]
  );
  const orgTree = useMemo(() => buildOrgTree(activeEmployees), [activeEmployees]);
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
  const selectedTemplateCount = Object.keys(rankingConfig.templateAssignments || {})
    .filter((key) => key.startsWith('employee:')).length;

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
    updateRankingConfig((prev) => {
      const current = prev.participation;
      const includedEmployeeIds = current.includedEmployeeIds.filter((id) => id !== employee.id);
      const excludedEmployeeIds = current.excludedEmployeeIds.filter((id) => id !== employee.id);
      const nextTemplateAssignments = { ...(prev.templateAssignments || {}) };
      if (!checked) {
        delete nextTemplateAssignments[getEmployeeTemplateAssignmentKey(employee.id)];
      }

      if (current.mode === 'include') {
        return {
          ...prev,
          participation: {
            ...current,
            includedEmployeeIds: checked ? unique([...includedEmployeeIds, employee.id]) : includedEmployeeIds,
            excludedEmployeeIds: checked ? excludedEmployeeIds : unique([...excludedEmployeeIds, employee.id]),
          },
          templateAssignments: nextTemplateAssignments,
        };
      }
      const unitDecision = resolveUnitDecision(
        getEmployeeUnitKey(employee),
        current.includedUnitKeys,
        current.excludedUnitKeys
      );
      return {
        ...prev,
        participation: {
          ...current,
          includedEmployeeIds: !checked && unitDecision === 'exclude'
            ? unique([...includedEmployeeIds, employee.id])
            : includedEmployeeIds,
          excludedEmployeeIds: checked ? unique([...excludedEmployeeIds, employee.id]) : excludedEmployeeIds,
        },
        templateAssignments: nextTemplateAssignments,
      };
    });
  };

  const setEmployeeTemplate = (employeeId: string, templateId: string) => {
    updateRankingConfig((prev) => {
      const nextAssignments = { ...(prev.templateAssignments || {}) };
      const assignmentKey = getEmployeeTemplateAssignmentKey(employeeId);
      if (!templateId || templateId === '__auto__') {
        delete nextAssignments[assignmentKey];
      } else {
        nextAssignments[assignmentKey] = templateId;
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
    const latestConfig = {
      ...rankingConfigRef.current,
      templateAssignments: Object.fromEntries(
        Object.entries(rankingConfigRef.current.templateAssignments || {})
          .filter(([key]) => key.startsWith('employee:'))
      ),
    };
    setSaving(true);
    try {
      await performanceConfigApi.updateRankingConfig(latestConfig as unknown as Record<string, unknown>);
      toast.success('考核范围已保存；模板会按规则自动推荐，员工个人模板调整按本页设置生效');
      await loadData();
    } catch (error: any) {
      toast.error('保存失败: ' + (error.message || String(error)));
    } finally {
      setSaving(false);
    }
  };

  const renderEmployee = (employee: Employee) => {
    const checked = isMarked(employee);
    const participating = isParticipating(employee);
    const assignmentKey = getEmployeeTemplateAssignmentKey(employee.id);
    const overrideTemplateId = rankingConfig.templateAssignments?.[assignmentKey] || '';
    const overrideTemplate = overrideTemplateId ? templateMap.get(overrideTemplateId) : null;
    const preview = assignmentPreviews.get(employee.id);
    const autoTemplate = preview?.template || null;
    return (
      <div key={employee.id} className="flex flex-wrap items-center gap-3 rounded-md px-3 py-2 pl-12 hover:bg-gray-50">
        <Checkbox checked={checked} onCheckedChange={(value) => toggleEmployee(employee, value === true)} />
        <UserRound className="h-4 w-4 text-gray-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
          <div className="text-xs text-gray-500">{employee.position || employee.role} · {employee.level || '未分级'} · {employee.id}</div>
          <div className="mt-1 text-xs text-gray-500">
            自动推荐：{autoTemplate?.name || '暂无匹配模板'}
            {preview?.matchReason ? `（${preview.matchReason}）` : ''}
          </div>
        </div>
        <Badge variant={participating ? 'default' : 'outline'} className="text-xs">
          {participating ? '参与' : '不参与'}
        </Badge>
        {participating && (
          <div className="w-full lg:w-[320px]">
            <Select
              value={overrideTemplateId || '__auto__'}
              onValueChange={(value) => setEmployeeTemplate(employee.id, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="按规则自动推荐" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">
                  {autoTemplate ? `按规则自动推荐：${autoTemplate.name}` : '按规则自动推荐'}
                </SelectItem>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>HR/Admin 可指定员工模板</SelectLabel>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} · {getTemplateTypeLabel(template.departmentType)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {overrideTemplate && (
              <div className="mt-1 text-xs text-amber-700">当前已人工指定：{overrideTemplate.name}</div>
            )}
          </div>
        )}
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
              按组织树选择谁参与考核；模板由系统按部门、岗位和任职资格等级自动推荐，少数员工可由 HR/Admin 单独调整。
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
          <Badge variant="outline" className="text-sm">员工模板调整：{selectedTemplateCount} 人</Badge>
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
