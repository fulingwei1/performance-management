import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, FileText, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function EmployeeInfo() {
  const [activeTab, setActiveTab] = useState<'archive' | 'organization'>('archive');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const departments = [
    { id: 'all', name: '全部部门' },
    { id: '测试部', name: '测试部' },
    { id: '机械部', name: '机械部' },
    { id: 'PLC', name: 'PLC' },
    { id: '技术开发部-软件组', name: '技术开发部-软件组' },
    { id: '技术开发部-电子硬件组', name: '技术开发部-电子硬件组' },
    { id: '售前技术部', name: '售前技术部' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">员工信息</h1>
        <p className="text-gray-500 mt-1">查看和管理员工档案、组织架构信息</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'archive' | 'organization')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="archive">
              <Users className="w-4 h-4 mr-2" />
              员工档案
            </TabsTrigger>
            <TabsTrigger value="organization">
              <Building2 className="w-4 h-4 mr-2" />
              组织架构
            </TabsTrigger>
          </TabsList>

          {/* 员工档案 */}
          <TabsContent value="archive" className="mt-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input placeholder="搜索员工姓名、工号..." />
                    </div>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="选择部门" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button>
                      <FileText className="w-4 h-4 mr-2" />
                      导出档案
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Employee List */}
              <Card>
                <CardHeader>
                  <CardTitle>员工列表</CardTitle>
                  <CardDescription>
                    共 44 名员工
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* 示例数据 */}
                    {[
                      { id: 'e001', name: '周欢欢', department: '测试部', level: 'intermediate', role: 'employee' },
                      { id: 'e002', name: '卢成桢', department: '测试部', level: 'senior', role: 'employee' },
                      { id: 'e003', name: '杨明博', department: '测试部', level: 'junior', role: 'employee' },
                      { id: 'e004', name: '张海波', department: '测试部', level: 'intermediate', role: 'employee' },
                      { id: 'e005', name: '庄松滨', department: '测试部', level: 'junior', role: 'employee' },
                    ].map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-gray-500">{employee.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{employee.level}</Badge>
                          <Badge variant="outline">{employee.role}</Badge>
                          <Button variant="ghost" size="sm">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 组织架构 */}
          <TabsContent value="organization" className="mt-6">
            <div className="space-y-4">
              {/* Organization Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>组织架构图</CardTitle>
                  <CardDescription>
                    工程技术中心
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        name: '测试部',
                        manager: '于振华',
                        employees: 12
                      },
                      {
                        name: '机械部',
                        manager: '张丙波',
                        employees: 6
                      },
                      {
                        name: 'PLC',
                        manager: '王俊',
                        employees: 5
                      },
                      {
                        name: '技术开发部',
                        manager: '黎佩锋',
                        subDepartments: ['软件组', '电子硬件组'],
                        employees: 8
                      },
                      {
                        name: '售前技术部',
                        manager: '周定炫',
                        employees: 5
                      },
                    ].map((dept) => (
                      <Collapsible key={dept.name} defaultOpen={true}>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="flex-1 justify-start">
                              <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                              <span className="font-medium">{dept.name}</span>
                            </Button>
                          </CollapsibleTrigger>
                          <Badge variant="outline">
                            {dept.employees} 人
                          </Badge>
                        </div>
                        <CollapsibleContent>
                          <div className="p-4 ml-8 border-l-2 border-blue-200 bg-blue-50/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium">部门经理: {dept.manager}</span>
                            </div>
                            {dept.subDepartments && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 mb-2">子部门:</p>
                                {dept.subDepartments.map((sub) => (
                                  <div
                                    key={sub}
                                    className="flex items-center gap-2 text-sm text-gray-600"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                    <span>{sub}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Department Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>部门统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">部门数量</p>
                      <p className="text-2xl font-bold text-blue-600">5</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">经理数量</p>
                      <p className="text-2xl font-bold text-green-600">5</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">员工总数</p>
                      <p className="text-2xl font-bold text-purple-600">36</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
