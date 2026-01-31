import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Upload,
  Edit,
  Trash2,
  Search,
  FileSpreadsheet,
  Save,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { employeeApi, organizationApi } from '@/services/api';
import type { EmployeeArchive, EmployeeLevel } from '@/types';

type DeptFlat = { id: string; name: string; code?: string; parentId?: string | null };

// 在职状态映射
const WORK_STATUS_MAP: Record<string, 'active' | 'probation' | 'internship' | 'inactive' | 'retired'> = {
  '实习期': 'internship',
  '试用期': 'probation',
  '在职': 'active',
  '离职': 'inactive',
  '退休': 'retired'
};

// 职级映射
const LEVEL_MAP: Record<string, EmployeeLevel> = {
  '高级': 'senior',
  '中级': 'intermediate',
  '初级': 'junior',
  '助理': 'assistant',
  '待定': 'intermediate'
};

export function EmployeeArchiveManagement() {
  const [employees, setEmployees] = useState<EmployeeArchive[]>([]);
  const [_loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // 表单对话框
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeArchive | null>(null);
  const [formData, setFormData] = useState<Partial<EmployeeArchive>>({});
  
  // 导入对话框
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [previewData, setPreviewData] = useState<EmployeeArchive[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  // 详情对话框
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeArchive | null>(null);
  
  // 组织架构（用于部门选择/调动）
  const [orgDepartments, setOrgDepartments] = useState<DeptFlat[]>([]);
  
  useEffect(() => {
    fetchEmployees();
  }, []);
  
  useEffect(() => {
    organizationApi.getAllDepartments().then((res) => {
      if (res.success && Array.isArray(res.data)) setOrgDepartments(res.data);
    }).catch(() => {});
  }, []);
  
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await employeeApi.getAll();
      if (res.success) {
        setEmployees(res.data);
      }
    } catch (error) {
      toast.error('加载员工数据失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 解析CSV
  const parseCSV = (content: string): any[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    }).filter(row => row['姓名']);
  };
  
  // 验证并预览导入数据
  const validateAndPreviewImport = (data: any[]) => {
    const errors: string[] = [];
    const validData: EmployeeArchive[] = [];
    
    data.forEach((row, index) => {
      const lineNum = index + 2;
      
      // 必填字段检查
      if (!row['姓名']) errors.push(`第${lineNum}行：姓名不能为空`);
      if (!row['一级部门']) errors.push(`第${lineNum}行：一级部门不能为空`);
      if (!row['岗位']) errors.push(`第${lineNum}行：岗位不能为空`);
      
      // 在职状态检查（只导入在职人员）
      const status = row['在职离职状态'];
      if (status && !['实习期', '试用期', '在职'].includes(status)) {
        console.log(`第${lineNum}行：${row['姓名']} 状态为"${status}"，跳过导入`);
        return; // 跳过非在职人员
      }
      
      if (row['姓名'] && row['一级部门']) {
        validData.push({
          id: row['员工编号'] || `EMP${Date.now()}${index}`,
          name: row['姓名'],
          department: row['一级部门'],
          subDepartment: row['二级部门'] || row['一级部门'],
          thirdDepartment: row['三级部门'] || '',
          position: row['岗位'],
          level: LEVEL_MAP[row['级别']] || 'intermediate',
          role: row['直接上级'] ? 'employee' : 'manager',
          managerId: row['直接上级'] || undefined,
          workStatus: WORK_STATUS_MAP[status] || 'active',
          joinDate: row['入职时间'] || new Date().toISOString().split('T')[0],
          gender: row['性别'] || '',
          isRegular: row['是否转正'] === '是',
          regularDate: row['转正日期'] || '',
          contractStart: row['签订日期'] || '',
          contractEnd: row['合同到期日'] || '',
          idCard: row['身份证号'] || '',
          birthDate: row['出生年月'] || '',
          age: parseInt(row['年龄']) || 0,
          ethnicity: row['民族'] || '',
          politicalStatus: row['政治面貌'] || '',
          maritalStatus: row['婚姻状况'] || '',
          phone: row['联系方式']?.toString() || '',
          height: parseFloat(row['身高cm']) || 0,
          weight: parseFloat(row['体重kg']) || 0,
          birthplace: row['籍贯'] || '',
          homeAddress: row['家庭住址'] || '',
          currentAddress: row['目前住址'] || '',
          emergencyContact: row['紧急联系人'] || '',
          emergencyPhone: row['紧急联系电话']?.toString() || '',
          school: row['毕业院校'] || '',
          graduationDate: row['毕业时间'] || '',
          major: row['所学专业'] || '',
          education: row['文化程度'] || '',
          bankAccount: row['招商银行卡号/中国工商银行卡']?.toString() || '',
          socialSecurityNumber: row['社保号']?.toString() || '',
          providentFundNumber: row['公积金号']?.toString() || '',
          status: 'active'
        });
      }
    });
    
    setPreviewData(validData);
    setImportErrors(errors);
    
    if (errors.length === 0 && validData.length > 0) {
      toast.success(`成功解析${validData.length}名在职员工`);
    } else if (errors.length > 0) {
      toast.warning(`发现${errors.length}个问题`);
    }
  };
  
  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = parseCSV(text);
      validateAndPreviewImport(data);
    } catch (error) {
      toast.error('文件解析失败');
    }
  };
  
  // 执行导入
  const executeImport = async () => {
    setLoading(true);
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const emp of previewData) {
        try {
          await employeeApi.create(emp);
          successCount++;
        } catch (e) {
          failCount++;
          console.error('导入失败:', e);
        }
      }
      
      toast.success(`导入完成：成功${successCount}人，失败${failCount}人`);
      setShowImportDialog(false);
      setPreviewData([]);
      fetchEmployees();
    } catch (error) {
      toast.error('导入失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 保存员工（新增/编辑）
  const handleSaveEmployee = async () => {
    try {
      if (editingEmployee) {
        await employeeApi.updateEmployee(editingEmployee.id, formData);
        toast.success('员工信息更新成功');
      } else {
        await employeeApi.create({
          ...formData,
          id: `EMP${Date.now()}`,
          password: '123456'
        });
        toast.success('员工创建成功');
      }
      setShowFormDialog(false);
      setEditingEmployee(null);
      setFormData({});
      fetchEmployees();
    } catch (error) {
      toast.error('保存失败');
    }
  };
  
  // 删除员工
  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('确定要删除该员工档案吗？此操作不可恢复！')) return;
    
    try {
      await employeeApi.deleteEmployee(id);
      toast.success('员工档案已删除');
      fetchEmployees();
    } catch (error) {
      toast.error('删除失败');
    }
  };
  
  // 筛选员工
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'all' || emp.department === filterDept;
    const matchesStatus = filterStatus === 'all' || emp.workStatus === filterStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });
  
  // 获取所有部门（筛选用）
  const departments = [...new Set(employees.map(e => e.department))];
  
  // 组织架构部门选项：一级 + 二级/三级子部门
  const departmentOptions = (() => {
    const flat = orgDepartments as DeptFlat[];
    const roots = flat.filter((d) => !d.parentId);
    const rootNames = roots.map((d) => d.name);
    const subOptionsByRoot: Record<string, string[]> = {};
    for (const root of roots) {
      const children = flat.filter((d) => d.parentId === root.id);
      const grandchildNames = children.flatMap((c) =>
        flat.filter((d) => d.parentId === c.id).map((d) => d.name)
      );
      subOptionsByRoot[root.name] = [...new Set([...children.map((c) => c.name), ...grandchildNames])];
    }
    return { rootNames, subOptionsByRoot };
  })();
  
  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">员工档案管理</h2>
          <p className="text-gray-500 mt-1">管理员工信息、导入档案、建立考核关系</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            批量导入
          </Button>
          <Button onClick={() => { setEditingEmployee(null); setFormData({}); setShowFormDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            新增员工
          </Button>
        </div>
      </div>
      
      {/* 筛选栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索姓名或编号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="选择部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部部门</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="在职状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">在职</SelectItem>
                <SelectItem value="probation">试用期</SelectItem>
                <SelectItem value="internship">实习期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* 员工列表 */}
      <Card>
        <CardHeader>
          <CardTitle>员工档案列表</CardTitle>
          <CardDescription>共 {filteredEmployees.length} 人</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>员工编号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>岗位</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>直接上级</TableHead>
                <TableHead>入职日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.id}</TableCell>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{emp.department}</div>
                      {emp.subDepartment && emp.subDepartment !== emp.department && (
                        <div className="text-gray-500 text-xs">{emp.subDepartment}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{emp.position}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{emp.level}</Badge>
                  </TableCell>
                  <TableCell>{emp.managerId || '-'}</TableCell>
                  <TableCell>{emp.joinDate}</TableCell>
                  <TableCell>
                    <Badge className={
                      emp.workStatus === 'active' ? 'bg-green-100 text-green-700' :
                      emp.workStatus === 'probation' ? 'bg-yellow-100 text-yellow-700' :
                      emp.workStatus === 'internship' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {emp.workStatus === 'active' ? '在职' :
                       emp.workStatus === 'probation' ? '试用期' :
                       emp.workStatus === 'internship' ? '实习期' :
                       emp.workStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedEmployee(emp); setShowDetailDialog(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingEmployee(emp); setFormData(emp); setShowFormDialog(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteEmployee(emp.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无员工数据</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowImportDialog(true)}>
                导入员工档案
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量导入员工档案</DialogTitle>
            <DialogDescription>
              上传CSV文件导入员工信息。系统会自动过滤离职人员，只导入实习期、试用期、在职人员。
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="upload" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">上传文件</TabsTrigger>
              <TabsTrigger value="preview">数据预览</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">上传员工档案CSV文件</p>
                <p className="text-sm text-gray-500 mb-4">
                  支持从Excel导出的CSV格式，会自动识别列名
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="import-file"
                />
                <label htmlFor="import-file">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>选择文件</span>
                  </Button>
                </label>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  导入说明
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 必填字段：姓名、一级部门、岗位</li>
                  <li>• 直接上级为空的会被识别为部门经理</li>
                  <li>• 在职状态为"实习期"、"试用期"、"在职"的才会导入</li>
                  <li>• 已存在的员工（按编号判断）会被跳过</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-red-700 mb-2">发现 {importErrors.length} 个问题</h4>
                  <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {previewData.length > 0 ? (
                <>
                  <div className="text-sm text-gray-500 mb-2">
                    共解析 {previewData.length} 名在职员工
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>姓名</TableHead>
                        <TableHead>部门</TableHead>
                        <TableHead>岗位</TableHead>
                        <TableHead>级别</TableHead>
                        <TableHead>直接上级</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 10).map((emp, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{emp.name}</TableCell>
                          <TableCell>{emp.department} / {emp.subDepartment}</TableCell>
                          <TableCell>{emp.position}</TableCell>
                          <TableCell>{emp.level}</TableCell>
                          <TableCell>{emp.managerId || '(经理)'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {previewData.length > 10 && (
                    <p className="text-sm text-gray-500 text-center mt-2">
                      还有 {previewData.length - 10} 条数据...
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>请先上传文件</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={executeImport} 
              disabled={previewData.length === 0 || importErrors.length > 0}
            >
              确认导入 ({previewData.length}人)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 员工表单对话框 */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? '编辑员工档案' : '新增员工档案'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>姓名 *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <Label>员工编号</Label>
              <Input
                value={formData.id || ''}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="系统自动生成"
                disabled={!editingEmployee}
              />
            </div>
            <div>
              <Label>一级部门 *</Label>
              {departmentOptions.rootNames.length > 0 ? (
                <Select
                  value={formData.department || ''}
                  onValueChange={(v) => setFormData({ ...formData, department: v, subDepartment: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门（可调动）" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.rootNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="如：工程技术中心"
                />
              )}
            </div>
            <div>
              <Label>二级部门</Label>
              {departmentOptions.rootNames.length > 0 && formData.department && departmentOptions.subOptionsByRoot[formData.department]?.length > 0 ? (
                <Select
                  value={formData.subDepartment || ''}
                  onValueChange={(v) => setFormData({ ...formData, subDepartment: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择子部门" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">（无）</SelectItem>
                    {departmentOptions.subOptionsByRoot[formData.department].map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.subDepartment || ''}
                  onChange={(e) => setFormData({ ...formData, subDepartment: e.target.value })}
                  placeholder="如：测试部"
                />
              )}
            </div>
            <div>
              <Label>岗位 *</Label>
              <Input
                value={formData.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="如：测试工程师"
              />
            </div>
            <div>
              <Label>级别</Label>
              <Select
                value={formData.level}
                onValueChange={(v) => setFormData({ ...formData, level: v as EmployeeLevel })}
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
              <Label>角色</Label>
              <Select 
                value={formData.role} 
                onValueChange={(v: any) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">员工</SelectItem>
                  <SelectItem value="manager">经理</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>直接上级（考核人）</Label>
              <Input
                value={formData.managerId || ''}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                placeholder="填写上级姓名或编号"
              />
            </div>
            <div>
              <Label>入职日期</Label>
              <Input
                type="date"
                value={formData.joinDate || ''}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
              />
            </div>
            <div>
              <Label>联系方式</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="手机号"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEmployee}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>员工档案详情</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                  {selectedEmployee.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedEmployee.name}</h3>
                  <p className="text-gray-500">{selectedEmployee.position} | {selectedEmployee.department}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">员工编号：</span>
                  <span className="font-medium">{selectedEmployee.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">入职日期：</span>
                  <span className="font-medium">{selectedEmployee.joinDate}</span>
                </div>
                <div>
                  <span className="text-gray-500">部门：</span>
                  <span className="font-medium">
                    {selectedEmployee.department} / {selectedEmployee.subDepartment}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">直接上级：</span>
                  <span className="font-medium">{selectedEmployee.managerId || '（部门经理）'}</span>
                </div>
                <div>
                  <span className="text-gray-500">级别：</span>
                  <span className="font-medium">{selectedEmployee.level}</span>
                </div>
                <div>
                  <span className="text-gray-500">联系方式：</span>
                  <span className="font-medium">{selectedEmployee.phone}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmployeeArchiveManagement;
