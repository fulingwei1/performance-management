import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, FileSpreadsheet, Users, Calendar, Database, ChevronRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { dataImportApi, exportApi } from '@/services/api';

interface ExportOptions {
  format: 'excel' | 'json';
  includeAnalysis: boolean;
}

export function DataManagement() {
  // Import state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Export state
  const [exportType, setExportType] = useState<'monthly' | 'annual' | 'employees'>('monthly');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [department, setDepartment] = useState<string>('');
  const [options, setOptions] = useState<ExportOptions>({
    format: 'excel',
    includeAnalysis: true
  });
  const [exporting, setExporting] = useState(false);

  // Import handlers
  const handleDownloadTemplate = async () => {
    try {
      await dataImportApi.getEmployeeTemplate();
      toast.success('模板下载成功');
    } catch {
      toast.error('模板下载失败');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await dataImportApi.importEmployees(formData);
      toast.success(response.message);
      setImportResult({ success: true, ...response.data });
    } catch (error: any) {
      const errData = error?.response?.data;
      toast.error(errData?.message || '导入失败');
      setImportResult({ success: false, ...errData });
    } finally {
      setUploading(false);
    }
  };

  // Export handlers
  const handleExport = async () => {
    setExporting(true);
    
    try {
      switch (exportType) {
        case 'monthly':
          if (!month) {
            toast.error('请选择月份');
            return;
          }
          exportApi.exportMonthlyPerformance(month, options);
          toast.success('月度绩效导出已启动');
          break;
          
        case 'annual':
          if (!year) {
            toast.error('请选择年份');
            return;
          }
          exportApi.exportAnnualPerformance(year, options);
          toast.success('年度绩效导出已启动');
          break;
          
        case 'employees':
          exportApi.exportEmployees({
            department: department || undefined,
            format: options.format
          });
          toast.success('员工数据导出已启动');
          break;
          
        default:
          toast.error('未知的导出类型');
          return;
      }
    } catch (error) {
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">数据管理</h2>
          <p className="text-sm text-gray-500">员工数据导入与绩效数据导出</p>
        </div>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            数据导入
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            数据导出
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                员工数据导入
              </CardTitle>
              <CardDescription>
                通过 Excel 文件批量导入员工信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  下载模板
                </Button>
                <span className="text-sm text-gray-500">请先下载模板，按格式填写后上传</span>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm font-medium">
                      {file ? file.name : '点击选择文件或拖拽到此处'}
                    </span>
                    <span className="text-xs text-gray-400">支持 .xlsx, .xls, .csv</span>
                  </div>
                </Label>
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={!file || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    开始导入
                  </>
                )}
              </Button>

              {importResult && (
                <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {importResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={importResult.success ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
                      {importResult.success ? '导入成功' : '导入失败'}
                    </span>
                  </div>
                  {importResult.importedCount !== undefined && (
                    <p className="text-sm text-gray-600">成功导入 {importResult.importedCount} 条记录</p>
                  )}
                  {importResult.errors?.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      <p className="font-medium">错误详情：</p>
                      <ul className="list-disc list-inside mt-1">
                        {importResult.errors.slice(0, 5).map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...还有 {importResult.errors.length - 5} 条错误</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                绩效数据导出
              </CardTitle>
              <CardDescription>
                导出月度绩效、年度绩效或员工数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Export Type */}
              <div className="grid grid-cols-3 gap-4">
                <Card 
                  className={`cursor-pointer transition-colors ${exportType === 'monthly' ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setExportType('monthly')}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-medium">月度绩效</span>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-colors ${exportType === 'annual' ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setExportType('annual')}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium">年度绩效</span>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-colors ${exportType === 'employees' ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setExportType('employees')}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Users className="w-6 h-6 text-purple-600" />
                    <span className="text-sm font-medium">员工数据</span>
                  </CardContent>
                </Card>
              </div>

              {/* Options */}
              <div className="space-y-4">
                {exportType === 'monthly' && (
                  <div>
                    <Label>选择月份</Label>
                    <Input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    />
                  </div>
                )}

                {exportType === 'annual' && (
                  <div>
                    <Label>选择年份</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => {
                          const y = new Date().getFullYear() - 2 + i;
                          return (
                            <SelectItem key={y} value={String(y)}>
                              {y}年
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {exportType === 'employees' && (
                  <div>
                    <Label>部门筛选（可选）</Label>
                    <Input
                      placeholder="输入部门名称，留空导出全部"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>导出格式</Label>
                    <Select 
                      value={options.format} 
                      onValueChange={(v) => setOptions({ ...options, format: v as 'excel' | 'json' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="json">JSON (.json)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-2 border rounded-lg">
                    <Label className="cursor-pointer">包含数据分析</Label>
                    <Switch
                      checked={options.includeAnalysis}
                      onCheckedChange={(v) => setOptions({ ...options, includeAnalysis: v })}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleExport} 
                disabled={exporting}
                className="w-full"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    开始导出
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
