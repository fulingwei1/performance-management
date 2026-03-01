import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TodoCardProps {
  title: string;
  count: number;
  dueDate?: string | null;
  status?: 'pending' | 'warning' | 'overdue';
  link: string;
  icon: React.ReactNode;
}

export function TodoCard({ title, count, dueDate, status = 'pending', link, icon }: TodoCardProps) {
  const navigate = useNavigate();

  if (count === 0) return null;

  const statusStyles = {
    overdue: 'bg-red-50 border-red-200 hover:bg-red-100',
    warning: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    pending: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  };

  const badgeStyles = {
    overdue: 'bg-red-500',
    warning: 'bg-yellow-500',
    pending: 'bg-blue-500',
  };

  const statusLabels = {
    overdue: '已逾期',
    warning: '即将到期',
    pending: '待处理',
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusStyles[status]}`}
      onClick={() => navigate(link)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{count}</div>
          <Badge className={`${badgeStyles[status]} text-white text-xs`}>
            {statusLabels[status]}
          </Badge>
        </div>
        {dueDate && (
          <p className="text-xs text-gray-500 mt-2">
            最近截止: {new Date(dueDate).toLocaleDateString('zh-CN')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
