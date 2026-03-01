import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, TrendingUp, BarChart3, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEPARTMENT_TYPES = [
  { value: 'all', label: '全部类型' },
  { value: 'sales', label: '销售类' },
  { value: 'engineering', label: '工程类' },
  { value: 'manufacturing', label: '生产类' },
  { value: 'support', label: '支持类' },
  { value: 'management', label: '管理类' }
];

export function AssessmentExport() {
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [departmentType, setDepartmentType] = useState('all');
  const [employeeId, setEmployeeId] = useState('');

  const handleExportMonthly = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (month) params.append('month', month);
      if (departmentType !== 'all') params.append('departmentType', departmentType);
      
      const response = await fetch(`${API_URL}/api/export/monthly-assessments?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `月度评分记录_${month || '全部'}_${new Date().getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('导出成功');
      } else {
        toast.error('导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDepartmentStats = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/api/export/department-stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `部门类型统计_${new Date().getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('导出成功');
      } else {
        toast.error('导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExportScoreTrend = async () => {
    if (!employeeId.trim()) {
      toast.error('请输入员工ID');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/api/export/score-trend/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `评分趋势_${employeeId}_${new Date().getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('导出成功');
      } else {
        toast.error('导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">差异化考核数据导出</h2>
        <p className="text-gray-500 mt-1">导出评分记录、统计报表和趋势分析</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 月度评分记录导出 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              月度评分记录
            </CardTitle>
            <CardDescription>
              导出指定月份和部门类型的所有评分记录
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>选择月份</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>部门类型</Label>
              <Select value={departmentType} onValueChange={setDepartmentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={handleExportMonthly}
              disabled={loading}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? '导出中...' : '导出 Excel'}
            </Button>
            
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p className="font-medium mb-1">包含内容：</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>评分明细（员工、总分、评分人等）</li>
                <li>指标评分详情（每项指标的等级和得分）</li>
                <li>统计汇总（总体统计信息）</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 部门类型统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              部门类型统计
            </CardTitle>
            <CardDescription>
              导出各部门类型的模板和指标统计
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="py-8 text-center text-gray-500">
              <BarChart3 className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">
                统计所有部门类型的考核模板配置情况
              </p>
            </div>
            
            <Button
              onClick={handleExportDepartmentStats}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? '导出中...' : '导出统计报表'}
            </Button>
            
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p className="font-medium mb-1">包含内容：</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>各部门类型的模板数量</li>
                <li>考核指标总数和平均值</li>
                <li>启用状态和更新时间</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 员工评分趋势 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              员工评分趋势分析
            </CardTitle>
            <CardDescription>
              导出指定员工的历史评分趋势和统计分析
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>员工ID</Label>
                <Input
                  placeholder="输入员工ID (如: emp001)"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={handleExportScoreTrend}
                  disabled={loading || !employeeId.trim()}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {loading ? '导出中...' : '导出趋势分析'}
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p className="font-medium mb-1">包含内容：</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>历史各月评分记录（月份、总分、评级）</li>
                <li>统计指标（平均分、最高/低分、评分次数）</li>
                <li>趋势变化分析</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 使用说明 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            导出说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>• <strong>月度评分记录:</strong> 适用于月度绩效汇总和存档</p>
          <p>• <strong>部门类型统计:</strong> 适用于HR审查模板配置情况</p>
          <p>• <strong>评分趋势分析:</strong> 适用于个人绩效面谈和发展规划</p>
          <p className="text-xs text-gray-500 mt-3">
            所有导出的Excel文件均包含格式化的表头和样式，可直接用于报告和分析。
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
