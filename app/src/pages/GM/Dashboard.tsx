import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Crown,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  MessageSquare,
  X
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useHRStore } from '@/stores/hrStore';
import { employeeApi } from '@/services/api';
import { performanceApi } from '@/services/api';
import { StatsCard } from '@/components/stats/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PerformanceRecord } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 生成最近 N 个月的选项
function getMonthOptions(count: number) {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = format(d, 'yyyy-MM');
    const label = format(d, 'yyyy年M月', { locale: zhCN });
    options.push({ value, label });
  }
  return options;
}

const MONTH_OPTIONS = getMonthOptions(24);

export function GMDashboard() {
  const { user } = useAuthStore();
  const { gmScores, getAllManagers, generateGMTasks, fetchEmployees } = useHRStore();

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [employees, setEmployees] = useState<{ id: string; name: string; department: string; subDepartment?: string; role?: string }[]>([]);
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<PerformanceRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // 展开状态管理
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // 总经理评分（季度）相关
  const currentQuarter = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const quarterScores = gmScores.filter((s) => s.quarter === currentQuarter);
  const managers = getAllManagers();
  const pendingGMCount = quarterScores.filter((s) => s.status === 'pending').length;
  const completedGMCount = quarterScores.filter((s) => s.status === 'completed').length;

  // 初始化：加载员工数据到 hrStore
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // 生成总经理评分任务（在员工数据加载后）
  useEffect(() => {
    if (quarterScores.length === 0 && managers.length > 0) {
      generateGMTasks(currentQuarter);
    }
  }, [currentQuarter, managers.length, quarterScores.length, generateGMTasks]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [empRes, recRes] = await Promise.all([
          employeeApi.getAll(),
          performanceApi.getRecordsByMonth(selectedMonth),
        ]);
        if (empRes.success && empRes.data) {
          setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
        }
        if (recRes.success && recRes.data) {
          setRecords(Array.isArray(recRes.data) ? recRes.data : []);
        }
      } catch (e) {
        setEmployees([]);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [selectedMonth]);

  // 仅统计员工角色（不含 GM/HR 等管理岗可按需过滤，这里按全量）
  const totalCount = employees.length;

  // 按部门汇总：部门名 -> { total, completed, notCompleted }
  const departmentStats = useMemo(() => {
    const deptMap = new Map<
      string,
      { total: number; completed: number; employeeIds: Set<string> }
    >();
    employees.forEach((e) => {
      const dept = e.department || '未分配';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { total: 0, completed: 0, employeeIds: new Set() });
      }
      const stat = deptMap.get(dept)!;
      stat.total += 1;
      stat.employeeIds.add(e.id);
    });
    const scoredStatuses = ['completed', 'scored'];
    records.forEach((r) => {
      if (!scoredStatuses.includes(r.status)) return;
      const dept = r.department || '未分配';
      if (deptMap.has(dept)) {
        const stat = deptMap.get(dept)!;
        if (stat.employeeIds.has(r.employeeId)) {
          stat.completed += 1;
        }
      }
    });
    return Array.from(deptMap.entries()).map(([name, s]) => ({
      department: name,
      total: s.total,
      completed: s.completed,
      notCompleted: s.total - s.completed,
    }));
  }, [employees, records]);

  // 已打绩效列表：按部门分组，部门内按总分从高到低
  const scoredByDepartment = useMemo(() => {
    const scored = records.filter((r) => r.status === 'completed' || r.status === 'scored');
    const byDept = new Map<string, PerformanceRecord[]>();
    scored.forEach((r) => {
      const dept = r.department || '未分配';
      if (!byDept.has(dept)) byDept.set(dept, []);
      byDept.get(dept)!.push(r);
    });
    byDept.forEach((list) => list.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0)));
    const order = departmentStats.map((d) => d.department);
    return order.map((dept) => ({
      department: dept,
      records: byDept.get(dept) ?? [],
    }));
  }, [records, departmentStats]);

  const totalCompleted = records.filter((r) => r.status === 'completed' || r.status === 'scored').length;

  // 辅助函数：从 subDepartment 提取二级部门名称（去掉三级部门）
  // 如 "测试部-白色家电组" -> "测试部", "PLC部-PLC二组" -> "PLC部"
  const getSecondLevelDept = (subDepartment: string | undefined): string => {
    if (!subDepartment) return '';
    // 如果包含 "-"，取第一部分作为二级部门
    const parts = subDepartment.split('-');
    return parts[0].trim() || subDepartment;
  };

  // 构建层级部门数据（一级部门 -> 二级部门 -> 员工列表）
  const deptRecords = useMemo(() => {
    // 获取所有一级部门
    const rootDepartments = [...new Set(employees.map(e => e.department))].filter(Boolean);
    
    return rootDepartments.map(rootDept => {
      const rootDeptEmployees = employees.filter(e => e.department === rootDept);
      
      // 提取二级部门及其员工
      const subDeptMap = new Map<string, {
        employees: Array<{
          id: string;
          name: string;
          role?: string;
          record: PerformanceRecord | null;
          totalScore: number;
          status: string;
        }>;
      }>();
      
      rootDeptEmployees.forEach(emp => {
        // 如果没有二级部门，使用"直属"作为默认分组
        const secondLevelDept = getSecondLevelDept(emp.subDepartment) || '直属';
        
        if (!subDeptMap.has(secondLevelDept)) {
          subDeptMap.set(secondLevelDept, { employees: [] });
        }
        
        const record = records.find(r => r.employeeId === emp.id);
        subDeptMap.get(secondLevelDept)!.employees.push({
          id: emp.id,
          name: emp.name,
          role: emp.role,
          record: record || null,
          totalScore: record?.totalScore || 0,
          status: record?.status || 'pending'
        });
      });
      
      // 转换为数组格式，并计算统计
      const subDeptRecords = Array.from(subDeptMap.entries()).map(([subDept, data]) => {
        const completedCount = data.employees.filter(e => e.status === 'completed' || e.status === 'scored').length;
        return {
          subDepartment: subDept,
          employees: data.employees,
          completedCount,
          totalCount: data.employees.length
        };
      });
      
      return {
        rootDepartment: rootDept,
        subDepartments: subDeptRecords,
        completedCount: subDeptRecords.reduce((sum, s) => sum + s.completedCount, 0),
        totalCount: subDeptRecords.reduce((sum, s) => sum + s.totalCount, 0)
      };
    });
  }, [employees, records]);

  // 切换一级部门展开状态
  const toggleDept = (rootDept: string) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(rootDept)) {
      newExpanded.delete(rootDept);
    } else {
      newExpanded.add(rootDept);
    }
    setExpandedDepts(newExpanded);
  };

  const openDetail = (record: PerformanceRecord) => {
    setSelectedRecord(record);
    setDrawerOpen(true);
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.03 },
    }),
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">总经理工作台</h1>
          <p className="text-gray-500 mt-1">欢迎回来，{user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="选择月份" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 总人数 + 部门统计卡片 */}
      <motion.div variants={itemVariants} custom={0} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="总人数"
          value={loading ? '—' : totalCount}
          icon={Users}
          className="bg-white border border-gray-200"
        />
        <StatsCard
          title="本月已打绩效"
          value={loading ? '—' : totalCompleted}
          icon={CheckCircle2}
          className="bg-emerald-50 border border-emerald-200"
        />
        <StatsCard
          title="本月未完成"
          value={loading ? '—' : totalCount - totalCompleted}
          icon={Clock}
          className="bg-amber-50 border border-amber-200"
        />
        <StatsCard
          title="部门数"
          value={loading ? '—' : departmentStats.length}
          icon={Building2}
          className="bg-blue-50 border border-blue-200"
        />
      </motion.div>

      {/* 部门绩效统计 */}
      <motion.div variants={itemVariants} custom={1}>
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              {selectedMonth} 部门绩效统计
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {deptRecords.map((dept) => {
                const isDeptExpanded = expandedDepts.has(dept.rootDepartment);
                
                return (
                  <div key={dept.rootDepartment} className="border border-gray-100 rounded-lg overflow-hidden">
                    {/* 一级部门行 */}
                    <div 
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => toggleDept(dept.rootDepartment)}
                    >
                      <div className="flex items-center gap-3">
                        {isDeptExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        <Building2 className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900">{dept.rootDepartment}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          共 <span className="font-semibold text-gray-900">{dept.totalCount}</span> 人
                        </span>
                        <span className="text-emerald-600">
                          已评分 <span className="font-semibold">{dept.completedCount}</span> 人
                        </span>
                        <span className="text-amber-600">
                          未评分 <span className="font-semibold">{dept.totalCount - dept.completedCount}</span> 人
                        </span>
                      </div>
                    </div>
                    
                    {/* 展开的二级部门和员工列表 */}
                    {isDeptExpanded && (
                      <div className="border-t border-gray-100">
                        {dept.subDepartments.map(subDept => (
                          <div key={subDept.subDepartment} className="border-b border-gray-50 last:border-b-0">
                            {/* 二级部门标题行 */}
                            <div className="flex items-center justify-between p-2.5 pl-8 bg-blue-50/50">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-800">{subDept.subDepartment}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-gray-500">
                                  共 <span className="font-semibold text-gray-700">{subDept.totalCount}</span> 人
                                </span>
                                <span className="text-emerald-600">
                                  已评分 <span className="font-semibold">{subDept.completedCount}</span> 人
                                </span>
                                <span className="text-amber-600">
                                  未评分 <span className="font-semibold">{subDept.totalCount - subDept.completedCount}</span> 人
                                </span>
                              </div>
                            </div>
                            
                            {/* 员工列表 */}
                            {subDept.employees.length > 0 && (
                              <div className="pl-10 pr-4 py-2 bg-white">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="text-xs py-2 w-24">姓名</TableHead>
                                      <TableHead className="text-xs py-2 w-20">岗位</TableHead>
                                      <TableHead className="text-xs py-2 text-center w-24">考评状态</TableHead>
                                      <TableHead className="text-xs py-2 text-right w-24">考评得分</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {subDept.employees.map((emp) => (
                                      <TableRow key={emp.id} className="hover:bg-gray-50">
                                        <TableCell className="text-sm py-2">
                                          <button
                                            type="button"
                                            className="font-medium text-primary hover:underline text-left"
                                            onClick={() => emp.record && openDetail(emp.record)}
                                            disabled={!emp.record}
                                          >
                                            {emp.name}
                                          </button>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-600 py-2">
                                          {emp.role === 'manager' ? '经理' : emp.role === 'hr' ? 'HR' : emp.role === 'gm' ? '总经理' : '员工'}
                                        </TableCell>
                                        <TableCell className="text-center py-2">
                                          {emp.status === 'completed' || emp.status === 'scored' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                                              已评分
                                            </span>
                                          ) : emp.status === 'submitted' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                              已提交
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                              待评分
                                            </span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right py-2">
                                          {emp.status === 'completed' || emp.status === 'scored' ? (
                                            <span className="font-semibold text-emerald-600">{emp.totalScore.toFixed(2)}</span>
                                          ) : (
                                            <span className="text-gray-400">--</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {deptRecords.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无部门数据</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 已打绩效人员：按部门、按分数从高到低，点击姓名看详情 */}
      <motion.div variants={itemVariants} custom={2}>
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              已打绩效人员（按部门、分数从高到低）
            </CardTitle>
            <p className="text-sm text-gray-500">
              点击姓名可查看该员工的自我总结与部门经理评价
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">加载中…</p>
            ) : scoredByDepartment.every((s) => s.records.length === 0) ? (
              <p className="text-sm text-gray-500">该月份暂无已打绩效记录</p>
            ) : (
              <div className="space-y-6">
                {scoredByDepartment.map(
                  (section) =>
                    section.records.length > 0 && (
                      <div key={section.department}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {section.department}
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>姓名</TableHead>
                              <TableHead>子部门</TableHead>
                              <TableHead className="text-right">总分</TableHead>
                              <TableHead className="text-right">状态</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {section.records.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell>
                                  <button
                                    type="button"
                                    className="font-medium text-primary hover:underline text-left"
                                    onClick={() => openDetail(r)}
                                  >
                                    {r.employeeName}
                                  </button>
                                </TableCell>
                                <TableCell>{r.subDepartment ?? '—'}</TableCell>
                                <TableCell className="text-right">
                                  {(r.totalScore ?? 0).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-emerald-600 text-sm">已评分</span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      {/* 绩效详情抽屉 */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle className="flex items-center justify-between">
              <span>{selectedRecord?.employeeName ?? '绩效详情'}</span>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </DrawerTitle>
          </DrawerHeader>
          {selectedRecord && (
            <ScrollArea className="flex-1 px-6 pb-6">
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <span>部门：{selectedRecord.department}</span>
                  <span>子部门：{selectedRecord.subDepartment ?? '—'}</span>
                  <span>月份：{selectedRecord.month}</span>
                  <span>总分：{(selectedRecord.totalScore ?? 0).toFixed(2)}</span>
                </div>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      自我总结
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 whitespace-pre-wrap text-sm text-gray-700">
                    {selectedRecord.selfSummary || '—'}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      下月计划
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 whitespace-pre-wrap text-sm text-gray-700">
                    {selectedRecord.nextMonthPlan || '—'}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      部门经理评价
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 whitespace-pre-wrap text-sm text-gray-700">
                    {selectedRecord.managerComment || '—'}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">下月工作安排</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 whitespace-pre-wrap text-sm text-gray-700">
                    {selectedRecord.nextMonthWorkArrangement || '—'}
                  </CardContent>
                </Card>
                <div className="text-sm text-gray-600">
                  <p>任务完成：{(selectedRecord.taskCompletion ?? 0).toFixed(2)}</p>
                  <p>主动性：{(selectedRecord.initiative ?? 0).toFixed(2)}</p>
                  <p>项目反馈：{(selectedRecord.projectFeedback ?? 0).toFixed(2)}</p>
                  <p>质量改进：{(selectedRecord.qualityImprovement ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </ScrollArea>
          )}
        </DrawerContent>
      </Drawer>
    </motion.div>
  );
}
