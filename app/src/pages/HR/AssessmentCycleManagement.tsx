import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  Play,
  Archive,
  Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { assessmentCycleApi } from '@/services/api';
import type { AssessmentCycle, Holiday, AssessmentCycleType } from '@/types';
import { toast } from 'sonner';

export function AssessmentCycleManagement() {
  const [activeTab, setActiveTab] = useState('cycles');
  const [cycles, setCycles] = useState<AssessmentCycle[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [_loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 考核周期表单
  const [showCycleDialog, setShowCycleDialog] = useState(false);
  const [editingCycle, setEditingCycle] = useState<AssessmentCycle | null>(null);
  const [cycleForm, setCycleForm] = useState<{
    name: string;
    type: AssessmentCycleType;
    year: number;
    startDate: string;
    endDate: string;
    selfAssessmentDeadline: string;
    managerReviewDeadline: string;
    hrReviewDeadline: string;
    appealDeadline: string;
    reminderDays: number;
    autoSubmit: boolean;
    excludeHolidays: boolean;
    description: string;
  }>({
    name: '',
    type: 'monthly',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    selfAssessmentDeadline: '',
    managerReviewDeadline: '',
    hrReviewDeadline: '',
    appealDeadline: '',
    reminderDays: 3,
    autoSubmit: false,
    excludeHolidays: true,
    description: ''
  });
  
  // 节假日表单
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    type: 'national' as const
  });
  
  useEffect(() => {
    fetchData();
  }, [selectedYear]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [cyclesRes, holidaysRes] = await Promise.all([
        assessmentCycleApi.getAllCycles(),
        assessmentCycleApi.getHolidays(selectedYear)
      ]);
      
      if (cyclesRes.success) setCycles(cyclesRes.data);
      if (holidaysRes.success) setHolidays(holidaysRes.data);
    } catch (error: any) {
      toast.error('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveCycle = async () => {
    try {
      if (editingCycle) {
        await assessmentCycleApi.updateCycle(editingCycle.id, cycleForm);
        toast.success('考核周期更新成功');
      } else {
        await assessmentCycleApi.createCycle(cycleForm);
        toast.success('考核周期创建成功');
      }
      setShowCycleDialog(false);
      setEditingCycle(null);
      resetCycleForm();
      fetchData();
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    }
  };
  
  const handleDeleteCycle = async (id: string) => {
    if (!confirm('确定要删除该考核周期吗？')) return;
    try {
      await assessmentCycleApi.deleteCycle(id);
      toast.success('考核周期删除成功');
      fetchData();
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };
  
  const handleActivateCycle = async (id: string) => {
    try {
      await assessmentCycleApi.activateCycle(id);
      toast.success('考核周期已激活');
      fetchData();
    } catch (error: any) {
      toast.error('激活失败: ' + error.message);
    }
  };
  
  const handleGenerateMonthly = async () => {
    try {
      await assessmentCycleApi.generateMonthlyCycles(selectedYear);
      toast.success('月度考核周期生成成功');
      fetchData();
    } catch (error: any) {
      toast.error('生成失败: ' + error.message);
    }
  };
  
  const handleSaveHoliday = async () => {
    try {
      await assessmentCycleApi.createHoliday(holidayForm);
      toast.success('节假日添加成功');
      setShowHolidayDialog(false);
      resetHolidayForm();
      fetchData();
    } catch (error: any) {
      toast.error('添加失败: ' + error.message);
    }
  };
  
  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('确定要删除该节假日吗？')) return;
    try {
      await assessmentCycleApi.deleteHoliday(id);
      toast.success('节假日删除成功');
      fetchData();
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };
  
  const resetCycleForm = () => {
    setCycleForm({
      name: '',
      type: 'monthly',
      year: selectedYear,
      startDate: '',
      endDate: '',
      selfAssessmentDeadline: '',
      managerReviewDeadline: '',
      hrReviewDeadline: '',
      appealDeadline: '',
      reminderDays: 3,
      autoSubmit: false,
      excludeHolidays: true,
      description: ''
    });
  };
  
  const resetHolidayForm = () => {
    setHolidayForm({ name: '', date: '', type: 'national' });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700"><Play className="w-3 h-3 mr-1" />进行中</Badge>;
      case 'draft':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />草稿</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle2 className="w-3 h-3 mr-1" />已完成</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-700"><Archive className="w-3 h-3 mr-1" />已归档</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly': return '月度考核';
      case 'quarterly': return '季度考核';
      case 'annual': return '年度考核';
      case 'probation': return '试用期考核';
      default: return type;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">考核周期管理</h2>
          <p className="text-gray-500 mt-1">配置考核周期、截止日期和节假日</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="cycles">考核周期</TabsTrigger>
          <TabsTrigger value="calendar">考核日历</TabsTrigger>
        </TabsList>
        
        {/* 考核周期 */}
        <TabsContent value="cycles" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleGenerateMonthly}>
                <Calendar className="w-4 h-4 mr-2" />
                批量生成月度周期
              </Button>
            </div>
            <Button onClick={() => { resetCycleForm(); setEditingCycle(null); setShowCycleDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              新建周期
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cycles.filter(c => c.year === selectedYear).map(cycle => (
              <Card key={cycle.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{cycle.name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{getTypeLabel(cycle.type)}</Badge>
                        {getStatusBadge(cycle.status)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {cycle.status === 'draft' && (
                        <Button size="sm" variant="ghost" onClick={() => handleActivateCycle(cycle.id)}>
                          <Play className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setEditingCycle(cycle);
                          setCycleForm({
                            name: cycle.name,
                            type: cycle.type,
                            year: cycle.year,
                            startDate: cycle.startDate,
                            endDate: cycle.endDate,
                            selfAssessmentDeadline: cycle.selfAssessmentDeadline || '',
                            managerReviewDeadline: cycle.managerReviewDeadline || '',
                            hrReviewDeadline: cycle.hrReviewDeadline || '',
                            appealDeadline: cycle.appealDeadline || '',
                            reminderDays: cycle.reminderDays,
                            autoSubmit: cycle.autoSubmit,
                            excludeHolidays: cycle.excludeHolidays,
                            description: cycle.description || ''
                          });
                          setShowCycleDialog(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteCycle(cycle.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">考核期间:</span>
                      <span>{cycle.startDate} 至 {cycle.endDate}</span>
                    </div>
                    {cycle.selfAssessmentDeadline && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">自评截止:</span>
                        <span>{cycle.selfAssessmentDeadline}</span>
                      </div>
                    )}
                    {cycle.managerReviewDeadline && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">经理评分截止:</span>
                        <span>{cycle.managerReviewDeadline}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">提前提醒:</span>
                      <span>{cycle.reminderDays}天</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {cycles.filter(c => c.year === selectedYear).length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无{selectedYear}年的考核周期</p>
              <Button variant="outline" className="mt-3" onClick={handleGenerateMonthly}>
                批量生成月度周期
              </Button>
            </div>
          )}
        </TabsContent>
        
        {/* 考核日历 */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">节假日管理</h3>
            <Button onClick={() => { resetHolidayForm(); setShowHolidayDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              添加节假日
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {holidays.map(holiday => (
              <Card key={holiday.id} className="relative group">
                <CardContent className="p-3 text-center">
                  <Sun className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                  <div className="font-medium text-sm">{holiday.name}</div>
                  <div className="text-xs text-gray-500">{holiday.date}</div>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {holiday.type === 'national' ? '法定假日' : '公司假日'}
                  </Badge>
                  <button
                    onClick={() => handleDeleteHoliday(holiday.id)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {holidays.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
              <Sun className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无节假日数据</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* 考核周期表单对话框 */}
      <Dialog open={showCycleDialog} onOpenChange={setShowCycleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCycle ? '编辑考核周期' : '新建考核周期'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>周期名称 *</Label>
                <Input
                  value={cycleForm.name}
                  onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                  placeholder="例如：2025年1月考核"
                />
              </div>
              <div>
                <Label>周期类型 *</Label>
                <Select 
                  value={cycleForm.type} 
                  onValueChange={(v: any) => setCycleForm({ ...cycleForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">月度考核</SelectItem>
                    <SelectItem value="quarterly">季度考核</SelectItem>
                    <SelectItem value="annual">年度考核</SelectItem>
                    <SelectItem value="probation">试用期考核</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>开始日期 *</Label>
                <Input
                  type="date"
                  value={cycleForm.startDate}
                  onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>结束日期 *</Label>
                <Input
                  type="date"
                  value={cycleForm.endDate}
                  onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>自评截止日期</Label>
                <Input
                  type="date"
                  value={cycleForm.selfAssessmentDeadline}
                  onChange={(e) => setCycleForm({ ...cycleForm, selfAssessmentDeadline: e.target.value })}
                />
              </div>
              <div>
                <Label>经理评分截止日期</Label>
                <Input
                  type="date"
                  value={cycleForm.managerReviewDeadline}
                  onChange={(e) => setCycleForm({ ...cycleForm, managerReviewDeadline: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>HR审核截止日期</Label>
                <Input
                  type="date"
                  value={cycleForm.hrReviewDeadline}
                  onChange={(e) => setCycleForm({ ...cycleForm, hrReviewDeadline: e.target.value })}
                />
              </div>
              <div>
                <Label>申诉截止日期</Label>
                <Input
                  type="date"
                  value={cycleForm.appealDeadline}
                  onChange={(e) => setCycleForm({ ...cycleForm, appealDeadline: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label>提前提醒天数</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={cycleForm.reminderDays}
                onChange={(e) => setCycleForm({ ...cycleForm, reminderDays: parseInt(e.target.value) || 0 })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={cycleForm.autoSubmit}
                  onCheckedChange={(v) => setCycleForm({ ...cycleForm, autoSubmit: v })}
                />
                <Label>超时自动提交</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={cycleForm.excludeHolidays}
                  onCheckedChange={(v) => setCycleForm({ ...cycleForm, excludeHolidays: v })}
                />
                <Label>自动排除节假日</Label>
              </div>
            </div>
            
            <div>
              <Label>备注</Label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={2}
                value={cycleForm.description}
                onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })}
                placeholder="请输入备注信息"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveCycle} className="flex-1">
                保存
              </Button>
              <Button variant="outline" onClick={() => setShowCycleDialog(false)}>
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 节假日表单对话框 */}
      <Dialog open={showHolidayDialog} onOpenChange={setShowHolidayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加节假日</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>节假日名称 *</Label>
              <Input
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                placeholder="例如：国庆节"
              />
            </div>
            <div>
              <Label>日期 *</Label>
              <Input
                type="date"
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label>类型</Label>
              <Select 
                value={holidayForm.type} 
                onValueChange={(v: any) => setHolidayForm({ ...holidayForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">法定假日</SelectItem>
                  <SelectItem value="company">公司假日</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveHoliday} className="flex-1">
                保存
              </Button>
              <Button variant="outline" onClick={() => setShowHolidayDialog(false)}>
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AssessmentCycleManagement;
