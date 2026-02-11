import { useState } from 'react';
import { Calendar, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { exportApi } from '@/services/api';
import { toast } from 'sonner';

interface ExportOptions {
  format: 'excel' | 'json';
  includeAnalysis: boolean;
}

export function GMDataExport() {
  const [exportType, setExportType] = useState<'monthly' | 'annual' | 'employees'>('monthly');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [options, setOptions] = useState<ExportOptions>({
    format: 'excel',
    includeAnalysis: true
  });
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    
    try {
      switch (exportType) {
        case 'monthly':
          if (!month) {
            toast.error('请选择月份');
            return;
          }
          exportApi.exportMonthlyPerformance(month, options);
          break;
          
        case 'annual':
          if (!year) {
            toast.error('请选择年份');
            return;
          }
          exportApi.exportAnnualPerformance(year, options);
          break;
          
        case 'employees':
          exportApi.exportEmployees({
            format: options.format
          });
          break;
          
        default:
          toast.error('未知的导出类型');
          return;
      }
      
      toast.success('导出请求已发送，文件下载即将开始');
    } catch (error: any) {
      console.error('导出失败:', error);
      toast.error(`导出失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentYear, i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
    };
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">总经理数据导出</h1>
        <TrendingUp className="h-8 w-8 text-blue-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            exportType === 'monthly' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={() => setExportType('monthly')}
        >
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Calendar className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">月度绩效数据</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              导出指定月份的所有员工绩效数据，包括详细评分和分析报告
            </CardDescription>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            exportType === 'annual' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={() => setExportType('annual')}
        >
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <TrendingUp className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">年度绩效汇总</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              导出指定年份的员工年度绩效汇总数据，包含统计分析和趋势
            </CardDescription>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            exportType === 'employees' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={() => setExportType('employees')}
        >
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Users className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">员工信息</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              导出全公司员工基本信息数据
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            导出配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {exportType === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="month">选择月份</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择月份" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {exportType === 'annual' && (
            <div className="space-y-2">
              <Label htmlFor="year">选择年份</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择年份" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="format">导出格式</Label>
              <Select value={options.format} onValueChange={(value: 'excel' | 'json') => 
                setOptions((prev: ExportOptions) => ({ ...prev, format: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel文件 (.xlsx)</SelectItem>
                  <SelectItem value="json">JSON数据</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportType === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="includeAnalysis">包含分析报告</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeAnalysis"
                    checked={options.includeAnalysis}
                    onCheckedChange={(checked: boolean) => 
                      setOptions((prev: ExportOptions) => ({ ...prev, includeAnalysis: checked }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    同时导出部门分析数据
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleExport} 
              disabled={loading}
              className="min-w-32"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  导出中...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  开始导出
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">功能说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
            <p className="text-sm text-blue-700">
              <strong>月度绩效数据：</strong>包含指定月份所有员工的详细绩效记录，可选择是否包含部门分析报告
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
            <p className="text-sm text-blue-700">
              <strong>年度绩效汇总：</strong>员工年度绩效汇总统计，包含平均分、最高分、最低分和等级分布
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
            <p className="text-sm text-blue-700">
              <strong>员工信息：</strong>导出全公司员工基本信息
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
            <p className="text-sm text-blue-700">
              <strong>导出格式：</strong>支持Excel和JSON两种格式，Excel包含多工作表数据
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-800">总经理权限说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-600 mt-2 flex-shrink-0"></div>
            <p className="text-sm text-amber-700">
              <strong>完整访问权限：</strong>总经理可以访问所有员工的绩效数据和分析报告
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-600 mt-2 flex-shrink-0"></div>
            <p className="text-sm text-amber-700">
              <strong>战略决策支持：</strong>导出的数据可用于公司整体绩效分析和战略制定
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-600 mt-2 flex-shrink-0"></div>
            <p className="text-sm text-amber-700">
              <strong>数据完整性：</strong>包含跨部门、跨层级的完整绩效数据
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
