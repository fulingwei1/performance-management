import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employeeApi } from '@/services/api';

interface DepartmentNode {
  id: string;
  name: string;
  children?: DepartmentNode[];
}

interface EmployeeFormProps {
  form: any;
  setForm: (f: any) => void;
  onSave: () => void;
  onCancel: () => void;
  departmentOptions?: { rootNames: string[]; subOptionsByRoot: Record<string, string[]> };
}

// Flatten department tree with indentation
function flattenDeptTree(nodes: DepartmentNode[], depth = 0): { id: string; name: string; label: string }[] {
  const result: { id: string; name: string; label: string }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, label: '\u00A0\u00A0'.repeat(depth) + node.name });
    if (node.children) {
      result.push(...flattenDeptTree(node.children, depth + 1));
    }
  }
  return result;
}

export function EmployeeForm({ form, setForm, onSave, onCancel, departmentOptions = { rootNames: [], subOptionsByRoot: {} } }: EmployeeFormProps) {
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [allEmployees, setAllEmployees] = useState<{ id: string; name: string; role: string }[]>([]);
  const [deptTree, setDeptTree] = useState<DepartmentNode[]>([]);
  const [managerSearch, setManagerSearch] = useState('');
  const [useDeptTree, setUseDeptTree] = useState(false);

  useEffect(() => {
    // Fetch managers
    employeeApi.getManagers().then((res: any) => {
      if (res.success && res.data) {
        setManagers(res.data.map((m: any) => ({ id: m.id, name: m.name })));
      }
    }).catch(() => {});

    // Fetch all employees for manager selection
    employeeApi.getAll().then((res: any) => {
      if (res.success && res.data) {
        setAllEmployees(res.data.filter((e: any) => e.role === 'manager' || e.role === 'gm' || e.role === 'admin').map((e: any) => ({ id: e.id, name: e.name, role: e.role })));
      }
    }).catch(() => {});

    // Try to fetch department tree
    fetch('/api/departments/tree', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setDeptTree(res.data);
        setUseDeptTree(true);
      }
    }).catch(() => {});
  }, []);

  const flatDepts = useDeptTree ? flattenDeptTree(deptTree) : [];
  const subOptions = (form.department && departmentOptions.subOptionsByRoot[form.department]) || [];

  // Filter managers by search
  const filteredManagers = managerSearch
    ? allEmployees.filter(m => m.name.includes(managerSearch))
    : allEmployees;

  return (
    <div className="space-y-4 pt-4">
      <div>
        <Label>姓名 *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入员工姓名" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>部门 *</Label>
          {useDeptTree ? (
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v, subDepartment: '' })}>
              <SelectTrigger><SelectValue placeholder="选择部门" /></SelectTrigger>
              <SelectContent>
                {flatDepts.map((d) => <SelectItem key={d.id} value={d.name}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v, subDepartment: '' })}>
              <SelectTrigger><SelectValue placeholder="选择部门" /></SelectTrigger>
              <SelectContent>
                {departmentOptions.rootNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label>子部门</Label>
          {subOptions.length > 0 ? (
            <Select value={form.subDepartment} onValueChange={(v) => setForm({ ...form, subDepartment: v })}>
              <SelectTrigger><SelectValue placeholder="选择子部门" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">（无）</SelectItem>
                {subOptions.map((name: string) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.subDepartment} onChange={(e) => setForm({ ...form, subDepartment: e.target.value })} placeholder="例如：测试部" />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>角色 *</Label>
          <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">员工</SelectItem>
              <SelectItem value="manager">经理</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="gm">总经理</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>级别 *</Label>
          <Select value={form.level} onValueChange={(v: any) => setForm({ ...form, level: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="senior">高级</SelectItem>
              <SelectItem value="intermediate">中级</SelectItem>
              <SelectItem value="junior">初级</SelectItem>
              <SelectItem value="assistant">助理</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>直属上级</Label>
        <Input
          placeholder="搜索上级姓名..."
          value={managerSearch}
          onChange={(e) => setManagerSearch(e.target.value)}
          className="mb-2"
        />
        <Select value={form.managerId} onValueChange={(v) => setForm({ ...form, managerId: v })}>
          <SelectTrigger><SelectValue placeholder="选择直属上级" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">（无）</SelectItem>
            {filteredManagers.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name} ({m.role === 'gm' ? '总经理' : m.role === 'admin' ? '管理员' : '经理'})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-3 pt-4">
        <Button onClick={onSave} className="flex-1">保存</Button>
        <Button onClick={onCancel} variant="outline">取消</Button>
      </div>
    </div>
  );
}
