import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, FileText, CheckCircle, CheckCircle2, AlertCircle, FileSpreadsheet, BarChart3, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHRStore } from '@/stores/hrStore';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { scoreToLevel } from '@/lib/calculateScore';
import { cn } from '@/lib/utils';
import { resolveGroupType } from '@/lib/config';
import { format } from 'date-fns';

export function DataManagement() {
  const { allPerformanceRecords, getAllManagers, exportReport } = useHRStore();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [exporting, setExporting] = useState(false);
 
  useEffect(() => {
    getAllManagers();
  }, [getAllManagers]);
 
  const departments = [...new Set(allPerformanceRecords.map(r => r.subDepartment))];
 
  const filteredRecords = allPerformanceRecords.filter(r => {
    const matchesMonth = r.month === selectedMonth;
    const matchesDept = selectedDepartment === 'all' || r.subDepartment === selectedDepartment;
    return matchesMonth && matchesDept;
  });
 
  const reportData = exportReport(selectedMonth);

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

  const handleFileUpload = () => {
    setUploadStatus('uploading');
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const exportToCSV = (data: any[], filename: string) => {
    setExporting(true);
    setTimeout(() => {
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => row[h]).join(','))
      ].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
      setExporting(false);
    }, 1000);
  };

  const exportToJSON = (data: any[], filename: string) => {
    setExporting(true);
    setTimeout(() => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.json`;
      link.click();
      setExporting(false);
    }, 1000);
  };

  const stats = {
    totalRecords: filteredRecords.length,
    completedRecords: filteredRecords.filter(r => r.status === 'completed').length,
    averageScore: filteredRecords.length > 0 
      ? filteredRecords.reduce((sum, r) => sum + r.totalScore, 0) / filteredRecords.length 
      : 0,
    excellentCount: filteredRecords.filter(r => scoreToLevel(r.totalScore) === 'L5' || scoreToLevel(r.totalScore) === 'L4').length
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">数据管理</h1>
        <p className="text-gray-500 mt-1">批量导入和导出绩效数据</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              数据导入
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="w-4 h-4 mr-2" />
              数据导出
            </TabsTrigger>
          </TabsList>

          {/* 数据导入 */}
          <TabsContent value="import" className="mt-6">
            <div className="space-y-4">
              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle>批量导入员工数据</CardTitle>
                  <CardDescription>
                    支持Excel和CSV格式文件，最大支持10MB
                  </CardDescription>
                </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Upload Section */}
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={handleFileUpload}
                    >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">点击或拖拽文件到此处</p>
                        <p className="text-sm text-gray-500 mt-1">支持 .xlsx, .csv 格式</p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {uploadStatus !== 'idle' && (
                    <div className="space-y-2">
                      {uploadStatus === 'uploading' && (
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>上传中...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </div>
                      )}

                      {uploadStatus === 'success' && (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <AlertDescription className="text-green-700">
                            文件上传成功！已成功导入 15 条员工数据
                          </AlertDescription>
                        </Alert>
                      )}

                      {uploadStatus === 'error' && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <AlertDescription className="text-red-700">
                            文件上传失败，请检查文件格式后重试
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => { setUploadStatus('idle'); setUploadProgress(0); }}
                        className="w-full"
                      >
                        重新上传
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>导入说明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• 请下载模板文件，按照模板格式填写数据</p>
                    <p>• 支持的字段：工号、姓名、部门、子部门、职级、角色</p>
                    <p>• 必填字段：工号、姓名、部门、角色</p>
                    <p>• 重复的工号将被自动覆盖</p>
                    <p>• 每次最多导入500条数据</p>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    下载导入模板
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 数据导出 */}
          <TabsContent value="export" className="mt-6">
            <div className="space-y-6">
              {/* 筛选条件 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>月份</Label>
                      <Input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>部门</Label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger>
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部部门</SelectItem>
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => exportToCSV(filteredRecords, `绩效数据_${selectedMonth}`)}
                        disabled={exporting || filteredRecords.length === 0}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        导出CSV
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => exportToJSON(filteredRecords, `绩效数据_${selectedMonth}`)}
                        disabled={exporting || filteredRecords.length === 0}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        导出JSON
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 统计概览 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">总记录数</p>
                        <p className="text-2xl font-bold">{stats.totalRecords}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">已完成</p>
                        <p className="text-2xl font-bold">{stats.completedRecords}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">平均分</p>
                        <p className="text-2xl font-bold">{stats.averageScore.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">优秀人数</p>
                        <p className="text-2xl font-bold">{stats.excellentCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 数据预览 */}
              <Tabs defaultValue="performance">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="performance">绩效数据</TabsTrigger>
                  <TabsTrigger value="report">部门报表</TabsTrigger>
                </TabsList>
                
                <TabsContent value="performance">
                  <Card>
                    <CardHeader>
                      <CardTitle>绩效数据预览</CardTitle>
                      <CardDescription>共 {filteredRecords.length} 条记录</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>姓名</TableHead>
                              <TableHead>部门</TableHead>
                              <TableHead>级别</TableHead>
                              <TableHead>分组</TableHead>
                              <TableHead>月份</TableHead>
                              <TableHead className="text-right">综合得分</TableHead>
                              <TableHead>部门排名</TableHead>
                              <TableHead>组内排名</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRecords.slice(0, 20).map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium">{record.employeeName}</TableCell>
                                <TableCell>{record.subDepartment}</TableCell>
                                <TableCell>{record.employeeLevel}</TableCell>
                                <TableCell>
                                  {resolveGroupType(record.groupType, record.employeeLevel) ? (
                                    <Badge className={cn(
                                      resolveGroupType(record.groupType, record.employeeLevel) === 'high' 
                                        ? "bg-purple-100 text-purple-700" 
                                        : "bg-green-100 text-green-700"
                                    )}>
                                      {resolveGroupType(record.groupType, record.employeeLevel) === 'high' ? '高分组' : '低分组'}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-500">未分组</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{record.month}</TableCell>
                                <TableCell className="text-right">
                                  <ScoreDisplay score={record.totalScore} showLabel={false} size="sm" />
                                </TableCell>
                                <TableCell>{record.departmentRank}</TableCell>
                                <TableCell>{record.groupRank}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {filteredRecords.length > 20 && (
                        <p className="text-center text-sm text-gray-500 mt-4">
                          还有 {filteredRecords.length - 20} 条记录，请导出查看完整数据
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="report">
                  <Card>
                    <CardHeader>
                      <CardTitle>部门绩效报表</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>部门</TableHead>
                              <TableHead>人数</TableHead>
                              <TableHead className="text-right">平均分</TableHead>
                              <TableHead>优秀</TableHead>
                              <TableHead>良好</TableHead>
                              <TableHead>合格</TableHead>
                              <TableHead>待改进</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.map((dept) => (
                              <TableRow key={dept.department}>
                                <TableCell className="font-medium">{dept.department}</TableCell>
                                <TableCell>{dept.totalEmployees}</TableCell>
                                <TableCell className="text-right">
                                  <span className="font-bold">{dept.averageScore}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-green-100 text-green-700">{dept.excellentCount}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-blue-100 text-blue-700">{dept.goodCount}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-yellow-100 text-yellow-700">{dept.normalCount}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-red-100 text-red-700">{dept.needImprovementCount}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                       </div>
                     </CardContent>
                   </Card>
                 </TabsContent>
               </Tabs>
             </div>
           </TabsContent>
         </Tabs>
       </motion.div>
     </motion.div>
   );
}
