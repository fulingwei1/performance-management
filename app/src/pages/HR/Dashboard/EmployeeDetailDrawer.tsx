import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { resolveGroupType } from '@/lib/config';

interface EmployeeDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  currentMonth: string;
}

const isScoredStatus = (status: string) => status === 'completed' || status === 'scored';

export function EmployeeDetailDrawer({ open, onOpenChange, employee, currentMonth }: EmployeeDetailDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl max-h-[90vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle>{employee?.name || '员工详情'}</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
          </DrawerClose>
        </DrawerHeader>
        
        {employee && (
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">姓名：{employee.name}</span></div>
                    <div><span className="text-gray-500">岗位：{employee.role === 'manager' ? '部门经理' : '员工'}</span></div>
                    <div><span className="text">部门：{employee.department}</span></div>
                    <div><span className="text-gray-500">子部门：{employee.subDepartment || '—'}</span></div>
                    <div><span className="text-gray-500">月份：{currentMonth}</span></div>
                    <div>
                      <span className="text-gray-500">考评状态：</span>
                      <Badge className={isScoredStatus(employee.status) ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                        {isScoredStatus(employee.status) ? '已评分' : '待评分'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500">考评得分：</span>
                      <span className="font-semibold">
                        {isScoredStatus(employee.status) ? `${employee.totalScore.toFixed(2)} 分` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">分组：</span>
                      <span className="font-semibold">
                        {resolveGroupType(employee.record?.groupType, employee.level)
                          ? (resolveGroupType(employee.record?.groupType, employee.level) === 'high' ? '高分组' : '低分组')
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">组内排名：</span>
                      <span className="font-semibold">{employee.record?.groupRank || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">跨部门排名：</span>
                      <span className="font-semibold">{employee.record?.crossDeptRank || '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {employee.record && isScoredStatus(employee.status) && (
                <Card>
                  <CardHeader><CardTitle className="text-base">考评明细</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">自我总结</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{employee.record.selfSummary || '暂无'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">下月计划</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{employee.record.nextMonthPlan || '暂无'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">部门经理评价</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{employee.record.managerComment || '暂无'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">得分明细</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">承担任务量：{employee.record.taskCompletion.toFixed(2)}</span></div>
                        <div><span className="text-gray-500">主动性：{employee.record.initiative.toFixed(2)}</span></div>
                        <div><span className="text-gray-500">项目反馈：{employee.record.projectFeedback.toFixed(2)}</span></div>
                        <div><span className="text-gray-500">质量改进：{employee.record.qualityImprovement.toFixed(2)}</span></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}
      </DrawerContent>
    </Drawer>
  );
}
