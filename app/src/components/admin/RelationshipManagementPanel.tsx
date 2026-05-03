import { useEffect, useMemo, useState } from 'react';
import { GitBranch, Save, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeeApi } from '@/services/api';
import type { Employee } from '@/types';

const NO_MANAGER = '__none__';
const RELATIONSHIP_PAGE_SIZE = 80;

function isActiveEmployee(employee: Employee) {
  return !(employee as any).status || (employee as any).status === 'active';
}

interface RelationshipManagementPanelProps {
  refreshSignal?: number;
  title?: string;
  description?: string;
}

export function RelationshipManagementPanel({
  refreshSignal = 0,
  title = '直属上级关系维护',
  description = '上传人事档案后，如果直属上级还需要人工调整，可以直接在这里维护。',
}: RelationshipManagementPanelProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [showMissingManagersOnly, setShowMissingManagersOnly] = useState(false);
  const [relationshipPage, setRelationshipPage] = useState(1);
  const [pendingEmployeeManagers, setPendingEmployeeManagers] = useState<Record<string, string>>({});
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);

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
      const employeeRes = await employeeApi.getAll({ includeDisabled: true });

      const employeeList = employeeRes.success && Array.isArray(employeeRes.data) ? employeeRes.data : [];

      setEmployees(employeeList);
      syncPendingManagers(employeeList);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '加载组织关系失败');
      setEmployees([]);
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

  useEffect(() => {
    setRelationshipPage(1);
  }, [relationshipSearch, showMissingManagersOnly]);

  const relationshipTotalPages = Math.max(1, Math.ceil(relationshipEmployees.length / RELATIONSHIP_PAGE_SIZE));

  useEffect(() => {
    setRelationshipPage((page) => Math.min(page, relationshipTotalPages));
  }, [relationshipTotalPages]);

  const pagedRelationshipEmployees = useMemo(() => {
    const start = (relationshipPage - 1) * RELATIONSHIP_PAGE_SIZE;
    return relationshipEmployees.slice(start, start + RELATIONSHIP_PAGE_SIZE);
  }, [relationshipEmployees, relationshipPage]);

  const missingManagerCount = useMemo(
    () => activeEmployees.filter((employee) => !employee.managerId || !employees.some((item) => item.id === employee.managerId)).length,
    [activeEmployees, employees],
  );

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
          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
              系统管理员只维护一张“员工 → 直属上级”关系表。经理待评分名单、汇报链和催办对象都会按这张表生效，避免和“部门经理维护”重复。
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
                  {pagedRelationshipEmployees.map((employee) => {
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
            {relationshipEmployees.length > 0 && (
              <div className="flex flex-col gap-2 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
                <span>
                  当前显示第 {(relationshipPage - 1) * RELATIONSHIP_PAGE_SIZE + 1}-
                  {Math.min(relationshipPage * RELATIONSHIP_PAGE_SIZE, relationshipEmployees.length)} 人，
                  共 {relationshipEmployees.length} 人
                </span>
                {relationshipEmployees.length > RELATIONSHIP_PAGE_SIZE && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={relationshipPage <= 1}
                      onClick={() => setRelationshipPage((page) => Math.max(1, page - 1))}
                    >
                      上一页
                    </Button>
                    <span className="text-xs text-gray-400">
                      第 {relationshipPage} / {relationshipTotalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={relationshipPage >= relationshipTotalPages}
                      onClick={() => setRelationshipPage((page) => Math.min(relationshipTotalPages, page + 1))}
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
