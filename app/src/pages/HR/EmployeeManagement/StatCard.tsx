import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600'
};

export function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color])}>
            <Users className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
