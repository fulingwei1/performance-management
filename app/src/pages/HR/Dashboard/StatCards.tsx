import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Stats {
  companyTotalEmployees: number;
  participatingEmployees: number;
  completedTasks: number;
  pendingTasks: number;
  completedScores: number;
  pendingScores: number;
}

interface StatCardsProps {
  stats: Stats;
  onFilterChange: (filter: 'all' | 'pending' | 'completed') => void;
  activeFilter: 'all' | 'pending' | 'completed';
}

export function StatCards({ stats, onFilterChange, activeFilter }: StatCardsProps) {
  const cardClass = (filter?: 'all' | 'pending' | 'completed') => [
    'transition-shadow',
    filter ? 'cursor-pointer hover:shadow-md' : '',
    filter && activeFilter === filter ? 'ring-2 ring-blue-500' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card className="bg-slate-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">公司总人数</p>
              <p className="text-2xl font-bold">{stats.companyTotalEmployees}</p>
              <p className="mt-1 text-xs text-gray-400">在职+试用+实习</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className={cardClass('all')}
        onClick={() => onFilterChange('all')}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">参与考核人数</p>
              <p className="text-2xl font-bold">{stats.participatingEmployees}</p>
              <p className="mt-1 text-xs text-blue-500">点击查看参与名单</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card 
        className={cardClass('completed')}
        onClick={() => onFilterChange('completed')}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">完成任务人数</p>
              <p className="text-2xl font-bold">{stats.completedTasks}</p>
              <p className="mt-1 text-xs text-green-500">已提交总结/计划</p>
              <p className="mt-1 text-xs text-gray-400">已评分 {stats.completedScores} 人 · 待上级评分 {stats.pendingScores} 人</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card 
        className={cardClass('pending')}
        onClick={() => onFilterChange('pending')}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">未完成任务人数</p>
              <p className="text-2xl font-bold">{stats.pendingTasks}</p>
              <p className="mt-1 text-xs text-yellow-600">未提交总结/计划</p>
              <p className="mt-1 text-xs text-gray-400">提交后才进入上级评分</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
