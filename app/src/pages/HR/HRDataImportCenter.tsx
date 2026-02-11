import { useState, useEffect, useCallback } from 'react';
import { 
  Upload, Download, Users, Building2, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Save, Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { organizationApi, employeeApi } from '@/services/api';
import type { Employee, Department } from '@/types';
import { OrgTree } from './HRDataImport/OrgTree';
import { AssessmentOrgChart } from './HRDataImport/AssessmentOrgChart';

const IMPORT_STEPS = [
  { id: 'template', title: '下载模板', description: '获取标准导入模板' },
  { id: 'org', title: '组织架构', description: '设置部门和考核关系' },
  { id: 'preview', title: '数据预览', description: '验证导入数据' },
  { id: 'import', title: '执行导入', description: '批量导入系统' }
];

const SAMPLE_ORG_DATA = `部门编码,部门名称,上级部门编码,部门类型,排序
CEO,总经办,,company,1
HR,人力资源部,CEO,department,2
TECH,工程技术中心,CEO,department,3
TEST,测试部,TECH,subDepartment,1
MECH,机械部,TECH,subDepartment,2
PLC,电气部,TECH,subDepartment,3`;

const SAMPLE_EMPLOYEE_DATA = `员工编号,姓名,部门编码,岗位,角色,职级,直属上级编号,入职日期,手机号,邮箱
E001,张三,TEST,测试工程师,employee,intermediate,M001,2024-01-15,13800138001,zhangsan@company.com
E002,李四,MECH,机械工程师,employee,senior,M002,2023-06-01,13800138002,lisi@company.com
M001,王经理,TEST,测试部经理,manager,senior,,2022-03-01,13900139001,wang@company.com
M002,赵经理,MECH,机械部经理,manager,senior,,2022-03-01,13900139002,zhao@company.com`;

export function HRDataImportCenter() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('template');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ departments: any[]; employees: any[]; errors: string[] }>({ departments: [], employees: [], errors: [] });
  const [showOrgChart, setShowOrgChart] = useState(false);
  
  useEffect(() => { loadExistingData(); }, []);
  
  const loadExistingData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([organizationApi.getAllDepartments(), employeeApi.getAll()]);
      if (deptRes.success) setDepartments(deptRes.data);
      if (empRes.success) setEmployees(empRes.data);
    } catch (error) { console.error('加载数据失败:', error); }
  };
  
  const downloadTemplate = (type: 'org' | 'employee') => {
    const content = type === 'org' ? SAMPLE_ORG_DATA : SAMPLE_EMPLOYEE_DATA;
    const filename = type === 'org' ? '组织架构导入模板.csv' : '员工名册导入模板.csv';
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success(`已下载${type === 'org' ? '组织架构' : '员工名册'}模板`);
  };
  
  const parseCSV = (content: string): any[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => { obj[header] = values[index] || ''; });
      return obj;
    }).filter(row => row[headers[0]]);
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'org' | 'employee') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const data = parseCSV(text);
      if (type === 'org') validateAndPreviewOrg(data);
      else validateAndPreviewEmployees(data);
    } catch { toast.error('文件解析失败'); }
    finally { setLoading(false); }
  };
  
  const validateAndPreviewOrg = (data: any[]) => {
    const errors: string[] = [];
    const validData: any[] = [];
    data.forEach((row, index) => {
      const lineNum = index + 2;
      if (!row['部门编码']) errors.push(`第${lineNum}行：部门编码不能为空`);
      if (!row['部门名称']) errors.push(`第${lineNum}行：部门名称不能为空`);
      if (row['部门编码'] && row['部门名称']) {
        validData.push({ id: row['部门编码'], name: row['部门名称'], code: row['部门编码'], parentId: row['上级部门编码'] || null, type: row['部门类型'] || 'department', sortOrder: parseInt(row['排序']) || 0 });
      }
    });
    setPreviewData(prev => ({ ...prev, departments: validData, errors }));
    if (errors.length === 0) { toast.success(`成功解析${validData.length}个部门`); setCurrentStep(2); }
    else toast.warning(`发现${errors.length}个问题，请修正后重新上传`);
  };
  
  const validateAndPreviewEmployees = (data: any[]) => {
    const errors: string[] = [];
    const validData: any[] = [];
    const validRoles = ['employee', 'manager', 'gm', 'hr'];
    data.forEach((row, index) => {
      const lineNum = index + 2;
      if (!row['员工编号']) errors.push(`第${lineNum}行：员工编号不能为空`);
      if (!row['姓名']) errors.push(`第${lineNum}行：姓名不能为空`);
      if (!row['部门编码']) errors.push(`第${lineNum}行：部门编码不能为空`);
      if (!row['角色']) errors.push(`第${lineNum}行：角色不能为空`);
      if (row['角色'] && !validRoles.includes(row['角色'])) errors.push(`第${lineNum}行：角色必须是 employee/manager/gm/hr 之一`);
      if (row['员工编号'] && row['姓名']) {
        validData.push({ id: row['员工编号'], name: row['姓名'], department: row['部门编码'], subDepartment: row['部门编码'], position: row['岗位'] || '员工', role: row['角色'] || 'employee', level: row['职级'] || 'intermediate', managerId: row['直属上级编号'] || null, joinDate: row['入职日期'] || null, phone: row['手机号'] || '', email: row['邮箱'] || '' });
      }
    });
    setPreviewData(prev => ({ ...prev, employees: validData, errors }));
    if (errors.length === 0) { toast.success(`成功解析${validData.length}名员工`); setCurrentStep(2); }
    else toast.warning(`发现${errors.length}个问题，请修正后重新上传`);
  };
  
  const executeImport = async () => {
    setLoading(true);
    try {
      for (const dept of previewData.departments) {
        try { await organizationApi.createDepartment(dept); } catch (e: any) { if (!e.message?.includes('已存在')) console.error('部门导入失败:', e); }
      }
      let successCount = 0, failCount = 0;
      for (const emp of previewData.employees) {
        try { await employeeApi.create(emp); successCount++; } catch { failCount++; }
      }
      toast.success(`导入完成：成功${successCount}人，失败${failCount}人`);
      setCurrentStep(3);
      loadExistingData();
    } catch { toast.error('导入失败'); }
    finally { setLoading(false); }
  };
  
  const buildOrgTree = useCallback(() => {
    type OrgTreeNode = Department & { children: OrgTreeNode[]; employees: Employee[] };
    const deptMap = new Map<string, OrgTreeNode>(departments.map(d => [d.id, { ...d, children: [], employees: [] }]));
    const roots: OrgTreeNode[] = [];
    departments.forEach(dept => {
      const node = deptMap.get(dept.id);
      if (!node) return;
      if (dept.parentId) { const parent = deptMap.get(dept.parentId); if (parent) parent.children.push(node); else roots.push(node); }
      else roots.push(node);
    });
    employees.forEach(emp => { const dept = deptMap.get(emp.subDepartment || emp.department); if (dept) dept.employees.push(emp); });
    return roots;
  }, [departments, employees]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">HR数据导入中心</h2>
          <p className="text-gray-500 mt-1">批量导入组织架构、员工名册和考核关系</p>
        </div>
        <Button variant="outline" onClick={() => setShowOrgChart(true)}><Network className="w-4 h-4 mr-2" />查看考核关系图</Button>
      </div>
      
      {/* Step indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {IMPORT_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {index < currentStep ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                  </div>
                  <div className="mt-2 text-center"><p className="text-sm font-medium">{step.title}</p><p className="text-xs text-gray-500">{step.description}</p></div>
                </div>
                {index < IMPORT_STEPS.length - 1 && <div className={`flex-1 h-1 mx-4 ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="template">下载模板</TabsTrigger>
          <TabsTrigger value="org">组织架构</TabsTrigger>
          <TabsTrigger value="preview">数据预览</TabsTrigger>
          <TabsTrigger value="import">执行导入</TabsTrigger>
        </TabsList>
        
        <TabsContent value="template" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />组织架构模板</CardTitle><CardDescription>导入公司部门结构和层级关系</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-2">
                  <p className="font-medium">包含字段：</p>
                  <ul className="list-disc list-inside space-y-1"><li>部门编码（唯一标识）</li><li>部门名称</li><li>上级部门编码</li><li>部门类型</li><li>排序</li></ul>
                </div>
                <Button onClick={() => downloadTemplate('org')} className="w-full"><Download className="w-4 h-4 mr-2" />下载组织架构模板</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />员工名册模板</CardTitle><CardDescription>导入员工信息和考核关系</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-2">
                  <p className="font-medium">包含字段：</p>
                  <ul className="list-disc list-inside space-y-1"><li>员工编号</li><li>姓名</li><li>部门编码</li><li>角色</li><li>职级</li><li>直属上级编号</li><li>入职日期、手机号、邮箱</li></ul>
                </div>
                <Button onClick={() => downloadTemplate('employee')} className="w-full"><Download className="w-4 h-4 mr-2" />下载员工名册模板</Button>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => { setActiveTab('org'); setCurrentStep(1); }}>下一步：设置组织架构<ChevronRight className="w-4 h-4 ml-2" /></Button>
          </div>
        </TabsContent>
        
        <TabsContent value="org" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>导入组织架构</CardTitle><CardDescription>上传组织架构CSV文件</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">上传组织架构文件</p>
                <p className="text-sm text-gray-500 mb-4">支持 CSV 格式</p>
                <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'org')} className="hidden" id="org-file" />
                <label htmlFor="org-file"><Button variant="outline" className="cursor-pointer" asChild><span>选择文件</span></Button></label>
              </div>
              {departments.length > 0 && (
                <div className="mt-6"><h4 className="font-semibold mb-3">现有部门结构</h4><div className="border rounded-lg p-4 max-h-64 overflow-y-auto"><OrgTree nodes={buildOrgTree()} /></div></div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>导入员工名册</CardTitle><CardDescription>上传员工名册CSV文件</CardDescription></CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">上传员工名册文件</p>
                <p className="text-sm text-gray-500 mb-4">支持 CSV 格式</p>
                <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'employee')} className="hidden" id="employee-file" />
                <label htmlFor="employee-file"><Button variant="outline" className="cursor-pointer" asChild><span>选择文件</span></Button></label>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => { setActiveTab('template'); setCurrentStep(0); }}><ChevronLeft className="w-4 h-4 mr-2" />上一步</Button>
            <Button onClick={() => { setActiveTab('preview'); setCurrentStep(2); }} disabled={previewData.departments.length === 0 && previewData.employees.length === 0}>下一步：预览数据<ChevronRight className="w-4 h-4 ml-2" /></Button>
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4">
          {previewData.errors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5" />发现 {previewData.errors.length} 个问题</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1 text-sm text-red-600">{previewData.errors.map((error, idx) => <li key={idx}>{error}</li>)}</ul></CardContent>
            </Card>
          )}
          {previewData.departments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />待导入部门 ({previewData.departments.length}个)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>部门编码</TableHead><TableHead>部门名称</TableHead><TableHead>上级部门</TableHead><TableHead>类型</TableHead></TableRow></TableHeader>
                  <TableBody>{previewData.departments.map(dept => (
                    <TableRow key={dept.id}><TableCell>{dept.code}</TableCell><TableCell>{dept.name}</TableCell><TableCell>{dept.parentId || '-'}</TableCell><TableCell><Badge variant="outline">{dept.type}</Badge></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {previewData.employees.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />待导入员工 ({previewData.employees.length}人)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>员工编号</TableHead><TableHead>姓名</TableHead><TableHead>部门</TableHead><TableHead>角色</TableHead><TableHead>职级</TableHead><TableHead>直属上级</TableHead></TableRow></TableHeader>
                  <TableBody>{previewData.employees.map(emp => (
                    <TableRow key={emp.id}><TableCell>{emp.id}</TableCell><TableCell>{emp.name}</TableCell><TableCell>{emp.department}</TableCell>
                      <TableCell><Badge variant={emp.role === 'manager' ? 'default' : 'secondary'}>{emp.role === 'employee' ? '员工' : emp.role === 'manager' ? '经理' : emp.role === 'hr' ? 'HR' : '总经理'}</Badge></TableCell>
                      <TableCell>{emp.level}</TableCell><TableCell>{emp.managerId || '-'}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => { setActiveTab('org'); setCurrentStep(1); }}><ChevronLeft className="w-4 h-4 mr-2" />上一步</Button>
            <Button onClick={() => { setActiveTab('import'); setCurrentStep(3); }} disabled={previewData.errors.length > 0 || (previewData.departments.length === 0 && previewData.employees.length === 0)}>下一步：执行导入<ChevronRight className="w-4 h-4 ml-2" /></Button>
          </div>
        </TabsContent>
        
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>确认导入</CardTitle><CardDescription>请确认以下数据将导入系统</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-blue-600">{previewData.departments.length}</p><p className="text-sm text-gray-600 mt-1">待导入部门</p></div>
                <div className="bg-green-50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-green-600">{previewData.employees.length}</p><p className="text-sm text-gray-600 mt-1">待导入员工</p></div>
                <div className="bg-purple-50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-purple-600">{previewData.employees.filter(e => e.managerId).length}</p><p className="text-sm text-gray-600 mt-1">考核关系数</p></div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">导入说明：</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 部门数据将先导入</li><li>• 员工数据后导入，自动关联部门</li><li>• 考核关系根据"直属上级编号"自动建立</li><li>• 已存在数据将被跳过</li><li>• 新员工默认密码：123456</li>
                </ul>
              </div>
              <Button onClick={executeImport} disabled={loading} className="w-full h-12 text-lg">
                {loading ? '正在导入...' : <><Save className="w-5 h-5 mr-2" />确认导入数据</>}
              </Button>
            </CardContent>
          </Card>
          <div className="flex justify-start">
            <Button variant="outline" onClick={() => { setActiveTab('preview'); setCurrentStep(2); }}><ChevronLeft className="w-4 h-4 mr-2" />返回预览</Button>
          </div>
        </TabsContent>
      </Tabs>
      
      <Dialog open={showOrgChart} onOpenChange={setShowOrgChart}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>组织架构与考核关系图</DialogTitle><DialogDescription>可视化展示部门层级和上下级考核关系</DialogDescription></DialogHeader>
          <div className="mt-4 p-4 border rounded-lg bg-gray-50 min-h-[400px]">
            <AssessmentOrgChart departments={departments} employees={employees} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRDataImportCenter;
