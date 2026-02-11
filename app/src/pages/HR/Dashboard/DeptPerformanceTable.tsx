import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  BarChart3,
  Building2,
  Users,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { resolveGroupType } from '@/lib/config';

export interface DeptRecord {
  rootDepartment: string;
  subDepartments: SubDeptRecord[];
  completedCount: number;
  totalCount: number;
}

export interface SubDeptRecord {
  subDepartment: string;
  records: EmployeeRecord[];
  completedCount: number;
  totalCount: number;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  role: string;
  level: string;
  record: any;
  totalScore: number;
  status: string;
}

const isScoredStatus = (status: string) => status === 'completed' || status === 'scored';

interface DeptPerformanceTableProps {
  currentMonth: string;
  deptRecords: DeptRecord[];
  sortBy: 'name' | 'score' | 'status';
  sortOrder: 'asc' | 'desc';
  setSortBy: (v: 'name' | 'score' | 'status') => void;
  setSortOrder: (v: 'asc' | 'desc') => void;
  onEmployeeClick: (emp: any) => void;
}

export function DeptPerformanceTable({ currentMonth, deptRecords, sortBy, sortOrder, setSortBy, setSortOrder, onEmployeeClick }: DeptPerformanceTableProps) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const toggleDept = (rootDept: string) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(rootDept)) newExpanded.delete(rootDept);
    else newExpanded.add(rootDept);
    setExpandedDepts(newExpanded);
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          {currentMonth} 部门绩效统计
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {deptRecords.map((dept) => {
          const isDeptExpanded = expandedDepts.has(dept.rootDepartment);
          return (
            <div key={dept.rootDepartment} className="mb-6 last:mb-0">
              <div
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => toggleDept(dept.rootDepartment)}
              >
                <div className="flex items-center gap-3">
                  {isDeptExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Building2 className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">{dept.rootDepartment}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">共 <span className="font-semibold text-gray-900">{dept.totalCount}</span> 人</span>
                  <span className="text-emerald-600">已评分 <span className="font-semibold">{dept.completedCount}</span> 人</span>
                  <span className="text-amber-600">未评分 <span className="font-semibold">{dept.totalCount - dept.completedCount}</span> 人</span>
                </div>
              </div>

              {isDeptExpanded && (
                <div className="mt-2 space-y-2">
                  {dept.subDepartments.map(subDept => (
                    <div key={subDept.subDepartment} className="ml-4">
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{subDept.subDepartment}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>共 {subDept.totalCount} 人</span>
                          <span>已评分 {subDept.completedCount} 人</span>
                        </div>
                      </div>

                      {subDept.records.length > 0 ? (
                        <div className="ml-6 mt-1">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">姓名</TableHead>
                                <TableHead className="text-xs">岗位</TableHead>
                                <TableHead className="text-xs text-right">
                                  <div className="cursor-pointer hover:text-blue-600 flex items-center justify-end gap-1"
                                    onClick={() => {
                                      if (sortBy === 'score') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                      else { setSortBy('score'); setSortOrder('desc'); }
                                    }}>
                                    考评得分
                                    {sortBy === 'score' && <span className="text-xs text-gray-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                                  </div>
                                </TableHead>
                                <TableHead className="text-xs text-center">分组</TableHead>
                                <TableHead className="text-xs text-center">组内排名</TableHead>
                                <TableHead className="text-xs text-center">跨部门排名</TableHead>
                                <TableHead className="text-xs">考评状态</TableHead>
                                <TableHead className="text-xs">操作</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {subDept.records.map((emp) => (
                                <TableRow key={`${dept.rootDepartment}-${subDept.subDepartment}-${emp.id}`}>
                                  <TableCell className="text-xs font-medium">
                                    <button type="button" className="text-primary hover:underline hover:text-blue-700 text-left w-full" onClick={() => onEmployeeClick(emp)}>
                                      <div className="leading-tight">
                                        <div>{emp.name}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{emp.id} · {emp.level || '—'}</div>
                                      </div>
                                    </button>
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600">{emp.role === 'manager' ? '部门经理' : '员工'}</TableCell>
                                  <TableCell className="text-xs text-right">
                                    {isScoredStatus(emp.status)
                                      ? <span className="font-semibold text-emerald-600">{emp.totalScore.toFixed(2)}</span>
                                      : <span className="text-gray-400">--</span>}
                                  </TableCell>
                                  <TableCell className="text-xs text-center">
                                    {resolveGroupType(emp.record?.groupType, emp.level) ? (
                                      <Badge className={cn("text-[10px]",
                                        resolveGroupType(emp.record?.groupType, emp.level) === 'high' ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                                      )}>
                                        {resolveGroupType(emp.record?.groupType, emp.level) === 'high' ? '高分组' : '低分组'}
                                      </Badge>
                                    ) : <span className="text-gray-400">—</span>}
                                  </TableCell>
                                  <TableCell className="text-xs text-center">{emp.record?.groupRank || '—'}</TableCell>
                                  <TableCell className="text-xs text-center">{emp.record?.crossDeptRank || '—'}</TableCell>
                                  <TableCell>
                                    {isScoredStatus(emp.status)
                                      ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">已评分</Badge>
                                      : <Badge className="bg-amber-100 text-amber-700 text-xs">待评分</Badge>}
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="sm" className="h-6 w-6" onClick={() => onEmployeeClick(emp)}>
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="ml-6 mt-2 text-xs text-gray-400 py-2">该筛选条件下暂无员工</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {deptRecords.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无绩效数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
