import { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock
} from 'lucide-react';
import { useHRStore } from '@/stores/hrStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function TaskManagement() {
  const { user } = useAuthStore();
  const { 
    monthlyTasks, 
    temporaryWorks, 
    uploadMonthlyTasks, 
    addTemporaryWork,
    getAllManagers
  } = useHRStore();
  
  const managers = getAllManagers();
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAddTempDialog, setShowAddTempDialog] = useState(false);
  
  // 上传任务表单
  const [tasks, setTasks] = useState<{ name: string; target: string; weight: number }[]>([
    { name: '', target: '', weight: 0 }
  ]);
  
  // 临时工作表单
  const [tempWork, setTempWork] = useState({
    managerId: '',
    month: currentMonth,
    name: '',
    description: '',
    completed: false,
    completionRate: 0
  });
  
  const handleAddTaskRow = () => {
    setTasks([...tasks, { name: '', target: '', weight: 0 }]);
  };
  
  const handleRemoveTaskRow = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };
  
  const handleTaskChange = (index: number, field: keyof typeof tasks[0], value: string | number) => {
    setTasks(tasks.map((task, i) => i === index ? { ...task, [field]: value } : task));
  };
  
  const handleUpload = () => {
    if (!selectedManager) return;
    
    const validTasks = tasks
      .filter(t => t.name && t.target)
      .map(t => ({
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: t.name,
        target: t.target,
        weight: t.weight,
        completed: false,
        completionRate: 0
      }));
    
    uploadMonthlyTasks(selectedManager, currentMonth, validTasks);
    setShowUploadDialog(false);
    setTasks([{ name: '', target: '', weight: 0 }]);
  };
  
  const handleAddTempWork = () => {
    addTemporaryWork({
      ...tempWork,
      addedBy: user?.id || 'hr001'
    });
    setShowAddTempDialog(false);
    setTempWork({
      managerId: '',
      month: currentMonth,
      name: '',
      description: '',
      completed: false,
      completionRate: 0
    });
  };
  
  // 获取当前月份的所有任务
  const currentMonthTasks = monthlyTasks.filter(t => t.month === currentMonth);
  const currentMonthTempWorks = temporaryWorks.filter(w => w.month === currentMonth);
  
  return (
    <div className="space-y-6">
      {/* 月份选择 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>选择月份</Label>
              <Input 
                type="month" 
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-6">
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                上传月度任务
              </Button>
              <Button variant="outline" onClick={() => setShowAddTempDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                添加临时工作
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 任务列表 */}
      <Tabs defaultValue="monthly">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="monthly">月度任务 ({currentMonthTasks.length})</TabsTrigger>
          <TabsTrigger value="temporary">临时工作 ({currentMonthTempWorks.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monthly" className="space-y-4">
          {currentMonthTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2" />
              <p>本月暂无任务</p>
            </div>
          ) : (
            currentMonthTasks.map((taskGroup) => {
              const manager = managers.find(m => m.id === taskGroup.managerId);
              const completedCount = taskGroup.tasks.filter(t => t.completed).length;
              const progress = taskGroup.tasks.length > 0 
                ? (completedCount / taskGroup.tasks.length) * 100 
                : 0;
              
              return (
                <Card key={taskGroup.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{manager?.name || '未知经理'}</CardTitle>
                      <Badge>
                        {completedCount}/{taskGroup.tasks.length} 完成
                      </Badge>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {taskGroup.tasks.map((task) => (
                        <div 
                          key={task.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg",
                            task.completed ? "bg-green-50" : "bg-gray-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}
                            <div>
                              <p className={cn("font-medium", task.completed && "line-through text-gray-400")}>
                                {task.name}
                              </p>
                              <p className="text-sm text-gray-500">目标: {task.target}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">权重 {task.weight}%</Badge>
                            {task.completed && (
                              <Badge className="bg-green-100 text-green-700">
                                完成度 {task.completionRate}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
        
        <TabsContent value="temporary" className="space-y-4">
          {currentMonthTempWorks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2" />
              <p>本月暂无临时工作</p>
            </div>
          ) : (
            currentMonthTempWorks.map((work) => {
              const manager = managers.find(m => m.id === work.managerId);
              
              return (
                <Card key={work.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {work.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                        )}
                        <div>
                          <p className={cn("font-medium", work.completed && "line-through text-gray-400")}>
                            {work.name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{work.description}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            负责人: {manager?.name || '未知'}
                          </p>
                        </div>
                      </div>
                      <div>
                        {work.completed ? (
                          <Badge className="bg-green-100 text-green-700">
                            完成度 {work.completionRate}%
                          </Badge>
                        ) : (
                          <Badge variant="outline">进行中</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
      
      {/* 上传任务弹窗 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>上传月度任务</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <Label>选择经理</Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择经理" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map(manager => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name} - {manager.subDepartment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>任务列表</Label>
              <div className="space-y-2 mt-2">
                {tasks.map((task, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="任务名称"
                      value={task.name}
                      onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="目标"
                      value={task.target}
                      onChange={(e) => handleTaskChange(index, 'target', e.target.value)}
                      className="w-32"
                    />
                    <Input
                      type="number"
                      placeholder="权重"
                      value={task.weight}
                      onChange={(e) => handleTaskChange(index, 'weight', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveTaskRow(index)}
                      disabled={tasks.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={handleAddTaskRow} className="mt-2">
                <Plus className="w-4 h-4 mr-1" />
                添加任务
              </Button>
            </div>
            
            <Button onClick={handleUpload} disabled={!selectedManager || tasks.every(t => !t.name)} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              上传任务
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 添加临时工作弹窗 */}
      <Dialog open={showAddTempDialog} onOpenChange={setShowAddTempDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加临时工作</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <Label>负责人</Label>
              <Select value={tempWork.managerId} onValueChange={(v) => setTempWork({ ...tempWork, managerId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择经理" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map(manager => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name} - {manager.subDepartment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>工作名称</Label>
              <Input
                value={tempWork.name}
                onChange={(e) => setTempWork({ ...tempWork, name: e.target.value })}
                placeholder="请输入工作名称"
              />
            </div>
            
            <div>
              <Label>工作描述</Label>
              <Textarea
                value={tempWork.description}
                onChange={(e) => setTempWork({ ...tempWork, description: e.target.value })}
                placeholder="请输入工作描述"
              />
            </div>
            
            <Button onClick={handleAddTempWork} disabled={!tempWork.managerId || !tempWork.name} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
