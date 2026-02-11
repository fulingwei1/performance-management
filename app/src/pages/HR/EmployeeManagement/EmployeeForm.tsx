import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmployeeFormProps {
  form: any;
  setForm: (f: any) => void;
  onSave: () => void;
  onCancel: () => void;
  departmentOptions?: { rootNames: string[]; subOptionsByRoot: Record<string, string[]> };
}

export function EmployeeForm({ form, setForm, onSave, onCancel, departmentOptions = { rootNames: [], subOptionsByRoot: {} } }: EmployeeFormProps) {
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
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入员工姓名" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>部门 *</Label>
          <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v, subDepartment: '' })}>
            <SelectTrigger><SelectValue placeholder="选择部门" /></SelectTrigger>
            <SelectContent>
              {departmentOptions.rootNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
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
      {form.role === 'employee' && (
        <div>
          <Label>直属上级</Label>
          <Select value={form.managerId} onValueChange={(v) => setForm({ ...form, managerId: v })}>
            <SelectTrigger><SelectValue placeholder="选择直属上级" /></SelectTrigger>
            <SelectContent>
              {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
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
