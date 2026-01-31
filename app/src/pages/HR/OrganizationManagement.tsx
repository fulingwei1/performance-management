import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Save,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { organizationApi, employeeApi } from '@/services/api';
import type { Department, Position, Employee, EmployeeLevel } from '@/types';
import { toast } from 'sonner';

type PositionCategory = 'technical' | 'management' | 'support';

export function OrganizationManagement() {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [_loading, setLoading] = useState(false);

  // 部门表单
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    parentId: '',
    managerId: '',
    sortOrder: 0
  });

  // 岗位表单
  const [showPosDialog, setShowPosDialog] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posForm, setPosForm] = useState<{
    name: string;
    code: string;
    departmentId: string;
    level: EmployeeLevel;
    category: PositionCategory;
    description: string;
    requirements: string;
  }>({
    name: '',
    code: '',
    departmentId: '',
    level: 'intermediate',
    category: 'technical',
    description: '',
    requirements: ''
  });
  
  // 加载数据
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, posRes, empRes] = await Promise.all([
        organizationApi.getDepartmentTree(),
        organizationApi.getAllPositions(),
        employeeApi.getAll()
      ]);
      
      if (deptRes.success) setDepartments(deptRes.data);
      if (posRes.success) setPositions(posRes.data);
      if (empRes.success) setEmployees(empRes.data);
    } catch (error: any) {
      toast.error('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 部门管理
  const handleSaveDepartment = async () => {
    try {
      if (editingDept) {
        await organizationApi.updateDepartment(editingDept.id, deptForm);
        toast.success('部门更新成功');
      } else {
        await organizationApi.createDepartment(deptForm);
        toast.success('部门创建成功');
      }
      setShowDeptDialog(false);
      setEditingDept(null);
      resetDeptForm();
      fetchData();
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    }
  };
  
  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('确定要删除该部门吗？')) return;
    try {
      await organizationApi.deleteDepartment(id);
      toast.success('部门删除成功');
      fetchData();
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };
  
  // 岗位管理
  const handleSavePosition = async () => {
    try {
      if (editingPos) {
        await organizationApi.updatePosition(editingPos.id, posForm);
        toast.success('岗位更新成功');
      } else {
        await organizationApi.createPosition(posForm);
        toast.success('岗位创建成功');
      }
      setShowPosDialog(false);
      setEditingPos(null);
      resetPosForm();
      fetchData();
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    }
  };
  
  const handleDeletePosition = async (id: string) => {
    if (!confirm('确定要删除该岗位吗？')) return;
    try {
      await organizationApi.deletePosition(id);
      toast.success('岗位删除成功');
      fetchData();
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };
  
  const resetDeptForm = () => {
    setDeptForm({ name: '', code: '', parentId: '', managerId: '', sortOrder: 0 });
  };
  
  const resetPosForm = () => {
    setPosForm({ name: '', code: '', departmentId: '', level: 'intermediate', category: 'technical', description: '', requirements: '' });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">组织架构管理</h2>
          <p className="text-gray-500 mt-1">管理部门层级结构和岗位体系</p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="departments">部门管理</TabsTrigger>
          <TabsTrigger value="positions">岗位管理</TabsTrigger>
        </TabsList>
        
        {/* 部门管理 */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>部门层级结构</CardTitle>
              <Button onClick={() => { resetDeptForm(); setEditingDept(null); setShowDeptDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                新增部门
              </Button>
            </CardHeader>
            <CardContent>
              <DepartmentTree 
                departments={departments} 
                employees={employees}
                onEdit={(dept) => {
                  setEditingDept(dept);
                  setDeptForm({
                    name: dept.name,
                    code: dept.code,
                    parentId: dept.parentId || '',
                    managerId: dept.managerId || '',
                    sortOrder: dept.sortOrder
                  });
                  setShowDeptDialog(true);
                }}
                onDelete={handleDeleteDepartment}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 岗位管理 */}
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>岗位列表</CardTitle>
              <Button onClick={() => { resetPosForm(); setEditingPos(null); setShowPosDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                新增岗位
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {positions.map(pos => {
                  const dept = departments.find(d => d.id === pos.departmentId);
                  return (
                    <Card key={pos.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{pos.name}</h4>
                            <p className="text-sm text-gray-500">{pos.code}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setEditingPos(pos);
                                setPosForm({
                                  name: pos.name,
                                  code: pos.code,
                                  departmentId: pos.departmentId,
                                  level: pos.level,
                                  category: pos.category,
                                  description: pos.description || '',
                                  requirements: pos.requirements || ''
                                });
                                setShowPosDialog(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeletePosition(pos.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1">
                          <Badge variant="outline">{dept?.name || '未分配部门'}</Badge>
                          <Badge variant="secondary">{pos.level}</Badge>
                          <Badge variant="secondary">{pos.category}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* 部门表单对话框 */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDept ? '编辑部门' : '新增部门'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>部门名称 *</Label>
              <Input
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="请输入部门名称"
              />
            </div>
            <div>
              <Label>部门编码 *</Label>
              <Input
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                placeholder="请输入部门编码"
              />
            </div>
            <div>
              <Label>上级部门</Label>
              <Select 
                value={deptForm.parentId} 
                onValueChange={(v) => setDeptForm({ ...deptForm, parentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择上级部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>部门负责人</Label>
              <Select 
                value={deptForm.managerId} 
                onValueChange={(v) => setDeptForm({ ...deptForm, managerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择负责人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">未指定</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>排序</Label>
              <Input
                type="number"
                value={deptForm.sortOrder}
                onChange={(e) => setDeptForm({ ...deptForm, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveDepartment} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              <Button variant="outline" onClick={() => setShowDeptDialog(false)}>
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 岗位表单对话框 */}
      <Dialog open={showPosDialog} onOpenChange={setShowPosDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPos ? '编辑岗位' : '新增岗位'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>岗位名称 *</Label>
              <Input
                value={posForm.name}
                onChange={(e) => setPosForm({ ...posForm, name: e.target.value })}
                placeholder="请输入岗位名称"
              />
            </div>
            <div>
              <Label>岗位编码 *</Label>
              <Input
                value={posForm.code}
                onChange={(e) => setPosForm({ ...posForm, code: e.target.value })}
                placeholder="请输入岗位编码"
              />
            </div>
            <div>
              <Label>所属部门 *</Label>
              <Select 
                value={posForm.departmentId} 
                onValueChange={(v) => setPosForm({ ...posForm, departmentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择所属部门" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>职级</Label>
                <Select 
                  value={posForm.level} 
                  onValueChange={(v: any) => setPosForm({ ...posForm, level: v })}
                >
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
              <div>
                <Label>类别</Label>
                <Select 
                  value={posForm.category} 
                  onValueChange={(v: any) => setPosForm({ ...posForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">技术</SelectItem>
                    <SelectItem value="management">管理</SelectItem>
                    <SelectItem value="support">支持</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>岗位描述</Label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={2}
                value={posForm.description}
                onChange={(e) => setPosForm({ ...posForm, description: e.target.value })}
                placeholder="请输入岗位描述"
              />
            </div>
            <div>
              <Label>任职要求</Label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={2}
                value={posForm.requirements}
                onChange={(e) => setPosForm({ ...posForm, requirements: e.target.value })}
                placeholder="请输入任职要求"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSavePosition} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              <Button variant="outline" onClick={() => setShowPosDialog(false)}>
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 部门树形组件
function DepartmentTree({ 
  departments, 
  employees,
  onEdit,
  onDelete 
}: { 
  departments: Department[];
  employees: Employee[];
  onEdit: (dept: Department) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };
  
  const renderDepartment = (dept: Department, level: number = 0) => {
    const manager = employees.find(e => e.id === dept.managerId);
    const isExpanded = expanded.has(dept.id);
    const hasChildren = dept.children && dept.children.length > 0;
    
    return (
      <div key={dept.id} className="select-none">
        <div 
          className="flex items-center py-2 px-3 hover:bg-gray-50 rounded-lg group"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(dept.id)}
            className={`w-5 h-5 flex items-center justify-center mr-2 ${hasChildren ? 'cursor-pointer' : 'invisible'}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          <Building2 className="w-5 h-5 text-blue-500 mr-3" />
          
          <div className="flex-1">
            <div className="font-medium text-gray-900">{dept.name}</div>
            <div className="text-sm text-gray-500">
              {dept.code} {manager && `· 负责人: ${manager.name}`}
            </div>
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" onClick={() => onEdit(dept)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(dept.id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
        
        {isExpanded && dept.children?.map(child => renderDepartment(child, level + 1))}
      </div>
    );
  };
  
  return (
    <div className="border rounded-lg p-4">
      {departments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">暂无部门数据</div>
      ) : (
        departments.map(dept => renderDepartment(dept))
      )}
    </div>
  );
}

export default OrganizationManagement;
