import { useState, useEffect } from 'react';
import { Users, Plus, Upload, Search, Edit, Trash2, KeyRound, ShieldOff, ShieldCheck, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { type Employee, type EmployeeLevel } from '@/types';
import { employeeApi } from '@/services/api';
import { EmployeeForm } from '@/pages/HR/EmployeeManagement/EmployeeForm';

export function UserManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [reportChain, setReportChain] = useState<Employee[]>([]);
  const [subordinates, setSubordinates] = useState<Employee[]>([]);

  const [employeeForm, setEmployeeForm] = useState<{
    id: string; name: string; department: string; subDepartment: string;
    role: 'employee' | 'manager' | 'gm' | 'hr' | 'admin'; level: EmployeeLevel; managerId: string;
  }>({ id: '', name: '', department: '', subDepartment: '', role: 'employee', level: 'intermediate', managerId: '' });

  const fetchEmployees = async () => {
    try {
      const res = await employeeApi.getAll();
      if (res.success) setEmployees(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const filteredEmployees = employees.filter(emp => {
    return emp.name.toLowerCase().includes(searchQuery.toLowerCase())
      && (filterRole === 'all' || emp.role === filterRole);
  });

  const handleSaveEmployee = async () => {
    try {
      if (editingEmployee) {
        await employeeApi.updateEmployee(editingEmployee.id, employeeForm);
        toast.success('员工信息已更新');
      } else {
        await employeeApi.create({ ...employeeForm, password: '123456' });
        toast.success('员工已添加');
      }
      setShowAddDialog(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({ id: emp.id, name: emp.name, department: emp.department, subDepartment: emp.subDepartment, role: emp.role, level: emp.level, managerId: emp.managerId || '' });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该员工吗？')) return;
    try {
      await employeeApi.deleteEmployee(id);
      toast.success('员工已删除');
      fetchEmployees();
    } catch (e: any) { toast.error(e.message || '删除失败'); }
  };

  const handleResetPassword = async (id: string, name: string) => {
    if (!confirm(`确定要重置 ${name} 的密码为默认密码(123456)吗？`)) return;
    try {
      await employeeApi.resetPassword(id);
      toast.success('密码已重置');
    } catch (e: any) { toast.error(e.message || '重置失败'); }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await employeeApi.toggleStatus(id);
      toast.success('状态已更新');
      fetchEmployees();
    } catch (e: any) { toast.error(e.message || '操作失败'); }
  };

  const handleShowDetail = (emp: Employee) => {
    setDetailEmployee(emp);
    // Build report chain
    const chain: Employee[] = [];
    let current = emp;
    const visited = new Set<string>();
    while (current.managerId && !visited.has(current.managerId)) {
      visited.add(current.managerId);
      const manager = employees.find(e => e.id === current.managerId);
      if (manager) {
        chain.push(manager);
        current = manager;
      } else break;
    }
    setReportChain(chain);
    // Get direct subordinates
    setSubordinates(employees.filter(e => e.managerId === emp.id));
    setShowDetailDialog(true);
  };

  const resetForm = () => setEmployeeForm({ id: '', name: '', department: '', subDepartment: '', role: 'employee', level: 'intermediate', managerId: '' });

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').slice(1);
    let successCount = 0;
    let failCount = 0;
    for (const line of lines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 2 && values[1]) {
        try {
          await employeeApi.create({
            id: values[0] || `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: values[1], department: values[2] || '总公司', subDepartment: values[3] || '',
            role: values[4] || 'employee', level: values[5] || 'intermediate',
            managerId: values[6] || undefined, password: '123456'
          });
          successCount++;
        } catch { failCount++; }
      }
    }
    toast.success(`导入完成: 成功${successCount}名, 失败${failCount}名`);
    fetchEmployees();
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
          <p className="text-gray-500 mt-1">管理系统用户，支持批量导入、重置密码、启用/禁用</p>
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="搜索用户姓名..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
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

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{employees.length}</div><div className="text-sm text-gray-500">总用户数</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{employees.filter(e => e.role === 'admin').length}</div><div className="text-sm text-gray-500">管理员</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{employees.filter(e => e.role === 'manager').length}</div><div className="text-sm text-gray-500">经理</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{employees.filter(e => (e as any).status === 'disabled').length}</div><div className="text-sm text-gray-500">已禁用</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{employees.filter(e => e.role === 'employee').length}</div><div className="text-sm text-gray-500">普通员工</div></CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>用户列表 ({filteredEmployees.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.slice(0, 50).map((emp) => (
                <TableRow key={emp.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleShowDetail(emp)}>
                  <TableCell className="text-xs text-gray-400">{emp.id}</TableCell>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell>{getRoleBadge(emp.role)}</TableCell>
                  <TableCell>{emp.level}</TableCell>
                  <TableCell>
                    <Badge variant={(emp as any).status === 'disabled' ? 'destructive' : 'outline'}>
                      {(emp as any).status === 'disabled' ? '已禁用' : '正常'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" title="编辑" onClick={() => handleEdit(emp)}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" title="重置密码" onClick={() => handleResetPassword(emp.id, emp.name)}><KeyRound className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" title={(emp as any).status === 'disabled' ? '启用' : '禁用'} onClick={() => handleToggleStatus(emp.id)}>
                        {(emp as any).status === 'disabled' ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <ShieldOff className="w-4 h-4 text-orange-500" />}
                      </Button>
                      <Button size="sm" variant="ghost" title="删除" onClick={() => handleDelete(emp.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEmployees.length > 50 && (
            <p className="text-sm text-gray-400 mt-2 text-center">显示前50条，共{filteredEmployees.length}条</p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog - Report Chain & Subordinates */}
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

              {/* Report Chain */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1"><ChevronUp className="w-4 h-4" />汇报链（向上追溯）</h4>
                {reportChain.length > 0 ? (
                  <div className="space-y-1">
                    {reportChain.map((m, i) => (
                      <div key={m.id} className="flex items-center gap-2 text-sm" style={{ paddingLeft: `${i * 16}px` }}>
                        <span className="text-gray-400">↑</span>
                        <span className="font-medium">{m.name}</span>
                        <Badge variant="outline" className="text-xs">{m.role}</Badge>
                        <span className="text-gray-400">({m.department})</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">无上级</p>}
              </div>

              {/* Subordinates */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1"><Users className="w-4 h-4" />直接下属 ({subordinates.length})</h4>
                {subordinates.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {subordinates.map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{s.name}</span>
                        <Badge variant="secondary" className="text-xs">{s.role}</Badge>
                        <span className="text-gray-400">({s.department})</span>
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
