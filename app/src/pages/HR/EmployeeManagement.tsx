import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Upload,
  Download,
  Edit,
  Trash2,
  Search,
  Filter,
  Building2,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { type Employee, type EmployeeLevel } from '@/types';
import { useHRStore } from '@/stores/hrStore';

export function EmployeeManagement() {
  const {
    employeesList,
    fetchEmployees,
    addEmployee: addEmp,
    updateEmployee: updateEmp,
    deleteEmployee: deleteEmp,
    importEmployees: importEmp,
    metricsList,
    fetchMetrics,
    updateMetrics,
    organizationList,
    fetchOrganization
  } = useHRStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [orgStructure, setOrgStructure] = useState<OrgNode[]>([]);

  // 员工表单
  const [employeeForm, setEmployeeForm] = useState<{
    id: string;
    name: string;
    department: string;
    subDepartment: string;
    role: 'employee' | 'manager' | 'gm' | 'hr';
    level: EmployeeLevel;
    managerId: string;
  }>({
    id: '',
    name: '',
    department: '',
    subDepartment: '',
    role: 'employee',
    level: 'intermediate',
    managerId: ''
  });

  // 考核指标配置
  const [metrics, setMetrics] = useState<any[]>([]);
  
  // 加载数据
  useEffect(() => {
    fetchEmployees();
    fetchMetrics();
    fetchOrganization();
  }, []);
  
  // 同步指标数据
  useEffect(() => {
    setMetrics(metricsList);
  }, [metricsList]);
  
  // 同步组织架构数据
  useEffect(() => {
    setOrgStructure(organizationList);
  }, [organizationList]);
  
  // Build department options from org tree for move/edit
  const departmentOptions = (() => {
    const rootNames: string[] = [];
    const subOptionsByRoot: Record<string, string[]> = {};
    function collectDescendantNames(node: OrgNode): string[] {
      const names: string[] = [];
      if (node.children) {
        for (const c of node.children) {
          names.push(c.name);
          names.push(...collectDescendantNames(c));
        }
      }
      return names;
    }
    for (const root of orgStructure) {
      rootNames.push(root.name);
      subOptionsByRoot[root.name] = [...new Set(collectDescendantNames(root))];
    }
    if (rootNames.length === 0) {
      rootNames.push('工程技术中心', '销售部', '人力资源部', '制造中心', '教育装备事业部', '营销中心', '人力行政部');
    }
    return { rootNames, subOptionsByRoot };
  })();

  // 筛选员工
  const filteredEmployees = employeesList.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'all' || emp.department === filterDept;
    const matchesRole = filterRole === 'all' || emp.role === filterRole;
    return matchesSearch && matchesDept && matchesRole;
  });
  
  // 文件导入
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      await importCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      await importExcel(file);
    } else {
      alert('仅支持CSV或Excel文件');
    }
  };
  
  const importCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').slice(1); // 跳过标题行
    
    const newEmployees: any[] = [];
    lines.forEach((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 2 && values[1]) {
        newEmployees.push({
          id: values[0] || `emp-${Date.now()}-${index}`,
          name: values[1],
          department: values[2] || '工程技术中心',
          subDepartment: values[3] || '',
          role: (values[4] as any) || 'employee',
          level: (values[5] as any) || 'intermediate',
          managerId: values[6] || undefined
        });
      }
    });
    
    const result = await importEmp(newEmployees);
    if (result) {
      alert(`成功导入${result.successCount}名员工，失败${result.failedCount}名`);
    } else {
      alert('导入失败');
    }
  };
  
  const importExcel = async (_file: File) => {
    // 这里需要安装xlsx库，暂时用CSV替代
    alert('Excel导入功能需要安装xlsx库，暂时使用CSV格式');
  };

  // 文件导出
  const handleExportCSV = async () => {
    const { hrApi } = await import('@/services/api');
    hrApi.exportEmployees();
  };

  // 新增/编辑员工
  const handleSaveEmployee = async () => {
    const success = editingEmployee
      ? await updateEmp(editingEmployee.id, employeeForm)
      : await addEmp(employeeForm);

    if (success) {
      setShowAddDialog(false);
      setEditingEmployee(null);
      resetForm();
      toast.success(editingEmployee ? '员工信息已更新，部门信息已修改' : '员工已添加');
    } else {
      toast.error(editingEmployee ? '更新失败' : '添加失败');
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      id: emp.id,
      name: emp.name,
      department: emp.department,
      subDepartment: emp.subDepartment,
      role: emp.role,
      level: emp.level,
      managerId: emp.managerId || ''
    });
    setShowAddDialog(true);
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该员工吗？')) {
      const success = await deleteEmp(id);
      if (!success) {
        alert('删除失败');
      }
    }
  };
  
  const resetForm = () => {
    setEmployeeForm({
      id: '',
      name: '',
      department: '',
      subDepartment: '',
      role: 'employee',
      level: 'intermediate',
      managerId: ''
    });
  };
  
  // 保存指标配置
  const handleSaveMetrics = async () => {
    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    if (totalWeight !== 100) {
      alert(`权重总和必须为100%，当前为${totalWeight}%`);
      return;
    }
    
    const success = await updateMetrics(metrics);
    if (success) {
      alert('指标配置已保存');
      setShowMetricsDialog(false);
    } else {
      alert('保存失败');
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">员工管理</h2>
          <p className="text-gray-500 mt-1">管理员工信息、组织架构和考核指标</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building2 className="w-4 h-4 mr-2" />
                组织架构
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby="org-view-description">
              <DialogHeader>
                <DialogTitle>组织架构配置</DialogTitle>
                <p id="org-view-description" className="text-sm text-gray-600">
                  组织架构树形展示
                </p>
              </DialogHeader>
              <OrgConfigPanel orgStructure={orgStructure} />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                考核指标
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl" aria-describedby="metrics-config-description">
              <DialogHeader>
                <DialogTitle>考核指标配置</DialogTitle>
                <p id="metrics-config-description" className="text-sm text-gray-600">
                  配置各评分维度的权重和描述
                </p>
              </DialogHeader>
              <MetricsConfigPanel 
                metrics={metrics} 
                setMetrics={setMetrics}
                onSave={handleSaveMetrics}
              />
            </DialogContent>
          </Dialog>
          
          <label htmlFor="file-upload" className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                导入名册
              </span>
            </Button>
            <input 
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
          
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            导出名册
          </Button>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingEmployee(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                新增员工
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby="employee-form-description">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? '编辑员工' : '新增员工'}</DialogTitle>
                <p id="employee-form-description" className="text-sm text-gray-600">
                  请填写员工信息，带 * 为必填项
                </p>
              </DialogHeader>
              <EmployeeForm 
                form={employeeForm}
                setForm={setEmployeeForm}
                onSave={handleSaveEmployee}
                onCancel={() => { setShowAddDialog(false); setEditingEmployee(null); resetForm(); }}
                departmentOptions={departmentOptions}
              />
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
              <Input
                placeholder="搜索员工姓名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部部门</SelectItem>
                {departmentOptions.rootNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="employee">员工</SelectItem>
                <SelectItem value="manager">经理</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
              </SelectContent>
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
        <CardHeader>
          <CardTitle>员工列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>子部门</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>直属上级</TableHead>
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
                         {emp.role === 'employee' ? '员工' : emp.role === 'manager' ? '经理' : emp.role === 'hr' ? 'HR' : '总经理'}
                     </Badge>
                   </TableCell>
                   <TableCell>{emp.level}</TableCell>
                   <TableCell>
                     {emp.managerId ? employeesList.find(e => e.id === emp.managerId)?.name : ''}
                   </TableCell>
                   <TableCell className="text-right">
                     <div className="flex justify-end gap-2">
                       <Button
                         size="sm"
                         variant="ghost"
                         onClick={() => handleEdit(emp)}
                       >
                         <Edit className="w-4 h-4" />
                       </Button>
                       <Button
                         size="sm"
                         variant="ghost"
                         onClick={() => handleDelete(emp.id)}
                       >
                         <Trash2 className="w-4 h-4 text-red-500" />
                       </Button>
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

// 员工表单组件
function EmployeeForm({
  form,
  setForm,
  onSave,
  onCancel,
  departmentOptions = { rootNames: [], subOptionsByRoot: {} }
}: {
  form: any;
  setForm: (f: any) => void;
  onSave: () => void;
  onCancel: () => void;
  departmentOptions?: { rootNames: string[]; subOptionsByRoot: Record<string, string[]> };
}) {
  const managers = [
    { id: 'm001', name: '于振华' },
    { id: 'm002', name: '张丙波' },
    { id: 'm003', name: '王俊' }
  ];
  const subOptions = (form.department && departmentOptions.subOptionsByRoot[form.department]) || [];

  return (
    <div className="space-y-4 pt-4">
      <div>
        <Label>姓名 *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="请输入员工姓名"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>部门 *</Label>
          <Select
            value={form.department}
            onValueChange={(v) => setForm({ ...form, department: v, subDepartment: '' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择部门" />
            </SelectTrigger>
            <SelectContent>
              {departmentOptions.rootNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>子部门</Label>
          {subOptions.length > 0 ? (
            <Select
              value={form.subDepartment}
              onValueChange={(v) => setForm({ ...form, subDepartment: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择子部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">（无）</SelectItem>
                {subOptions.map((name: string) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.subDepartment}
              onChange={(e) => setForm({ ...form, subDepartment: e.target.value })}
              placeholder="例如：测试部"
            />
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>角色 *</Label>
          <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">员工</SelectItem>
              <SelectItem value="manager">经理</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>级别 *</Label>
          <Select value={form.level} onValueChange={(v: any) => setForm({ ...form, level: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="senior">高级</SelectItem>
              <SelectItem value="intermediate">中级</SelectItem>
              <SelectItem value="junior">初级</SelectItem>
              <SelectItem value="assistant">助理</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {form.role === 'employee' && (
        <div>
          <Label>直属上级</Label>
          <Select value={form.managerId} onValueChange={(v) => setForm({ ...form, managerId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="选择直属上级" />
            </SelectTrigger>
            <SelectContent>
              {managers.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="flex gap-3 pt-4">
        <Button onClick={onSave} className="flex-1">保存</Button>
        <Button onClick={onCancel} variant="outline">取消</Button>
      </div>
    </div>
  );
}

// 组织架构配置面板
function OrgConfigPanel({ orgStructure }: { orgStructure: OrgNode[] }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        <p className="font-medium text-gray-900">组织架构说明</p>
        <p className="mt-2 text-gray-500 leading-relaxed">
          当前展示部门层级结构，点击节点可展开/折叠查看下属部门或员工
        </p>
      </div>
      <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 min-h-[300px]">
        {orgStructure.map(node => (
          <OrgTreeNode key={node.id} node={node} level={0} />
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={() => window.location.reload()}>
          重置默认
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700">
          保存架构
        </Button>
      </div>
    </div>
  );
}

function OrgTreeNode({ node, level }: { node: OrgNode; level: number }) {
  const [expanded, setExpanded] = useState(true);

  const levelBgColors = [
    'bg-blue-50 hover:bg-blue-100',
    'bg-purple-50 hover:bg-purple-100',
    'bg-green-50 hover:bg-green-100',
    'bg-orange-50 hover:bg-orange-100',
    'bg-pink-50 hover:bg-pink-100'
  ];
  
  return (
    <div 
      className="relative"
      style={{ paddingLeft: `${level * 20}px` }}
    >
      {/* 连接线 */}
      {level > 0 && (
        <div 
          className="absolute left-0 top-1/2 w-[20px] h-px border-t-2 border-dashed border-gray-300"
          style={{ marginLeft: `-${level * 20}px` }}
        />
      )}
      
      <div 
        className={`
          flex items-center gap-2 py-3 px-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
          ${levelBgColors[level % levelBgColors.length]}
          ${expanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'}
        `}
        onClick={() => setExpanded(!expanded)}
      >
        {node.children && (
          <div className={`
            w-5 h-5 flex items-center justify-center rounded-full transition-transform duration-200
            ${expanded ? 'bg-blue-600' : 'bg-gray-400'}
          `}>
            <ChevronRight 
              className={`
                w-3 h-3 text-white transition-transform duration-200
                ${expanded ? 'rotate-90' : ''}
              `}
            />
          </div>
        )}
        {node.type === 'department' && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
            <Building2 className="w-4 h-4" />
          </div>
        )}
        {node.type === 'subDepartment' && (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
            <Users className="w-3 h-3" />
          </div>
        )}
        {node.type === 'employee' && (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
            <span className="text-xs font-bold">{node.name.charAt(0)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{node.name}</span>
            {node.type === 'department' && (
              <Badge className="bg-blue-100 text-blue-700 text-xs font-medium">部门</Badge>
            )}
            {node.type === 'subDepartment' && (
              <Badge className="bg-purple-100 text-purple-700 text-xs font-medium">子部门</Badge>
            )}
            {node.type === 'employee' && node.managerId && (
              <Badge className="bg-green-100 text-green-700 text-xs font-medium">员工</Badge>
            )}
          </div>
          {node.type === 'subDepartment' && node.managerId && (
            <div className="text-xs text-gray-500">
              经理: {node.managerId}
            </div>
          )}
        </div>
      </div>
      
      {expanded && node.children && (
        <div className="mt-2 pl-4 border-l-2 border-gray-200">
          {node.children.map(child => (
            <OrgTreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// 考核指标配置面板
function MetricsConfigPanel({ metrics, setMetrics, onSave }: any) {
  const handleMetricChange = (index: number, field: string, value: any) => {
    const newMetrics = [...metrics];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    setMetrics(newMetrics);
  };
  
  const totalWeight = metrics.reduce((sum: number, m: any) => sum + m.weight, 0);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {metrics.map((metric: any, index: number) => (
          <Card key={metric.key}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">指标名称</Label>
                  <Input
                    value={metric.name}
                    onChange={(e) => handleMetricChange(index, 'name', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">权重 (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={metric.weight}
                    onChange={(e) => handleMetricChange(index, 'weight', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">描述</Label>
                  <Textarea
                    value={metric.description}
                    onChange={(e) => handleMetricChange(index, 'description', e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className={cn(
        "p-4 rounded-lg",
        totalWeight === 100 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
      )}>
        <div className="flex items-center justify-between">
          <span className="font-medium">权重总和</span>
          <span className={cn(
            "text-lg font-bold",
            totalWeight === 100 ? "text-green-600" : "text-red-600"
          )}>
            {totalWeight}%
          </span>
        </div>
        {totalWeight !== 100 && (
          <p className="text-sm text-red-600 mt-1">权重总和必须为100%</p>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>重置默认</Button>
        <Button onClick={onSave}>保存配置</Button>
      </div>
    </div>
  );
}

// 统计卡片
function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600'
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color])}>
            <Users className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 组织架构节点类型
interface OrgNode {
  id: string;
  name: string;
  type: 'department' | 'subDepartment' | 'employee';
  managerId?: string;
  children?: OrgNode[];
}
