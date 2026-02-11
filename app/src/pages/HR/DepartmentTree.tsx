import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, Edit, Trash2, ChevronRight, ChevronDown, Users, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { departmentApi } from '@/services/okrApi';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  managerId?: string;
  managerName?: string;
  status: string;
  children?: Department[];
}

function DeptNode({ dept, level, onRefresh }: { dept: Department; level: number; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(level < 2);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(dept.name);
  const hasChildren = dept.children && dept.children.length > 0;

  const handleSave = async () => {
    try {
      await departmentApi.update(dept.id, { name });
      setEditing(false);
      onRefresh();
      toast.success('已更新');
    } catch { toast.error('更新失败'); }
  };

  const handleDelete = async () => {
    if (!confirm(`确定删除部门「${dept.name}」？`)) return;
    try {
      await departmentApi.delete(dept.id);
      onRefresh();
      toast.success('已删除');
    } catch (e: any) { toast.error(e.message || '删除失败'); }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 group"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        <button onClick={() => setExpanded(!expanded)} className="w-5 h-5 flex items-center justify-center">
          {hasChildren ? (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4" />}
        </button>
        <Building2 className="w-4 h-4 text-blue-500" />
        {editing ? (
          <div className="flex items-center gap-1">
            <Input value={name} onChange={e => setName(e.target.value)} className="h-7 w-32" />
            <Button size="sm" variant="ghost" onClick={handleSave}><Save className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="w-3 h-3" /></Button>
          </div>
        ) : (
          <>
            <span className="font-medium text-sm">{dept.name}</span>
            {dept.code && <Badge variant="outline" className="text-xs">{dept.code}</Badge>}
            {dept.managerName && <span className="text-xs text-gray-400">负责人: {dept.managerName}</span>}
          </>
        )}
        <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Edit className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={handleDelete}><Trash2 className="w-3 h-3 text-red-400" /></Button>
        </div>
      </div>
      {expanded && hasChildren && dept.children!.map(child => (
        <DeptNode key={child.id} dept={child} level={level + 1} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

export function DepartmentTree() {
  const [tree, setTree] = useState<Department[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newParentId, setNewParentId] = useState('');

  const loadTree = async () => {
    try {
      const res = await departmentApi.getTree();
      if (res.success) setTree(res.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadTree(); }, []);

  const handleAdd = async () => {
    try {
      await departmentApi.create({ name: newName, code: newCode, parentId: newParentId || undefined });
      setShowAdd(false);
      setNewName('');
      setNewCode('');
      setNewParentId('');
      loadTree();
      toast.success('部门已创建');
    } catch { toast.error('创建失败'); }
  };

  const flattenDepts = (depts: Department[]): { id: string; name: string }[] => {
    const result: { id: string; name: string }[] = [];
    const walk = (nodes: Department[], prefix = '') => {
      for (const n of nodes) {
        result.push({ id: n.id, name: prefix + n.name });
        if (n.children) walk(n.children, prefix + n.name + ' / ');
      }
    };
    walk(depts);
    return result;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" /> 组织架构
        </h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> 新增部门
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>部门树</CardTitle></CardHeader>
        <CardContent>
          {tree.length === 0 ? (
            <div className="text-center text-gray-400 py-8">暂无部门数据</div>
          ) : (
            tree.map(dept => <DeptNode key={dept.id} dept={dept} level={0} onRefresh={loadTree} />)
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增部门</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>部门名称</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="如：技术部" />
            </div>
            <div>
              <Label>部门代码</Label>
              <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="如：TECH" />
            </div>
            <div>
              <Label>上级部门</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={newParentId}
                onChange={e => setNewParentId(e.target.value)}
              >
                <option value="">无（顶级部门）</option>
                {flattenDepts(tree).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleAdd} disabled={!newName}>创建</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
