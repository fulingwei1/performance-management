import { motion } from 'framer-motion';
import { 
  FileText, 
  Star, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Task } from '@/stores/taskStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  title?: string;
  showProgress?: boolean;
}

const taskTypeConfig = {
  fill_summary: {
    icon: FileText,
    color: 'blue',
    link: '/employee/summary'
  },
  peer_review: {
    icon: Star,
    color: 'purple',
    link: '/employee/peer-review'
  },
  manager_score: {
    icon: User,
    color: 'orange',
    link: '/manager/scoring'
  }
};

const priorityConfig = {
  high: { label: '高', color: 'text-red-600 bg-red-50' },
  medium: { label: '中', color: 'text-yellow-600 bg-yellow-50' },
  low: { label: '低', color: 'text-green-600 bg-green-50' }
};

export function TaskList({ tasks, title = '本月任务', showProgress = true }: TaskListProps) {
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const progress = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };
  

  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            {title}
          </CardTitle>
          {showProgress && (
            <Badge variant="outline" className="font-medium">
              {completedTasks.length}/{tasks.length} 完成
            </Badge>
          )}
        </div>
        {showProgress && (
          <Progress value={progress} className="h-2 mt-2" />
        )}
      </CardHeader>
      <CardContent>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {/* 待办任务 */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                待办 ({pendingTasks.length})
              </p>
              {pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
          
          {/* 已完成任务 */}
          {completedTasks.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                已完成 ({completedTasks.length})
              </p>
              {completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} isCompleted />
              ))}
            </div>
          )}
          
          {tasks.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-gray-500">本月暂无任务</p>
            </div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

interface TaskItemProps {
  task: Task;
  isCompleted?: boolean;
}

function TaskItem({ task, isCompleted = false }: TaskItemProps) {
  const config = taskTypeConfig[task.type];
  const Icon = config.icon;
  const priority = priorityConfig[task.priority];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        isCompleted 
          ? "bg-gray-50 border-gray-100 opacity-70" 
          : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
      )}
    >
      {/* Status Icon */}
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
        isCompleted 
          ? "bg-green-100 text-green-600" 
          : `bg-${config.color}-100 text-${config.color}-600`
      )}>
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-medium truncate",
            isCompleted && "line-through text-gray-400"
          )}>
            {task.title}
          </p>
          {!isCompleted && (
            <Badge className={cn("text-xs", priority.color)}>
              {priority.label}
            </Badge>
          )}
        </div>
        <p className={cn(
          "text-sm truncate",
          isCompleted ? "text-gray-400" : "text-gray-500"
        )}>
          {task.description}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className={cn(
            "text-xs flex items-center gap-1",
            isCompleted ? "text-gray-400" : "text-gray-500"
          )}>
            <Clock className="w-3 h-3" />
            截止: {task.dueDate}
          </span>
          {task.employeeName && !isCompleted && (
            <span className="text-xs text-orange-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              待评分
            </span>
          )}
        </div>
      </div>
      
      {/* Action */}
      {!isCompleted && (
        <Link to={config.link}>
          <Button size="sm" variant="ghost">
            去处理
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      )}
    </motion.div>
  );
}
