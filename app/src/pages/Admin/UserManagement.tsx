import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronUp,
  Edit,
  GitBranch,
  KeyRound,
  Plus,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeeForm } from '@/pages/HR/EmployeeManagement/EmployeeForm';
import { employeeApi, organizationApi } from '@/services/api';
import type { Department, Employee, EmployeeLevel } from '@/types';

const NO_MANAGER = '__none__';

type EmployeeFormState = {
  id: string;
  name: string;
  department: string;
  subDepartment: string;
  role: 'employee' | 'manager' | 'gm' | 'hr' | 'admin';
  level: EmployeeLevel;
  managerId: string;
  idCardLast6: string;
  wecomUserId: string;
};

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

export function UserManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [showMissingManagersOnly, setShowMissingManagersOnly] = useState(false);
  const [departmentRelationshipSearch, setDepartmentRelationshipSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [reportChain, setReportChain] = useState<Employee[]>([]);
  const [subordinates, setSubordinates] = useState<Employee[]>([]);
  const [pendingEmployeeManagers, setPendingEmployeeManagers] = useState<Record<string, string>>({});
  const [pendingDepartmentManagers, setPendingDepartmentManagers] = useState<Record<string, string>>({});
  const [syncDepartmentAssignments, setSyncDepartmentAssignments] = useState<Record<string, boolean>>({});
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [savingDepartmentKey, setSavingDepartmentKey] = useState<string | null>(null);
  const [passwordDialogEmployee, setPasswordDialogEmployee] = useState<Employee | null>(null);
  const [resetIdCardLast6, setResetIdCardLast6] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [customPasswordConfirm, setCustomPasswordConfirm] = useState('');
  const [savingPasswordAction, setSavingPasswordAction] = useState<'id-card' | 'custom' | null>(null);

  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>({
    id: '',
    name: '',
    department: '',
    subDepartment: '',
    role: 'employee',
    level: 'intermediate',
    managerId: '',
    idCardLast6: '',
    wecomUserId: '',
  });

  const syncPendingManagers = (list: Employee[]) => {
    setPendingEmployeeManagers(
      list.reduce<Record<string, string>>((acc, employee) => {
        acc[employee.id] = employee.managerId || NO_MANAGER;
        return acc;
      }, {})
    );
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [employeeRes, departmentRes] = await Promise.all([
        employeeApi.getAll({ includeDisabled: true }),
        organizationApi.getAllDepartments(),
      ]);

      if (employeeRes.success && Array.isArray(employeeRes.data)) {
        setEmployees(employeeRes.data);
        syncPendingManagers(employeeRes.data);
      } else {
        setEmployees([]);
        setLoadError(employeeRes?.message || '用户数据加载失败');
      }

      if (departmentRes.success && Array.isArray(departmentRes.data)) {
        setDepartments(departmentRes.data);
      } else {
        setDepartments([]);
      }
    } catch (error: any) {
      console.error(error);
      setEmployees([]);
      setDepartments([]);
      setLoadError(error?.message || '用户数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const activeEmployees = useMemo(() => employees.filter(isActiveEmployee), [employees]);
  const managerCandidates = useMemo(
    () => activeEmployees
      .filter((employee) => ['manager', 'gm', 'hr', 'admin'].includes(employee.role))
      .sort((a, b) => `${a.department}-${a.name}`.localeCompare(`${b.department}-${b.name}`, 'zh-CN')),
    [activeEmployees]
  );

  const managerMap = useMemo(
    () => new Map(managerCandidates.map((employee) => [employee.id, employee])),
    [managerCandidates]
  );

  const departmentPathMap = useMemo(() => getDepartmentPathMap(departments), [departments]);

  const filteredEmployees = employees.filter((employee) => {
    return employee.name.toLowerCase().includes(searchQuery.toLowerCase())
      && (filterRole === 'all' || employee.role === filterRole);
  });

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
    [activeEmployees, employees]
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

  const handleSaveEmployee = async () => {
    const idCardLast6 = employeeForm.idCardLast6.trim();
    if (!editingEmployee && !/^[0-9Xx]{6}$/.test(idCardLast6)) {
      toast.error('新增用户必须录入身份证后六位，作为首次登录口令');
      return;
    }
    if (editingEmployee && idCardLast6 && !/^[0-9Xx]{6}$/.test(idCardLast6)) {
      toast.error('身份证后六位格式不正确');
      return;
    }

    try {
      if (editingEmployee) {
        await employeeApi.updateEmployee(editingEmployee.id, employeeForm);
        toast.success('员工信息已更新');
      } else {
        await employeeApi.create(employeeForm);
        toast.success('员工已添加，登录口令为身份证后六位');
      }
      setShowAddDialog(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      id: employee.id,
      name: employee.name,
      department: employee.department,
      subDepartment: employee.subDepartment,
      role: employee.role,
      level: employee.level,
      managerId: employee.managerId || '',
      idCardLast6: '',
      wecomUserId: employee.wecomUserId || '',
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该员工吗？')) return;
    try {
      await employeeApi.deleteEmployee(id);
      toast.success('员工已删除');
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const openPasswordDialog = (employee: Employee) => {
    setPasswordDialogEmployee(employee);
    setResetIdCardLast6('');
    setCustomPassword('');
    setCustomPasswordConfirm('');
    setSavingPasswordAction(null);
  };

  const closePasswordDialog = () => {
    setPasswordDialogEmployee(null);
    setResetIdCardLast6('');
    setCustomPassword('');
    setCustomPasswordConfirm('');
    setSavingPasswordAction(null);
  };

  const handleResetPasswordToIdCard = async () => {
    if (!passwordDialogEmployee) return;
    const idCardLast6 = resetIdCardLast6.trim();
    if (idCardLast6 && !/^[0-9Xx]{6}$/.test(idCardLast6)) {
      toast.error('身份证后六位格式不正确');
      return;
    }
    if (!idCardLast6 && !passwordDialogEmployee.hasIdCardLast6) {
      toast.error('该员工未录入身份证后六位，请先在这里补录后再重置');
      return;
    }

    setSavingPasswordAction('id-card');
    try {
      await employeeApi.resetPassword(passwordDialogEmployee.id, idCardLast6 ? { idCardLast6 } : undefined);
      toast.success('登录口令已重置为身份证后六位');
      closePasswordDialog();
      await fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || '重置失败');
    } finally {
      setSavingPasswordAction(null);
    }
  };

  const handleSetCustomPassword = async () => {
    if (!passwordDialogEmployee) return;
    if (customPassword.length < 8) {
      toast.error('新密码至少 8 位');
      return;
    }
    if (customPassword !== customPasswordConfirm) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    setSavingPasswordAction('custom');
    try {
      await employeeApi.resetPassword(passwordDialogEmployee.id, { newPassword: customPassword });
      toast.success('登录密码已设置');
      closePasswordDialog();
      await fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || '设置失败');
    } finally {
      setSavingPasswordAction(null);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await employeeApi.toggleStatus(id);
      toast.success('状态已更新');
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  const handleShowDetail = (employee: Employee) => {
    setDetailEmployee(employee);
    const chain: Employee[] = [];
    let current = employee;
    const visited = new Set<string>();
    while (current.managerId && !visited.has(current.managerId)) {
      visited.add(current.managerId);
      const manager = employees.find((item) => item.id === current.managerId);
      if (manager) {
        chain.push(manager);
        current = manager;
      } else {
        break;
      }
    }
    setReportChain(chain);
    setSubordinates(employees.filter((item) => item.managerId === employee.id));
    setShowDetailDialog(true);
  };

  const resetForm = () => setEmployeeForm({
    id: '',
    name: '',
    department: '',
    subDepartment: '',
    role: 'employee',
    level: 'intermediate',
    managerId: '',
    idCardLast6: '',
    wecomUserId: '',
  });

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').slice(1);
    let successCount = 0;
    let failCount = 0;
    for (const line of lines) {
      const values = line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
      if (values.length >= 2 && values[1]) {
        const idCardLast6 = (values[7] || '').trim().toUpperCase();
        if (!/^[0-9Xx]{6}$/.test(idCardLast6)) {
          failCount++;
          continue;
        }
        try {
          await employeeApi.create({
            id: values[0] || `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: values[1],
            department: values[2] || '总公司',
            subDepartment: values[3] || '',
            role: values[4] || 'employee',
            level: values[5] || 'intermediate',
            managerId: values[6] || undefined,
            idCardLast6,
          });
          successCount++;
        } catch {
          failCount++;
        }
      }
    }
    toast.success(`导入完成: 成功${successCount}名, 失败${failCount}名`);
    fetchEmployees();
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
      await fetchEmployees();
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
      await fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || '部门经理关系保存失败');
    } finally {
      setSavingDepartmentKey(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      employee: { label: '员工', variant: 'secondary' },
      manager: { label: '经理', variant: 'default' },
      hr: { label: 'HR', variant: 'outline' },
      gm: { label: '总经理', variant: 'default' },
      admin: { label: '管理员', variant: 'destructive' },
    };
    const info = map[role] || { label: role, variant: 'secondary' as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">用户管理</h2>
          <p className="text-gray-500 mt-1">管理员工、直属上级关系和部门经理关系</p>
        </div>
        <div className="flex gap-3">
          <label htmlFor="admin-file-upload" className="cursor-pointer">
            <Button variant="outline" asChild><span><Upload className="w-4 h-4 mr-2" />批量导入</span></Button>
            <input id="admin-file-upload" type="file" accept=".csv" onChange={handleFileImport} className="hidden" />
          </label>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingEmployee(null); }}>
                <Plus className="w-4 h-4 mr-2" />新增用户
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby="admin-emp-form-desc">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? '编辑用户' : '新增用户'}</DialogTitle>
                <p id="admin-emp-form-desc" className="text-sm text-gray-600">请填写用户信息</p>
              </DialogHeader>
              <EmployeeForm form={employeeForm} setForm={setEmployeeForm} onSave={handleSaveEmployee} onCancel={() => { setShowAddDialog(false); setEditingEmployee(null); resetForm(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GitBranch className="w-5 h-5" />上下级 / 部门经理关系维护</CardTitle>
        </CardHeader>
        <CardContent>
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
                              <Save className="w-4 h-4 mr-1" />保存
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
                            <Save className="w-4 h-4 mr-1" />保存关系
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="搜索用户姓名..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40"><SelectValue placeholder="角色" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="employee">员工</SelectItem>
                <SelectItem value="manager">经理</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="gm">总经理</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{employees.length}</div><div className="text-sm text-gray-500">当前有效用户</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{employees.filter((employee) => employee.role === 'admin').length}</div><div className="text-sm text-gray-500">管理员</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{employees.filter((employee) => employee.role === 'manager').length}</div><div className="text-sm text-gray-500">经理</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{employees.filter((employee) => employee.role === 'employee').length}</div><div className="text-sm text-gray-500">普通员工</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>用户列表 ({filteredEmployees.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">正在加载用户数据...</div>
          ) : loadError ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-red-600">{loadError}</p>
              <Button type="button" variant="outline" onClick={fetchEmployees}>重新加载</Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead>身份证口令</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.slice(0, 50).map((employee) => (
                    <TableRow key={employee.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleShowDetail(employee)}>
                      <TableCell className="text-xs text-gray-400">{employee.id}</TableCell>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{getRoleBadge(employee.role)}</TableCell>
                      <TableCell>{employee.level}</TableCell>
                      <TableCell>
                        <Badge variant={employee.hasIdCardLast6 ? 'outline' : 'destructive'}>
                          {employee.hasIdCardLast6 ? '已录入' : '待补录'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(employee as any).status === 'disabled' ? 'destructive' : 'outline'}>
                          {(employee as any).status === 'disabled' ? '已禁用' : '正常'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" title="编辑" onClick={() => handleEdit(employee)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" title="账号密码" onClick={() => openPasswordDialog(employee)}><KeyRound className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" title={(employee as any).status === 'disabled' ? '启用' : '禁用'} onClick={() => handleToggleStatus(employee.id)}>
                            {(employee as any).status === 'disabled' ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <ShieldOff className="w-4 h-4 text-orange-500" />}
                          </Button>
                          <Button size="sm" variant="ghost" title="删除" onClick={() => handleDelete(employee.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredEmployees.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">当前筛选条件下没有匹配的用户。</div>
              )}
            </>
          )}
          {filteredEmployees.length > 50 && (
            <p className="text-sm text-gray-400 mt-2 text-center">显示前50条，共{filteredEmployees.length}条</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(passwordDialogEmployee)} onOpenChange={(open) => { if (!open) closePasswordDialog(); }}>
        <DialogContent className="max-w-xl" aria-describedby="password-dialog-desc">
          <DialogHeader>
            <DialogTitle>账号密码 - {passwordDialogEmployee?.name}</DialogTitle>
            <p id="password-dialog-desc" className="text-sm text-gray-600">
              可直接设置一个新密码，也可把登录口令重置为身份证后六位。
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-medium text-gray-900">重置为身份证后六位</h4>
                  <p className="text-xs text-gray-500">
                    {passwordDialogEmployee?.hasIdCardLast6
                      ? '系统已录入该员工的身份证后六位；留空可直接重置。'
                      : '系统暂未录入身份证后六位，请在下方补录后再重置。'}
                  </p>
                </div>
                <Badge variant={passwordDialogEmployee?.hasIdCardLast6 ? 'outline' : 'destructive'}>
                  {passwordDialogEmployee?.hasIdCardLast6 ? '已录入' : '待补录'}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetIdCardLast6">身份证后六位（可选）</Label>
                <Input
                  id="resetIdCardLast6"
                  type="password"
                  maxLength={6}
                  value={resetIdCardLast6}
                  onChange={(event) => setResetIdCardLast6(event.target.value)}
                  placeholder="不填则使用档案中已录入的身份证后六位"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetPasswordToIdCard}
                disabled={savingPasswordAction !== null}
              >
                {savingPasswordAction === 'id-card' ? '重置中...' : '重置为身份证后六位'}
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <h4 className="font-medium text-gray-900">直接设置新密码</h4>
                <p className="text-xs text-gray-500">用于员工忘记密码但不想使用身份证后六位的情况；新密码至少 8 位。</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customPassword">新密码</Label>
                  <Input
                    id="customPassword"
                    type="password"
                    value={customPassword}
                    onChange={(event) => setCustomPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customPasswordConfirm">确认新密码</Label>
                  <Input
                    id="customPasswordConfirm"
                    type="password"
                    value={customPasswordConfirm}
                    onChange={(event) => setCustomPasswordConfirm(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleSetCustomPassword}
                disabled={savingPasswordAction !== null || !customPassword || !customPasswordConfirm}
              >
                {savingPasswordAction === 'custom' ? '保存中...' : '设置新密码'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg" aria-describedby="detail-desc">
          <DialogHeader>
            <DialogTitle>员工详情 - {detailEmployee?.name}</DialogTitle>
            <p id="detail-desc" className="text-sm text-gray-600">查看上下级关系</p>
          </DialogHeader>
          {detailEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">ID：</span>{detailEmployee.id}</div>
                <div><span className="text-gray-500">部门：</span>{detailEmployee.department}</div>
                <div><span className="text-gray-500">角色：</span>{detailEmployee.role}</div>
                <div><span className="text-gray-500">级别：</span>{detailEmployee.level}</div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1"><ChevronUp className="w-4 h-4" />汇报链（向上追溯）</h4>
                {reportChain.length > 0 ? (
                  <div className="space-y-1">
                    {reportChain.map((manager, index) => (
                      <div key={manager.id} className="flex items-center gap-2 text-sm" style={{ paddingLeft: `${index * 16}px` }}>
                        <span className="text-gray-400">↑</span>
                        <span className="font-medium">{manager.name}</span>
                        <Badge variant="outline" className="text-xs">{manager.role}</Badge>
                        <span className="text-gray-400">({manager.department})</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">无上级</p>}
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1"><Users className="w-4 h-4" />直接下属 ({subordinates.length})</h4>
                {subordinates.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {subordinates.map((employee) => (
                      <div key={employee.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{employee.name}</span>
                        <Badge variant="secondary" className="text-xs">{employee.role}</Badge>
                        <span className="text-gray-400">({employee.department})</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">无直接下属</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
