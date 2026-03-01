import { useEffect, useState } from 'react';
import { FileText, Target, AlertCircle, Award, ClipboardCheck, MessageSquare, Send, TrendingUp } from 'lucide-react';
import { TodoCard } from './TodoCard';

interface TodoGroup {
  count: number;
  dueDate: string | null;
  status: 'pending' | 'warning' | 'overdue';
  items: any[];
}

type TodoSummary = Record<string, TodoGroup>;

interface TodoConfig {
  type: string;
  title: string;
  link: string;
  icon: React.ReactNode;
}

const employeeTodoConfigs: TodoConfig[] = [
  { type: 'work_summary', title: '待填写工作总结', link: '/employee/work-summary', icon: <FileText className="h-4 w-4 text-blue-500" /> },
  { type: 'goal_approval', title: '待确认目标', link: '/employee/goal-planning', icon: <Target className="h-4 w-4 text-green-500" /> },
  { type: 'appeal_review', title: '申诉结果', link: '/employee/appeals', icon: <AlertCircle className="h-4 w-4 text-orange-500" /> },
];

const managerTodoConfigs: TodoConfig[] = [
  { type: 'performance_review', title: '待打分员工', link: '/manager/scoring', icon: <Award className="h-4 w-4 text-purple-500" /> },
  { type: 'goal_approval', title: '待审批目标', link: '/manager/goal-approval', icon: <ClipboardCheck className="h-4 w-4 text-blue-500" /> },
  { type: 'appeal_review', title: '待审核申诉', link: '/manager/appeals-review', icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
  { type: 'manager_review', title: '待审阅报告', link: '/manager/review-reports', icon: <MessageSquare className="h-4 w-4 text-green-500" /> },
];

const hrTodoConfigs: TodoConfig[] = [
  { type: 'hr_review', title: '待处理申诉', link: '/hr/appeals', icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
  { type: 'appeal_review', title: '待发布考核', link: '/hr/assessment-publication', icon: <Send className="h-4 w-4 text-blue-500" /> },
  { type: 'performance_review', title: '待审批晋升', link: '/hr/promotion-approvals', icon: <TrendingUp className="h-4 w-4 text-green-500" /> },
];

const configMap: Record<string, TodoConfig[]> = {
  employee: employeeTodoConfigs,
  manager: managerTodoConfigs,
  hr: hrTodoConfigs,
};

interface TodoSectionProps {
  role: 'employee' | 'manager' | 'hr';
  fetchSummary: () => Promise<any>;
}

export function TodoSection({ role, fetchSummary }: TodoSectionProps) {
  const [summary, setSummary] = useState<TodoSummary | null>(null);
  const configs = configMap[role] || [];

  useEffect(() => {
    fetchSummary().then((res: any) => {
      if (res?.success) setSummary(res.data);
      else if (res?.data) setSummary(res.data);
    }).catch(() => {});
  }, [fetchSummary]);

  if (!summary) return null;

  const hasAnyTodos = configs.some(c => summary[c.type]?.count > 0);
  if (!hasAnyTodos) return null;

  const gridCols = configs.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4 mb-6`}>
      {configs.map(config => {
        const group = summary[config.type];
        return (
          <TodoCard
            key={config.type}
            title={config.title}
            count={group?.count || 0}
            dueDate={group?.dueDate}
            status={group?.status || 'pending'}
            link={config.link}
            icon={config.icon}
          />
        );
      })}
    </div>
  );
}
