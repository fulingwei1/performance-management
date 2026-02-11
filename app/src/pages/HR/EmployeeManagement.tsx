import { useState, useEffect } from 'react';
import { Users, Plus, Upload, Download, Edit, Trash2, Search, Filter, Building2 } from 'lucide-react';
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
import { useHRStore } from '@/stores/hrStore';

// Sub-components
import { EmployeeForm } from './EmployeeManagement/EmployeeForm';
import { OrgConfigPanel, type OrgNode } from './EmployeeManagement/OrgConfigPanel';
import { MetricsConfigPanel } from './EmployeeManagement/MetricsConfigPanel';
import { StatCard } from './EmployeeManagement/StatCard';

export function EmployeeManagement() {
  const {
    employeesList, fetchEmployees,
    addEmployee: addEmp, updateEmployee: updateEmp, deleteEmployee: deleteEmp, importEmployees: importEmp,
    metricsList, fetchMetrics, updateMetrics,
    organizationList, fetchOrganization
  } = useHRStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [orgStructure, setOrgStructure] = useState<OrgNode[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);

  const [employeeForm, setEmployeeForm] = useState<{
    id: string; name: string; department: string; subDepartment: string;
    role: 'employee' | 'manager' | 'gm' | 'hr' | 'admin'; level: EmployeeLevel; managerId: string;
  }>({ id: '', name: '', department: '', subDepartment: '', role: 'employee', level: 'intermediate', managerId: '' });
  
  useEffect(() => { fetchEmployees(); fetchMetrics(); fetchOrganization(); }, []);
  useEffect(() => { setMetrics(metricsList); }, [metricsList]);
  useEffect(() => { setOrgStructure(organizationList); }, [organizationList]);
  
  const departmentOptions = (() => {
    const rootNames: string[] = [];
    const subOptionsByRoot: Record<string, string[]> = {};
    function collectDescendantNames(node: OrgNode): string[] {
      const names: string[] = [];
      if (node.children) { for (const c of node.children) { names.push(c.name); names.push(...collectDescendantNames(c)); } }
      return names;
    }
    for (const root of orgStructure) { rootNames.push(root.name); subOptionsByRoot[root.name] = [...new Set(collectDescendantNames(root))]; }
    if (rootNames.length === 0) rootNames.push('工程技术中心', '销售部', '人力资源部', '制造中心', '教育装备事业部', '营销中心', '人力行政部');
    return { rootNames, subOptionsByRoot };
  })();

  const filteredEmployees = employeesList.filter(emp => {
    return emp.name.toLowerCase().includes(searchQuery.toLowerCase())
      && (filterDept === 'all' || emp.department === filterDept)
      && (filterRole === 'all' || emp.role === filterRole);
  });
  
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      const text = await file.text();
      const lines = text.split('\n').slice(1);
      const newEmployees: any[] = [];
      lines.forEach((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        if (values.length >= 2 && values[1]) {
          newEmployees.push({ id: values[0] || `emp-${Date.now()}-${index}`, name: values[1], department: values[2] || '工程技术中心', subDepartment: values[3] || '', role: (values[4] as any) || 'employee', level: (values[5] as any) || 'intermediate', managerId: values[6] || undefined });
        }
      });
      const result = await importEmp(newEmployees);
      if (result) alert(`成功导入${result.successCount}名员工，失败${result.failedCount}名`);
      else alert('导入失败');
    } else if (ext === 'xlsx' || ext === 'xls') {
      alert('Excel导入功能需要安装xlsx库，暂时使用CSV格式');
    } else {
      alert('仅支持CSV或Excel文件');
    }
  };
  
  const handleExportCSV = async () => { const { hrApi } = await import('@/services/api'); hrApi.exportEmployees(); };

  const handleSaveEmployee = async () => {
    const success = editingEmployee ? await updateEmp(editingEmployee.id, employeeForm) : await addEmp(employeeForm);
    if (success) { setShowAddDialog(false); setEditingEmployee(null); resetForm(); toast.success(editingEmployee ? '员工信息已更新' : '员工已添加'); }
    else toast.error(editingEmployee ? '更新失败' : '添加失败');
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({ id: emp.id, name: emp.name, department: emp.department, subDepartment: emp.subDepartment, role: emp.role, level: emp.level, managerId: emp.managerId || '' });
    setShowAddDialog(true);
  };
  
  const handleDelete = async (id: string) => { if (confirm('确定要删除该员工吗？')) { const success = await deleteEmp(id); if (!success) alert('删除失败'); } };
  const resetForm = () => setEmployeeForm({ id: '', name: '', department: '', subDepartment: '', role: 'employee', level: 'intermediate', managerId: '' });
  
  const handleSaveMetrics = async () => {
    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    if (totalWeight !== 100) { alert(`权重总和必须为100%，当前为${totalWeight}%`); return; }
    const success = await updateMetrics(metrics);
    if (success) { alert('指标配置已保存'); setShowMetricsDialog(false); } else alert('保存失败');
  };
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">员工管理</h2>
          <p className="text-gray-500 mt-1">管理员工信息、组织架构和考核指标</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
            <DialogTrigger asChild><Button variant="outline"><Building2 className="w-4 h-4 mr-2" />组织架构</Button></DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby="org-view-description">
              <DialogHeader><DialogTitle>组织架构配置</DialogTitle><p id="org-view-description" className="text-sm text-gray-600">组织架构树形展示</p></DialogHeader>
              <OrgConfigPanel orgStructure={orgStructure} />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
            <DialogTrigger asChild><Button variant="outline"><Filter className="w-4 h-4 mr-2" />考核指标</Button></DialogTrigger>
            <DialogContent className="max-w-3xl" aria-describedby="metrics-config-description">
              <DialogHeader><DialogTitle>考核指标配置</DialogTitle><p id="metrics-config-description" className="text-sm text-gray-600">配置各评分维度的权重和描述</p></DialogHeader>
              <MetricsConfigPanel metrics={metrics} setMetrics={setMetrics} onSave={handleSaveMetrics} />
            </DialogContent>
          </Dialog>
          
          <label htmlFor="file-upload" className="cursor-pointer">
            <Button variant="outline" asChild><span><Upload className="w-4 h-4 mr-2" />导入名册</span></Button>
            <input id="file-upload" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileImport} className="hidden" />
          </label>
          <Button variant="outline" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" />导出名册</Button>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild><Button onClick={() => { resetForm(); setEditingEmployee(null); }}><Plus className="w-4 h-4 mr-2" />新增员工</Button></DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby="employee-form-description">
              <DialogHeader><DialogTitle>{editingEmployee ? '编辑员工' : '新增员工'}</DialogTitle><p id="employee-form-description" className="text-sm text-gray-600">请填写员工信息，带 * 为必填项</p></DialogHeader>
              <EmployeeForm form={employeeForm} setForm={setEmployeeForm} onSave={handleSaveEmployee} onCancel={() => { setShowAddDialog(false); setEditingEmployee(null); resetForm(); }} departmentOptions={departmentOptions} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="搜索员工姓名..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-40"><SelectValue placeholder="部门" /></SelectTrigger>
              <SelectContent><SelectItem value="all">全部部门</SelectItem>{departmentOptions.rootNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40"><SelectValue placeholder="角色" /></SelectTrigger>
              <SelectContent><SelectItem value="all">全部角色</SelectItem><SelectItem value="employee">员工</SelectItem><SelectItem value="manager">经理</SelectItem><SelectItem value="hr">HR</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="员工总数" value={employeesList.length} color="blue" />
        <StatCard title="部门经理" value={employeesList.filter(e => e.role === 'manager').length} color="purple" />
        <StatCard title="高级工程师" value={employeesList.filter(e => e.level === 'senior').length} color="green" />
        <StatCard title="中级工程师" value={employeesList.filter(e => e.level === 'intermediate').length} color="orange" />
      </div>
      
      {/* Employee Table */}
      <Card>
        <CardHeader><CardTitle>员工列表</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead><TableHead>部门</TableHead><TableHead>子部门</TableHead>
                <TableHead>角色</TableHead><TableHead>级别</TableHead><TableHead>直属上级</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell>{emp.subDepartment && emp.subDepartment !== '-/-' && emp.subDepartment !== '/-/' && emp.subDepartment !== '-' ? emp.subDepartment : ''}</TableCell>
                  <TableCell>
                    <Badge variant={emp.role === 'manager' ? 'default' : 'secondary'}>
                      {emp.role === 'employee' ? '员工' : emp.role === 'manager' ? '经理' : emp.role === 'hr' ? 'HR' : emp.role === 'admin' ? '管理员' : '总经理'}
                    </Badge>
                  </TableCell>
                  <TableCell>{emp.level}</TableCell>
                  <TableCell>{emp.managerId ? employeesList.find(e => e.id === emp.managerId)?.name : ''}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(emp)}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(emp.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
