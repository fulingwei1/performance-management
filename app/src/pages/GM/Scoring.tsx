import { useState } from 'react';
import { 
  Calendar, 
  Target, 
  Briefcase, 
  Users, 
  TrendingUp, 
  Send, 
  ChevronRight,
  CheckCircle2,
  Clock,
  Award,
  FileText
} from 'lucide-react';
import { useHRStore } from '@/stores/hrStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScoreSelector } from '@/components/score/ScoreSelector';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { calculateTotalScore } from '@/lib/calculateScore';
import { cn } from '@/lib/utils';

export function GMScoring() {
  const { 
    gmScores, 
    getAllManagers,
    submitGMScore
  } = useHRStore();
  
  const [selectedQuarter, setSelectedQuarter] = useState('2025-Q1');
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [scores, setScores] = useState({
    monthlyTaskCompletion: 1.0,
    temporaryWorkCompletion: 1.0,
    workload: 1.0,
    talentDevelopment: 1.0
  });
  const [comment, setComment] = useState('');
  
  const managers = getAllManagers();
  
  const quarterScores = gmScores.filter(s => s.quarter === selectedQuarter);
  const pendingScores = quarterScores.filter(s => s.status === 'pending');
  const completedScores = quarterScores.filter(s => s.status === 'completed');
  
  const handleOpenDrawer = (managerId: string) => {
    setSelectedManager(managerId);
    const existingScore = quarterScores.find(s => s.managerId === managerId);
    
    if (existingScore && existingScore.status === 'completed') {
      setScores({
        monthlyTaskCompletion: existingScore.monthlyTaskCompletion,
        temporaryWorkCompletion: existingScore.temporaryWorkCompletion,
        workload: existingScore.workload,
        talentDevelopment: existingScore.talentDevelopment
      });
      setComment(existingScore.gmComment);
    } else {
      setScores({
        monthlyTaskCompletion: 1.0,
        temporaryWorkCompletion: 1.0,
        workload: 1.0,
        talentDevelopment: 1.0
      });
      setComment('');
    }
    
    setIsDrawerOpen(true);
  };
  
  const handleSubmit = () => {
    if (!selectedManager) return;
    
    const manager = managers.find(m => m.id === selectedManager);
    if (!manager) return;
    
    submitGMScore({
      managerId: selectedManager,
      managerName: manager.name,
      quarter: selectedQuarter,
      ...scores,
      gmComment: comment,
      status: 'completed'
    });
    
    setIsDrawerOpen(false);
    setSelectedManager(null);
  };
  
  const totalScore = calculateTotalScore(
    scores.monthlyTaskCompletion,
    scores.temporaryWorkCompletion,
    scores.workload,
    scores.talentDevelopment
  );
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">总经理评分</CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>选择季度</Label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger>
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-Q1">2025年第一季度</SelectItem>
                  <SelectItem value="2025-Q2">2025年第二季度</SelectItem>
                  <SelectItem value="2025-Q3">2025年第三季度</SelectItem>
                  <SelectItem value="2025-Q4">2025年第四季度</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">评分进度</p>
              <p className="text-2xl font-bold">
                {completedScores.length}/{quarterScores.length}
              </p>
            </div>
          </div>
          <Progress 
            value={quarterScores.length > 0 ? (completedScores.length / quarterScores.length) * 100 : 0} 
            className="mt-4 h-2"
          />
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreDimensionCard
          title="月度任务完成"
          weight={40}
          icon={Target}
          description="年度经营计划拆分到每月的任务完成情况"
          color="blue"
        />
        <ScoreDimensionCard
          title="临时工作完成"
          weight={25}
          icon={Briefcase}
          description="临时性、突发性工作的完成情况"
          color="purple"
        />
        <ScoreDimensionCard
          title="工作量大小"
          weight={20}
          icon={TrendingUp}
          description="部门整体工作量及工作饱和度"
          color="green"
        />
        <ScoreDimensionCard
          title="人才培养"
          weight={15}
          icon={Users}
          description="部门人才培养、培训、晋升等指标"
          color="orange"
        />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            待评分部门经理 ({pendingScores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingScores.map((score) => (
              <div 
                key={score.id}
                className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer"
                onClick={() => handleOpenDrawer(score.managerId)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-semibold">
                    {score.managerName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{score.managerName}</p>
                    <p className="text-sm text-gray-500">{selectedQuarter}</p>
                  </div>
                </div>
                <Button size="sm">
                  去评分
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
            
            {pendingScores.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p>本季度所有经理已评分完毕</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {completedScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              评分排名
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedScores
                .sort((a, b) => a.rank - b.rank)
                .map((score, index) => (
                  <div 
                    key={score.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow",
                      index === 0 && "bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200",
                      index === 1 && "bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200",
                      index === 2 && "bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200",
                      index > 2 && "bg-gray-50"
                    )}
                    onClick={() => handleOpenDrawer(score.managerId)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        index === 0 && "bg-yellow-100 text-yellow-700",
                        index === 1 && "bg-gray-100 text-gray-700",
                        index === 2 && "bg-orange-100 text-orange-700",
                        index > 2 && "bg-blue-100 text-blue-700"
                      )}>
                        {score.rank}
                      </div>
                      <div>
                        <p className="font-medium">{score.managerName}</p>
                        <p className="text-sm text-gray-500">{selectedQuarter}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <ScoreDisplay score={score.totalScore} showLabel size="sm" />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DrawerHeader className="border-b">
            <DrawerTitle>
              {selectedManager && managers.find(m => m.id === selectedManager)?.name} - 总经理评分
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">综合得分</p>
                  <ScoreDisplay score={totalScore} showProgress size="lg" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">计算公式</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {scores.monthlyTaskCompletion.toFixed(1)}×40% + 
                    {scores.temporaryWorkCompletion.toFixed(1)}×25% + 
                    {scores.workload.toFixed(1)}×20% + 
                    {scores.talentDevelopment.toFixed(1)}×15%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <div>
                      <label className="font-medium text-gray-900">月度任务完成情况</label>
                      <p className="text-sm text-gray-500">年度经营计划拆分到每月的任务</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">权重 40%</Badge>
                </div>
                <ScoreSelector 
                  value={scores.monthlyTaskCompletion}
                  onChange={(v) => setScores(prev => ({ ...prev, monthlyTaskCompletion: v }))}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                    <div>
                      <label className="font-medium text-gray-900">临时工作完成情况</label>
                      <p className="text-sm text-gray-500">临时性、突发性工作</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">权重 25%</Badge>
                </div>
                <ScoreSelector 
                  value={scores.temporaryWorkCompletion}
                  onChange={(v) => setScores(prev => ({ ...prev, temporaryWorkCompletion: v }))}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <div>
                      <label className="font-medium text-gray-900">工作量大小</label>
                      <p className="text-sm text-gray-500">部门整体工作量及饱和度</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">权重 20%</Badge>
                </div>
                <ScoreSelector 
                  value={scores.workload}
                  onChange={(v) => setScores(prev => ({ ...prev, workload: v }))}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-600" />
                    <div>
                      <label className="font-medium text-gray-900">部门人才培养</label>
                      <p className="text-sm text-gray-500">培训、晋升、人才发展</p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700">权重 15%</Badge>
                </div>
                <ScoreSelector 
                  value={scores.talentDevelopment}
                  onChange={(v) => setScores(prev => ({ ...prev, talentDevelopment: v }))}
                />
              </div>
            </div>
            
            <div>
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                综合评价
              </Label>
              <Textarea
                placeholder="请输入对该部门经理的综合评价..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[120px] mt-2"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={!comment}>
                <Send className="w-4 h-4 mr-2" />
                提交评分
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

interface ScoreDimensionCardProps {
  title: string;
  weight: number;
  icon: React.ElementType;
  description: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
}

function ScoreDimensionCard({ title, weight, icon: Icon, description, color }: ScoreDimensionCardProps) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };
  
  return (
    <Card className={cn("border", colorMap[color])}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color].split(' ')[0])}>
            <Icon className={cn("w-5 h-5", colorMap[color].split(' ')[1])} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{title}</p>
              <Badge variant="outline" className="text-xs">{weight}%</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
