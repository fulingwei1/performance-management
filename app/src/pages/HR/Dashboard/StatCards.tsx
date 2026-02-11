import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Stats {
  totalEmployees: number;
  completedScores: number;
  pendingScores: number;
}

interface StatCardsProps {
  stats: Stats;
  onFilterChange: (filter: 'all' | 'pending' | 'completed') => void;
}

export function StatCards({ stats, onFilterChange }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange('all')}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总人数</p>
              <p className="text-2xl font-bold">{stats.totalEmployees}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange('completed')}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已评分</p>
              <p className="text-2xl font-bold">{stats.completedScores}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange('pending')}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待评分</p>
              <p className="text-2xl font-bold">{stats.pendingScores}</p>
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
