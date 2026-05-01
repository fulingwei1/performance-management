import { useEffect, useMemo, useState } from 'react';
import { Building2, GitBranch, Save, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { employeeApi, organizationApi } from '@/services/api';
import type { Department, Employee } from '@/types';

const NO_MANAGER = '__none__';

type DepartmentGroup = {
  key: string;
  department: string;
  subDepartment: string;
  displayName: string;
  members: Employee[];
  employeeCount: number;
  currentManagerId: string;
  currentManagerName: string;
  matchedDepartmentId?: string;
};

function isActiveEmployee(employee: Employee) {
  return !(employee as any).status || (employee as any).status === 'active';
}

function getDepartmentPathMap(departments: Department[]) {
  const map = new Map<string, Department>(departments.map((dept) => [dept.id, dept]));

  const resolvePath = (department: Department) => {
    const path: string[] = [department.name];
    const visited = new Set<string>([department.id]);
    let parentId = department.parentId;

    while (parentId) {
      const parent = map.get(parentId);
      if (!parent || visited.has(parent.id)) break;
      path.unshift(parent.name);
      visited.add(parent.id);
      parentId = parent.parentId;
    }

    return path;
  };

  return new Map<string, string[]>(departments.map((dept) => [dept.id, resolvePath(dept)]));
}

interface RelationshipManagementPanelProps {
  refreshSignal?: number;
  title?: string;
  description?: string;
}

export function RelationshipManagementPanel({
  refreshSignal = 0,
  title = '上下级 / 部门经理关系维护',
  description = '上传人事档案后，如果直属上级或部门负责人还需要人工调整，可以直接在这里维护。',
}: RelationshipManagementPanelProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [showMissingManagersOnly, setShowMissingManagersOnly] = useState(false);
  const [departmentRelationshipSearch, setDepartmentRelationshipSearch] = useState('');
  const [pendingEmployeeManagers, setPendingEmployeeManagers] = useState<Record<string, string>>({});
  const [pendingDepartmentManagers, setPendingDepartmentManagers] = useState<Record<string, string>>({});
  const [syncDepartmentAssignments, setSyncDepartmentAssignments] = useState<Record<string, boolean>>({});
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [savingDepartmentKey, setSavingDepartmentKey] = useState<string | null>(null);

  const syncPendingManagers = (list: Employee[]) => {
    setPendingEmployeeManagers(
      list.reduce<Record<string, string>>((acc, employee) => {
        acc[employee.id] = employee.managerId || NO_MANAGER;
        return acc;
      }, {}),
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [employeeRes, departmentRes] = await Promise.all([
        employeeApi.getAll({ includeDisabled: true }),
        organizationApi.getAllDepartments(),
      ]);

      const employeeList = employeeRes.success && Array.isArray(employeeRes.data) ? employeeRes.data : [];
      const departmentList = departmentRes.success && Array.isArray(departmentRes.data) ? departmentRes.data : [];

      setEmployees(employeeList);
      setDepartments(departmentList);
      syncPendingManagers(employeeList);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '加载组织关系失败');
      setEmployees([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshSignal]);

  const activeEmployees = useMemo(() => employees.filter(isActiveEmployee), [employees]);
  const managerCandidates = useMemo(
    () => activeEmployees
      .filter((employee) => ['manager', 'gm', 'hr', 'admin'].includes(employee.role))
      .sort((a, b) => `${a.department}-${a.name}`.localeCompare(`${b.department}-${b.name}`, 'zh-CN')),
    [activeEmployees],
  );

  const managerMap = useMemo(
    () => new Map(managerCandidates.map((employee) => [employee.id, employee])),
    [managerCandidates],
  );

  const departmentPathMap = useMemo(() => getDepartmentPathMap(departments), [departments]);

  const relationshipEmployees = useMemo(() => {
    const keyword = relationshipSearch.trim().toLowerCase();
    return activeEmployees.filter((employee) => {
      const hasMissingManager = !employee.managerId || !employees.some((item) => item.id === employee.managerId);
      if (showMissingManagersOnly && !hasMissingManager) return false;
      if (!keyword) return true;
      const managerName = employee.managerId ? managerMap.get(employee.managerId)?.name || '' : '';
      return [employee.name, employee.department, employee.subDepartment || '', managerName]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [activeEmployees, employees, relationshipSearch, managerMap, showMissingManagersOnly]);

  const missingManagerCount = useMemo(
    () => activeEmployees.filter((employee) => !employee.managerId || !employees.some((item) => item.id === employee.managerId)).length,
    [activeEmployees, employees],
  );

  const departmentGroups = useMemo<DepartmentGroup[]>(() => {
    const groups = new Map<string, Employee[]>();
    for (const employee of activeEmployees) {
      const key = `${employee.department}||${employee.subDepartment || ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(employee);
    }

    const entries: DepartmentGroup[] = [];
    groups.forEach((members, key) => {
      const [department, subDepartment] = key.split('||');
      const path = [department, ...(subDepartment ? subDepartment.split('/').filter(Boolean) : [])];
      const matchedDepartment = departments.find((item) => {
        const itemPath = departmentPathMap.get(item.id) || [item.name];
        return itemPath.join('/') === path.join('/');
      });

      const directEmployees = members.filter((employee) => employee.role === 'employee');
      const managerCounts = new Map<string, number>();
      for (const employee of directEmployees) {
        if (!employee.managerId) continue;
        managerCounts.set(employee.managerId, (managerCounts.get(employee.managerId) || 0) + 1);
      }

      let commonManagerId = '';
      let commonManagerCount = -1;
      managerCounts.forEach((count, managerId) => {
        if (count > commonManagerCount) {
          commonManagerId = managerId;
          commonManagerCount = count;
        }
      });

      const sameGroupManager = members.find((employee) => ['manager', 'gm', 'hr', 'admin'].includes(employee.role));
      const currentManagerId = matchedDepartment?.managerId || commonManagerId || sameGroupManager?.id || '';
      const currentManagerName = currentManagerId ? managerMap.get(currentManagerId)?.name || '未匹配到姓名' : '未设置';

      entries.push({
        key,
        department,
        subDepartment,
        displayName: subDepartment ? `${department} / ${subDepartment}` : department,
        members,
        employeeCount: directEmployees.length,
        currentManagerId,
        currentManagerName,
        matchedDepartmentId: matchedDepartment?.id,
      });
    });

    return entries.sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-CN'));
  }, [activeEmployees, departments, departmentPathMap, managerMap]);

  const visibleDepartmentGroups = useMemo(() => {
    const keyword = departmentRelationshipSearch.trim().toLowerCase();
    return departmentGroups.filter((group) => {
      if (!keyword) return true;
      const selectedManagerId = pendingDepartmentManagers[group.key] || group.currentManagerId || NO_MANAGER;
      const selectedManagerName = selectedManagerId && selectedManagerId !== NO_MANAGER
        ? managerMap.get(selectedManagerId)?.name || ''
        : '';
      return [group.displayName, group.currentManagerName, selectedManagerName]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [departmentGroups, departmentRelationshipSearch, pendingDepartmentManagers, managerMap]);

  const getDepartmentManagerOptions = (group: DepartmentGroup) => {
    return [...managerCandidates].sort((left, right) => {
      const leftPriority = left.department === group.department ? 0 : 1;
      const rightPriority = right.department === group.department ? 0 : 1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return `${left.department}-${left.name}`.localeCompare(`${right.department}-${right.name}`, 'zh-CN');
    });
  };

  const handleSaveDirectManager = async (employee: Employee) => {
    const selectedManagerId = pendingEmployeeManagers[employee.id] || employee.managerId || NO_MANAGER;
    if (selectedManagerId === employee.id) {
      toast.error('直属上级不能选择员工本人');
      return;
    }

    const normalizedManagerId = selectedManagerId === NO_MANAGER ? '' : selectedManagerId;
    if ((employee.managerId || '') === normalizedManagerId) {
      toast.success('直属上级未变化，无需保存');
      return;
    }

    setSavingEmployeeId(employee.id);
    try {
      await employeeApi.updateEmployee(employee.id, { managerId: normalizedManagerId });
      toast.success(`已更新 ${employee.name} 的直属上级`);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || '直属上级保存失败');
    } finally {
      setSavingEmployeeId(null);
    }
  };

  const handleSaveDepartmentManager = async (group: DepartmentGroup) => {
    const selectedManagerId = pendingDepartmentManagers[group.key] || group.currentManagerId || NO_MANAGER;
    const syncEmployees = syncDepartmentAssignments[group.key] ?? true;
    const normalizedManagerId = selectedManagerId === NO_MANAGER ? '' : selectedManagerId;

    if (normalizedManagerId && group.members.some((member) => member.id === normalizedManagerId && member.role === 'employee')) {
      toast.error('部门经理请优先选择经理、管理员、HR或总经理角色');
      return;
    }

    if (!group.matchedDepartmentId && !syncEmployees) {
      toast.error('当前没有匹配到组织部门记录，请开启“同步普通员工直属上级”后再保存');
      return;
    }

    setSavingDepartmentKey(group.key);
    try {
      let updatedDepartmentRecord = false;
      let syncedEmployees = 0;

      if (group.matchedDepartmentId) {
        await organizationApi.updateDepartment(group.matchedDepartmentId, {
          managerId: normalizedManagerId || null,
        });
        updatedDepartmentRecord = true;
      }

      if (syncEmployees) {
        const employeeMembers = group.members.filter((member) => member.role === 'employee' && member.id !== normalizedManagerId);
        await Promise.all(employeeMembers.map((member) => employeeApi.updateEmployee(member.id, { managerId: normalizedManagerId })));
        syncedEmployees = employeeMembers.length;
      }

      const saveTargetText = updatedDepartmentRecord ? '部门经理关系' : '直属上级关系';
      const syncText = syncEmployees ? `，已同步 ${syncedEmployees} 名普通员工` : '';
      toast.success(`${group.displayName} 的${saveTargetText}已保存${syncText}`);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || '部门经理关系保存失败');
    } finally {
      setSavingDepartmentKey(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-gray-500">{description}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">正在加载组织关系...</div>
        ) : (
          <Tabs defaultValue="employee-relationship" className="space-y-4">
            <TabsList>
              <TabsTrigger value="employee-relationship">直属上级维护</TabsTrigger>
              <TabsTrigger value="department-manager">部门经理维护</TabsTrigger>
            </TabsList>

            <TabsContent value="employee-relationship" className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
                系统管理员可以直接维护每位员工的直属上级。保存后，经理待评分名单、汇报链和催办对象都会按新关系生效。
              </div>
              <div className="flex flex-col gap-3 rounded-lg border px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">只看缺少直属上级的人</p>
                  <p className="text-xs text-slate-500">当前在职员工中有 {missingManagerCount} 人没有直属上级或上级账号已失效</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={showMissingManagersOnly ? 'destructive' : 'outline'}>
                    {showMissingManagersOnly ? `仅看异常 ${relationshipEmployees.length} 人` : `全部 ${relationshipEmployees.length} 人`}
                  </Badge>
                  <Switch
                    checked={showMissingManagersOnly}
                    onCheckedChange={setShowMissingManagersOnly}
                  />
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={relationshipSearch}
                  onChange={(event) => setRelationshipSearch(event.target.value)}
                  className="pl-10"
                  placeholder="搜索员工姓名、部门、子部门、当前直属上级"
                />
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>当前直属上级</TableHead>
                      <TableHead>调整为</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relationshipEmployees.slice(0, 80).map((employee) => {
                      const selectedManagerId = pendingEmployeeManagers[employee.id] || employee.managerId || NO_MANAGER;
                      const currentManagerName = employee.managerId ? managerMap.get(employee.managerId)?.name || '未匹配到姓名' : '未设置';
                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-xs text-gray-400">{employee.id}</div>
                          </TableCell>
                          <TableCell>
                            <div>{employee.department}</div>
                            <div className="text-xs text-gray-400">{employee.subDepartment || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <div>{currentManagerName}</div>
                            <div className="text-xs text-gray-400">{employee.managerId || '未设置'}</div>
                          </TableCell>
                          <TableCell className="min-w-[260px]">
                            <Select
                              value={selectedManagerId}
                              onValueChange={(value) => setPendingEmployeeManagers((prev) => ({ ...prev, [employee.id]: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择直属上级" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_MANAGER}>（无直属上级）</SelectItem>
                                {managerCandidates
                                  .filter((candidate) => candidate.id !== employee.id)
                                  .map((candidate) => (
                                    <SelectItem key={candidate.id} value={candidate.id}>
                                      {candidate.name}（{candidate.department}{candidate.subDepartment ? ` / ${candidate.subDepartment}` : ''}）
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleSaveDirectManager(employee)}
                              disabled={savingEmployeeId === employee.id}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              保存
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {relationshipEmployees.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-500">没有找到匹配的员工。</div>
                )}
              </div>
              {relationshipEmployees.length > 80 && (
                <p className="text-sm text-gray-400 text-center">当前显示前 80 人，共 {relationshipEmployees.length} 人。</p>
              )}
            </TabsContent>

            <TabsContent value="department-manager" className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
                <p>这里维护的是“哪个部门 / 子部门由谁负责”。</p>
                <p>保存时会优先写入组织部门经理；如果开启同步，也会把该部门普通员工的直属上级一起改成这位负责人。</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={departmentRelationshipSearch}
                  onChange={(event) => setDepartmentRelationshipSearch(event.target.value)}
                  className="pl-10"
                  placeholder="搜索部门、子部门、当前部门经理"
                />
              </div>
              <div className="space-y-4">
                {visibleDepartmentGroups.map((group) => {
                  const selectedManagerId = pendingDepartmentManagers[group.key] || group.currentManagerId || NO_MANAGER;
                  const shouldSyncEmployees = syncDepartmentAssignments[group.key] ?? true;
                  const selectedManagerName = selectedManagerId && selectedManagerId !== NO_MANAGER
                    ? managerMap.get(selectedManagerId)?.name || '未匹配到姓名'
                    : '未设置';
                  return (
                    <Card key={group.key}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-500" />
                              <p className="font-semibold text-slate-900">{group.displayName}</p>
                              <Badge variant="outline">普通员工 {group.employeeCount} 人</Badge>
                              {!group.matchedDepartmentId && <Badge variant="secondary">未匹配组织记录</Badge>}
                            </div>
                            <p className="mt-2 text-sm text-slate-600">当前部门经理：{group.currentManagerName}</p>
                            <p className="text-xs text-slate-400">当前选择：{selectedManagerName}</p>
                          </div>
                          <div className="text-sm text-slate-500">
                            成员总数：{group.members.length}（含经理/HR/管理员）
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                          <div>
                            <Label>部门经理</Label>
                            <Select
                              value={selectedManagerId}
                              onValueChange={(value) => setPendingDepartmentManagers((prev) => ({ ...prev, [group.key]: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择部门经理" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_MANAGER}>（暂不设置）</SelectItem>
                                {getDepartmentManagerOptions(group).map((candidate) => (
                                  <SelectItem key={candidate.id} value={candidate.id}>
                                    {candidate.name}（{candidate.department}{candidate.subDepartment ? ` / ${candidate.subDepartment}` : ''}）
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <div className="rounded-lg border px-3 py-2 w-full">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">同步普通员工直属上级</p>
                                  <p className="text-xs text-slate-500">开启后会把本部门普通员工的直属上级一并改掉</p>
                                </div>
                                <Switch
                                  checked={shouldSyncEmployees}
                                  onCheckedChange={(checked) => setSyncDepartmentAssignments((prev) => ({ ...prev, [group.key]: checked }))}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          <span>
                            {group.matchedDepartmentId
                              ? '已匹配组织架构部门记录，保存时会同时更新组织部门经理。'
                              : '当前没有匹配到组织架构部门记录，保存时将只同步普通员工直属上级。'}
                          </span>
                          <Button
                            onClick={() => handleSaveDepartmentManager(group)}
                            disabled={savingDepartmentKey === group.key}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            保存关系
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {visibleDepartmentGroups.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-500">没有找到匹配的部门。</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

