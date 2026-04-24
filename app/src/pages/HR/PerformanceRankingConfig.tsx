import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Save,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { employeeApi, performanceConfigApi } from '@/services/api';

type EmployeeLevel = 'senior' | 'intermediate' | 'junior' | 'assistant';
type LevelGroupingStrategyType = 'all' | 'by_level' | 'by_high_low' | 'custom';

interface CustomLevelGroup {
  name: string;
  levels: EmployeeLevel[];
}

interface LevelGroupingStrategy {
  type: LevelGroupingStrategyType;
  groups?: CustomLevelGroup[];
}

interface MergeRankGroup {
  id: string;
  name: string;
  enabled: boolean;
  unitKeys: string[];
  levels: EmployeeLevel[]; // empty => all levels
}

interface PerformanceRankingConfigV1 {
  version: 1;
  participation: {
    enabledUnitKeys: string[]; // empty => all units
  };
  groupRank: {
    defaultStrategy: LevelGroupingStrategy;
    perUnit: Record<string, LevelGroupingStrategy>;
  };
  mergeRankGroups: MergeRankGroup[];
}

const LEVELS: Array<{ key: EmployeeLevel; label: string }> = [
  { key: 'senior', label: '高级' },
  { key: 'intermediate', label: '中级' },
  { key: 'junior', label: '初级' },
  { key: 'assistant', label: '助理' },
];

const STRATEGY_OPTIONS: Array<{ key: LevelGroupingStrategyType; label: string; desc: string }> = [
  { key: 'all', label: '不分等级（同榜）', desc: '同一部门全员排在一个榜单' },
  { key: 'by_level', label: '按等级分榜', desc: '同一部门按员工等级分别排名' },
  { key: 'by_high_low', label: '按高/低两档', desc: '高：高级/中级；低：初级/助理' },
  { key: 'custom', label: '自定义分组', desc: '自定义多个等级组合分组' },
];

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function uniqSorted(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function buildStrategy(type: LevelGroupingStrategyType, existing?: LevelGroupingStrategy): LevelGroupingStrategy {
  if (type !== 'custom') return { type };
  const groups = existing?.groups && existing.groups.length > 0
    ? existing.groups
    : [
        { name: '高', levels: ['senior', 'intermediate'] },
        { name: '低', levels: ['junior', 'assistant'] },
      ];
  return { type: 'custom', groups };
}

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `grp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

type OrgDerived = {
  roots: string[];
  childrenByRoot: Record<string, string[]>;
};

function deriveOrgFromEmployees(employees: any[]): OrgDerived {
  const roots = new Set<string>();
  const childrenByRoot: Record<string, Set<string>> = {};

  for (const e of employees || []) {
    const dept = String(e?.department || '').trim();
    const sub = String(e?.subDepartment || '').trim();

    if (dept) roots.add(dept);
    if (!dept && sub) roots.add(sub);

    if (dept && sub) {
      if (!childrenByRoot[dept]) childrenByRoot[dept] = new Set<string>();
      childrenByRoot[dept].add(sub);
    }
  }

  const rootsArr = Array.from(roots).sort((a, b) => a.localeCompare(b));
  const childrenArr: Record<string, string[]> = {};
  for (const root of rootsArr) {
    childrenArr[root] = Array.from(childrenByRoot[root] || []).sort((a, b) => a.localeCompare(b));
  }

  return { roots: rootsArr, childrenByRoot: childrenArr };
}

function getUnitKey(root: string, child?: string): string {
  const r = String(root || '').trim();
  const c = String(child || '').trim();
  if (r && c) return `${r}/${c}`;
  return r || c;
}

export function PerformanceRankingConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState<PerformanceRankingConfigV1>({
    version: 1,
    participation: { enabledUnitKeys: [] },
    groupRank: { defaultStrategy: { type: 'by_high_low' }, perUnit: {} },
    mergeRankGroups: [],
  });

  const [roots, setRoots] = useState<string[]>([]);
  const [childrenByRoot, setChildrenByRoot] = useState<Record<string, string[]>>({});

  const [previewMonth, setPreviewMonth] = useState(getCurrentMonth());
  const [previewLoading, setPreviewLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);

  const allUnits = config.participation.enabledUnitKeys.length === 0;

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [cfgRes, empRes] = await Promise.all([
        performanceConfigApi.getRankingConfig(),
        employeeApi.getAll(),
      ]);

      if (cfgRes?.success && cfgRes.data) {
        setConfig(cfgRes.data as PerformanceRankingConfigV1);
      }

      if (empRes?.success && Array.isArray(empRes.data)) {
        const derived = deriveOrgFromEmployees(empRes.data);
        setRoots(derived.roots);
        setChildrenByRoot(derived.childrenByRoot);
      }
    } catch (e: any) {
      toast.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const setAllUnitsMode = (enabled: boolean) => {
    setConfig((prev) => {
      if (enabled) {
        return { ...prev, participation: { ...prev.participation, enabledUnitKeys: [] } };
      }
      const next = roots.length > 0 ? [...roots] : [];
      return { ...prev, participation: { ...prev.participation, enabledUnitKeys: uniqSorted(next) } };
    });
    if (!enabled) {
      toast.message('已切换为自定义参与范围（默认勾选全部部门，可取消不参与的部门）');
    }
  };

  const toggleParticipationRoot = (root: string, checked: boolean) => {
    setConfig((prev) => {
      const existing = prev.participation.enabledUnitKeys || [];
      let next = existing.filter((k) => k !== root);
      if (checked) {
        next = next.filter((k) => !k.startsWith(`${root}/`));
        next.push(root);
      }
      return { ...prev, participation: { ...prev.participation, enabledUnitKeys: uniqSorted(next) } };
    });
  };

  const toggleParticipationChild = (root: string, child: string, checked: boolean) => {
    const key = getUnitKey(root, child);
    setConfig((prev) => {
      const existing = prev.participation.enabledUnitKeys || [];
      const next = checked ? [...existing, key] : existing.filter((k) => k !== key);
      return { ...prev, participation: { ...prev.participation, enabledUnitKeys: uniqSorted(next) } };
    });
  };

  const setDefaultStrategyType = (type: LevelGroupingStrategyType) => {
    setConfig((prev) => ({
      ...prev,
      groupRank: {
        ...prev.groupRank,
        defaultStrategy: buildStrategy(type, prev.groupRank.defaultStrategy),
      },
    }));
  };

  const setUnitStrategyType = (unitKey: string, typeOrDefault: LevelGroupingStrategyType | 'default') => {
    setConfig((prev) => {
      const perUnit = { ...(prev.groupRank.perUnit || {}) };
      if (typeOrDefault === 'default') {
        delete perUnit[unitKey];
      } else {
        perUnit[unitKey] = buildStrategy(typeOrDefault, perUnit[unitKey]);
      }
      return { ...prev, groupRank: { ...prev.groupRank, perUnit } };
    });
  };

  const setMergeGroup = (id: string, updater: (g: MergeRankGroup) => MergeRankGroup) => {
    setConfig((prev) => ({
      ...prev,
      mergeRankGroups: (prev.mergeRankGroups || []).map((g) => (g.id === id ? updater(g) : g)),
    }));
  };

  const addMergeGroup = () => {
    const id = generateId();
    setConfig((prev) => ({
      ...prev,
      mergeRankGroups: [
        ...(prev.mergeRankGroups || []),
        { id, name: `合并组${(prev.mergeRankGroups || []).length + 1}`, enabled: true, unitKeys: [], levels: [] },
      ],
    }));
  };

  const removeMergeGroup = (id: string) => {
    setConfig((prev) => ({ ...prev, mergeRankGroups: (prev.mergeRankGroups || []).filter((g) => g.id !== id) }));
  };

  const moveMergeGroup = (id: string, direction: -1 | 1) => {
    setConfig((prev) => {
      const groups = [...(prev.mergeRankGroups || [])];
      const idx = groups.findIndex((g) => g.id === id);
      if (idx < 0) return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= groups.length) return prev;
      const [item] = groups.splice(idx, 1);
      groups.splice(nextIdx, 0, item);
      return { ...prev, mergeRankGroups: groups };
    });
  };

  const toggleMergeGroupUnitRoot = (group: MergeRankGroup, root: string, checked: boolean) => {
    const existing = group.unitKeys || [];
    let next = existing.filter((k) => k !== root);
    if (checked) {
      next = next.filter((k) => !k.startsWith(`${root}/`));
      next.push(root);
    }
    setMergeGroup(group.id, (g) => ({ ...g, unitKeys: uniqSorted(next) }));
  };

  const toggleMergeGroupUnitChild = (group: MergeRankGroup, root: string, child: string, checked: boolean) => {
    const key = getUnitKey(root, child);
    const existing = group.unitKeys || [];
    const next = checked ? [...existing, key] : existing.filter((k) => k !== key);
    setMergeGroup(group.id, (g) => ({ ...g, unitKeys: uniqSorted(next) }));
  };

  const toggleMergeGroupAllLevels = (group: MergeRankGroup, enabled: boolean) => {
    if (enabled) {
      setMergeGroup(group.id, (g) => ({ ...g, levels: [] }));
      return;
    }
    setMergeGroup(group.id, (g) => ({ ...g, levels: LEVELS.map((l) => l.key) }));
  };

  const toggleMergeGroupLevel = (group: MergeRankGroup, level: EmployeeLevel, checked: boolean) => {
    const existing = group.levels || [];
    const next = checked ? [...existing, level] : existing.filter((l) => l !== level);
    setMergeGroup(group.id, (g) => ({ ...g, levels: uniqSorted(next) as EmployeeLevel[] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await performanceConfigApi.updateRankingConfig(config);
      if (res?.success && res.data) {
        setConfig(res.data as PerformanceRankingConfigV1);
        toast.success('配置已保存');
      } else {
        toast.error(res?.message || '保存失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    const month = String(previewMonth || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast.error('月份格式应为 YYYY-MM');
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await performanceConfigApi.previewRanking(month);
      if (res?.success) {
        setPreviewData(res.data);
        toast.success('预览已更新');
      } else {
        toast.error(res?.message || '预览失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '预览失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRecalc = async () => {
    const month = String(previewMonth || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast.error('月份格式应为 YYYY-MM');
      return;
    }
    setRecalcLoading(true);
    try {
      const res = await performanceConfigApi.recalculateMonthRanks(month);
      if (res?.success) {
        toast.success('排名已重新计算');
      } else {
        toast.error(res?.message || '重算失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '重算失败');
    } finally {
      setRecalcLoading(false);
    }
  };

  const effectiveUnitKeysLabel = useMemo(() => {
    if (allUnits) return '全公司参与（默认）';
    return `已勾选 ${config.participation.enabledUnitKeys.length} 个单位`;
  }, [allUnits, config.participation.enabledUnitKeys.length]);

  const defaultStrategyLabel = useMemo(() => {
    const key = config.groupRank.defaultStrategy?.type || 'by_high_low';
    return STRATEGY_OPTIONS.find((o) => o.key === key)?.label || key;
  }, [config.groupRank.defaultStrategy?.type]);

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">绩效参与范围 & 排名规则</h2>
          <p className="text-gray-500 mt-1">
            这里决定：哪些部门参与打分、同部门不同等级是否分榜、以及跨部门合并排名的规则（影响组内/跨部门排名字段）。
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? '保存中...' : '保存配置'}
        </Button>
      </div>

      {/* Participation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            参与部门（可先不参与，后续再加入）
          </CardTitle>
          <CardDescription>
            当前：<Badge variant="secondary">{effectiveUnitKeysLabel}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div className="space-y-3 flex-1">
              <div className="space-y-1">
                <div className="font-medium">参与范围模式</div>
                <div className="text-sm text-muted-foreground">开启后视为所有部门都参与（enabledUnitKeys 为空）</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={allUnits ? 'default' : 'outline'}
                  onClick={() => setAllUnitsMode(true)}
                >
                  全公司参与
                </Button>
                <Button
                  type="button"
                  variant={allUnits ? 'outline' : 'default'}
                  onClick={() => setAllUnitsMode(false)}
                >
                  自定义部门范围
                </Button>
              </div>
            </div>
            <div className="pl-4">
              <Switch checked={allUnits} onCheckedChange={setAllUnitsMode} />
            </div>
          </div>

          {allUnits && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="font-medium text-amber-900">如果要选择“哪些部门参与、哪些部门不参与”</div>
              <div className="text-sm text-amber-800">
                请先关闭上面的“全公司参与”开关。关闭后，下面会自动出现部门勾选列表；系统会默认先勾选全部部门，你只需要取消不参与的部门即可。
              </div>
              <div>
                <Button type="button" variant="outline" onClick={() => setAllUnitsMode(false)}>
                  改为自定义部门范围
                </Button>
              </div>
            </div>
          )}

          {!allUnits && (
            <>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                当前是“自定义参与范围”模式。默认已勾选全部部门，你可以取消不参与的一级部门，或只保留需要参与的二级部门。
              </div>

              <div>
                <Label className="text-base font-medium">整部门参与（一级部门）</Label>
                <p className="text-sm text-muted-foreground mb-3">勾选后，该一级部门下所有二级部门均参与。</p>
                <div className="flex flex-wrap gap-4">
                  {roots.map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={config.participation.enabledUnitKeys.includes(r)}
                        onCheckedChange={(checked) => toggleParticipationRoot(r, !!checked)}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                  {roots.length === 0 && (
                    <p className="text-sm text-muted-foreground">暂无部门数据（请先维护员工部门/组织架构）</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">部分二级部门参与</Label>
                <p className="text-sm text-muted-foreground mb-3">仅勾选的二级部门参与，未勾选的同级部门不参与。</p>
                <div className="space-y-4">
                  {roots.map((root) => {
                    const children = childrenByRoot[root] || [];
                    if (children.length === 0) return null;
                    const rootSelected = config.participation.enabledUnitKeys.includes(root);
                    return (
                      <div key={root} className="border rounded-lg p-4 space-y-2">
                        <div className="font-medium text-gray-700 flex items-center gap-2">
                          <span>{root}</span>
                          {rootSelected && <Badge variant="secondary">已整部门参与</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-4 pl-4">
                          {children.map((c) => {
                            const key = getUnitKey(root, c);
                            return (
                              <label key={key} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  disabled={rootSelected}
                                  checked={config.participation.enabledUnitKeys.includes(key)}
                                  onCheckedChange={(checked) => toggleParticipationChild(root, c, !!checked)}
                                />
                                <span className={rootSelected ? 'text-muted-foreground' : ''}>{c}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Group rank strategy */}
      <Card>
        <CardHeader>
          <CardTitle>同部门不同等级：分榜策略（组内排名）</CardTitle>
          <CardDescription>
            默认策略：<Badge variant="secondary">{defaultStrategyLabel}</Badge>（可按部门覆盖；支持“一级部门”作为前缀覆盖二级部门）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>默认分组策略</Label>
              <Select
                value={config.groupRank.defaultStrategy?.type || 'by_high_low'}
                onValueChange={(v) => setDefaultStrategyType(v as LevelGroupingStrategyType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {STRATEGY_OPTIONS.find((o) => o.key === (config.groupRank.defaultStrategy?.type || 'by_high_low'))?.desc}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-medium text-gray-700">按部门覆盖（可选）</div>
            <div className="space-y-3">
              {roots.map((root) => {
                const children = childrenByRoot[root] || [];
                const rootOverride = config.groupRank.perUnit?.[root]?.type;
                return (
                  <div key={root} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium">{root}</div>
                      <Select
                        value={(rootOverride || 'default') as any}
                        onValueChange={(v) => setUnitStrategyType(root, v as any)}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="使用默认策略" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">使用默认策略</SelectItem>
                          {STRATEGY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.key} value={opt.key}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {children.length > 0 && (
                      <div className="pl-2 space-y-2">
                        <div className="text-sm text-muted-foreground">二级部门（可覆盖父级策略）</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {children.map((c) => {
                            const key = getUnitKey(root, c);
                            const override = config.groupRank.perUnit?.[key]?.type;
                            return (
                              <div key={key} className="flex items-center justify-between gap-3 rounded border p-2">
                                <div className="text-sm">{c}</div>
                                <Select
                                  value={(override || 'default') as any}
                                  onValueChange={(v) => setUnitStrategyType(key, v as any)}
                                >
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="继承父级/默认" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="default">继承父级/默认</SelectItem>
                                    {STRATEGY_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.key} value={opt.key}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {roots.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无部门数据（请先维护员工部门/组织架构）</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Merge ranks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <span>跨部门合并排名（可按部门+等级合并）</span>
            <Button variant="secondary" onClick={addMergeGroup}>
              <Plus className="w-4 h-4 mr-2" />
              新增合并组
            </Button>
          </CardTitle>
          <CardDescription>同一条记录命中多个合并组时，按列表顺序“先命中优先”（可上下移动排序）。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(config.mergeRankGroups || []).length === 0 && (
            <p className="text-sm text-muted-foreground">暂无合并组。需要跨部门合并排名时再添加。</p>
          )}

          {(config.mergeRankGroups || []).map((g, idx) => {
            const allLevelsInGroup = (g.levels || []).length === 0;
            return (
              <div key={g.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{idx + 1}</Badge>
                      <Input
                        value={g.name}
                        onChange={(e) => setMergeGroup(g.id, (prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="合并组名称"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      unitKeys 为空 = 不限制部门；levels 为空 = 不限制等级（全部等级）
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">启用</span>
                      <Switch
                        checked={!!g.enabled}
                        onCheckedChange={(checked) => setMergeGroup(g.id, (prev) => ({ ...prev, enabled: !!checked }))}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveMergeGroup(g.id, -1)}
                      disabled={idx === 0}
                      title="上移"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveMergeGroup(g.id, 1)}
                      disabled={idx === (config.mergeRankGroups || []).length - 1}
                      title="下移"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeMergeGroup(g.id)} title="删除">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                {/* Units */}
                <div className="space-y-2">
                  <Label>合并的部门（可选）</Label>
                  <div className="text-sm text-muted-foreground">勾选一级部门将包含其下所有二级部门。</div>
                  <div className="flex flex-wrap gap-4">
                    {roots.map((r) => (
                      <label key={`${g.id}-${r}`} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(g.unitKeys || []).includes(r)}
                          onCheckedChange={(checked) => toggleMergeGroupUnitRoot(g, r, !!checked)}
                        />
                        <span>{r}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-3 pt-2">
                    {roots.map((root) => {
                      const children = childrenByRoot[root] || [];
                      if (children.length === 0) return null;
                      const rootSelected = (g.unitKeys || []).includes(root);
                      return (
                        <div key={`${g.id}-${root}`} className="border rounded-lg p-3 space-y-2">
                          <div className="font-medium text-gray-700 flex items-center gap-2">
                            <span>{root}</span>
                            {rootSelected && <Badge variant="secondary">已包含全部</Badge>}
                          </div>
                          <div className="flex flex-wrap gap-4 pl-4">
                            {children.map((c) => {
                              const key = getUnitKey(root, c);
                              return (
                                <label key={`${g.id}-${key}`} className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    disabled={rootSelected}
                                    checked={(g.unitKeys || []).includes(key)}
                                    onCheckedChange={(checked) => toggleMergeGroupUnitChild(g, root, c, !!checked)}
                                  />
                                  <span className={rootSelected ? 'text-muted-foreground' : ''}>{c}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Levels */}
                <div className="space-y-2">
                  <Label>合并的等级（可选）</Label>
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <div className="space-y-1">
                      <div className="font-medium">全部等级</div>
                      <div className="text-sm text-muted-foreground">开启后 levels 为空，表示不限制等级</div>
                    </div>
                    <Switch checked={allLevelsInGroup} onCheckedChange={(checked) => toggleMergeGroupAllLevels(g, !!checked)} />
                  </div>
                  {!allLevelsInGroup && (
                    <div className="flex flex-wrap gap-4">
                      {LEVELS.map((l) => (
                        <label key={`${g.id}-lvl-${l.key}`} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={(g.levels || []).includes(l.key)}
                            onCheckedChange={(checked) => toggleMergeGroupLevel(g, l.key, !!checked)}
                          />
                          <span>{l.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <span>规则预览（按月）</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handlePreview} disabled={previewLoading}>
                <Eye className="w-4 h-4 mr-2" />
                {previewLoading ? '预览中...' : '预览'}
              </Button>
              <Button variant="secondary" onClick={handleRecalc} disabled={recalcLoading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {recalcLoading ? '重算中...' : '重算该月排名'}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>预览只统计该月已完成评分的记录（completed）。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>月份（YYYY-MM）</Label>
              <Input value={previewMonth} onChange={(e) => setPreviewMonth(e.target.value)} placeholder="2026-04" />
            </div>
          </div>

          {previewData && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">完成记录：{previewData.completedCount}</Badge>
                <Badge variant="outline">纳入排名：{previewData.includedCount}</Badge>
                <Badge variant="outline">排除：{previewData.excludedCount}</Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">排除部门（Top）</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(previewData.excludedUnits || []).slice(0, 20).map((x: any) => (
                      <div key={x.key} className="flex items-center justify-between text-sm">
                        <span className="truncate">{x.key}</span>
                        <Badge variant="secondary">{x.count}</Badge>
                      </div>
                    ))}
                    {(previewData.excludedUnits || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">无</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">分组榜单（Top）</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(previewData.groups || []).slice(0, 20).map((x: any) => (
                      <div key={x.key} className="flex items-center justify-between text-sm">
                        <span className="truncate">{x.key}</span>
                        <Badge variant="secondary">{x.count}</Badge>
                      </div>
                    ))}
                    {(previewData.groups || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">无</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">合并组命中数</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(previewData.mergeGroups || []).map((x: any) => (
                      <div key={x.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{x.name}</span>
                        <Badge variant={x.enabled ? 'secondary' : 'outline'}>{x.count}</Badge>
                      </div>
                    ))}
                    {(previewData.mergeGroups || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">无</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PerformanceRankingConfig;
