import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Users, Search, Filter, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { assessmentTemplateApi, employeeApi } from '@/services/api';

interface Employee {
  id: string;
  name: string;
  department: string;
  subDepartment?: string;
  role: string;
  level: string;
  position?: string;
  status?: string;
}

interface TemplateAssignment {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  level: string;
  position?: string;
  templateId?: string;
  templateName?: string;
  matchReason?: string;
  priority?: number;
}

export function TemplateAssignmentRules() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const result = await employeeApi.getAll();
      if (result.success) {
        setEmployees(result.data || []);
      }
    } catch (error) {
      console.error('加载员工失败:', error);
      toast.error('加载员工列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      setPreviewLoading(true);
      const filteredEmployees = getFilteredEmployees();
      const employeeIds = filteredEmployees.map((e) => e.id);

      const result = await assessmentTemplateApi.previewAssignments({
        employeeIds: employeeIds.length > 0 ? employeeIds : undefined,
      });

      if (result.success) {
        setAssignments(result.data || []);
        toast.success(`已加载 ${result.data?.length || 0} 条分配记录`);
      }
    } catch (error: unknown) {
      console.error('预览分配失败:', error);
      toast.error('预览分配失败，请检查后端服务');
    } finally {
      setPreviewLoading(false);
    }
  };

  const getFilteredEmployees = () => {
    let filtered = employees;

    if (departmentFilter !== 'all') {
      filtered = filtered.filter((e) => e.department === departmentFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.department.toLowerCase().includes(term) ||
          (e.position && e.position.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const departments = [...new Set(employees.map((e) => e.department))].sort();

  const getMatchReasonBadge = (assignment: TemplateAssignment) => {
    if (!assignment.templateName) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          未匹配
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
        <CheckCircle2 className="w-3 h-3" />
        {assignment.templateName}
      </Badge>
    );
  };

  const getLevelLabel = (level: string) => {
    const map: Record<string, string> = {
      senior: '高级',
      intermediate: '中级',
      junior: '初级',
      assistant: '助理',
    };
    return map[level] || level;
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      employee: '员工',
      manager: '经理',
      gm: '总经理',
      hr: 'HR',
      admin: '管理员',
    };
    return map[role] || role;
  };

  const filteredEmployees = getFilteredEmployees();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">模板分配规则预览</h2>
          <p className="text-gray-500 mt-1">查看员工与考核模板的匹配分配情况</p>
        </div>
        <Button onClick={handlePreview} disabled={previewLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${previewLoading ? 'animate-spin' : ''}`} />
          {previewLoading ? '加载中...' : '刷新分配'}
        </Button>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索姓名、部门、岗位..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium text-gray-700 mb-1 block">部门</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="全部部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部部门</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-500">
            共 <strong>{filteredEmployees.length}</strong> 名员工
            {departmentFilter !== 'all' && `（部门: ${departmentFilter}）`}
            {searchTerm && `（搜索: "${searchTerm}"）`}
          </div>
        </CardContent>
      </Card>

      {/* 分配结果 */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              分配预览结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>员工姓名</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>岗位</TableHead>
                    <TableHead>层级</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>匹配模板</TableHead>
                    <TableHead>优先级</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a, idx) => (
                    <TableRow key={`${a.employeeId}-${idx}`}>
                      <TableCell className="font-medium">{a.employeeName}</TableCell>
                      <TableCell>{a.department}</TableCell>
                      <TableCell>{a.position || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getLevelLabel(a.level)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getRoleLabel(a.role)}</Badge>
                      </TableCell>
                      <TableCell>{getMatchReasonBadge(a)}</TableCell>
                      <TableCell>
                        {a.priority !== undefined ? (
                          <Badge variant="outline">P{a.priority}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {assignments.length === 0 && !previewLoading && (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <Info className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">点击上方「刷新分配」按钮查看员工与模板的匹配情况</p>
            <p className="text-sm mt-2 text-gray-400">
              系统将根据员工的岗位、层级、角色等属性自动匹配最合适的考核模板
            </p>
          </div>
        </Card>
      )}

      {/* 规则说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">分配规则说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            • 模板匹配按照 <strong>优先级(priority)</strong> 从高到低进行，数值越小优先级越高
          </p>
          <p>
            • 匹配条件包括：<strong>适用角色(applicableRoles)</strong>、
            <strong>适用层级(applicableLevels)</strong>、
            <strong>适用岗位(applicablePositions)</strong>
          </p>
          <p>• 员工属性与模板条件越匹配，越可能被分配到该模板</p>
          <p>• 如果没有任何模板匹配，将显示"未匹配"</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
