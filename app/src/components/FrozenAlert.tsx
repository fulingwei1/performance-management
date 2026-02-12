import { AlertTriangle, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface FrozenAlertProps {
  frozen?: boolean;
  deadline?: string;
  className?: string;
}

/**
 * 任务冻结状态提示组件
 * - 显示冻结状态和截止日期
 * - 超期前3天显示预警
 */
export function FrozenAlert({ frozen, deadline, className }: FrozenAlertProps) {
  if (!deadline && !frozen) return null;

  const now = new Date();
  const deadlineDate = deadline ? new Date(deadline) : null;
  const daysUntilDeadline = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // 已冻结状态
  if (frozen) {
    return (
      <Alert className={`bg-red-50 border-red-200 ${className}`}>
        <Lock className="w-4 h-4 text-red-600" />
        <AlertTitle className="text-red-900 font-semibold">
          任务已冻结
        </AlertTitle>
        <AlertDescription className="text-red-700 mt-1">
          <p>
            截止日期已过（
            {deadlineDate && format(deadlineDate, 'yyyy年MM月dd日', { locale: zhCN })}
            ），任务已自动冻结，无法编辑或提交。
          </p>
          <p className="mt-1 text-sm">
            如需解冻，请联系人力资源部门。
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // 临近截止日期（3天内）
  if (daysUntilDeadline !== null && daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
    return (
      <Alert className={`bg-yellow-50 border-yellow-200 ${className}`}>
        <AlertTriangle className="w-4 h-4 text-yellow-600" />
        <AlertTitle className="text-yellow-900 font-semibold">
          ⏰ 截止日期临近
        </AlertTitle>
        <AlertDescription className="text-yellow-700">
          距离截止日期还有 <strong>{daysUntilDeadline} 天</strong>（
          {deadlineDate && format(deadlineDate, 'yyyy年MM月dd日', { locale: zhCN })}
          ），请尽快完成提交，超期后将自动冻结。
        </AlertDescription>
      </Alert>
    );
  }

  // 正常状态，显示截止日期
  if (deadlineDate) {
    return (
      <Alert className={`bg-blue-50 border-blue-200 ${className}`}>
        <AlertDescription className="text-blue-700 text-sm">
          📅 截止日期：
          {format(deadlineDate, 'yyyy年MM月dd日', { locale: zhCN })}
          {daysUntilDeadline && daysUntilDeadline > 3 && (
            <span className="ml-2 text-blue-600">
              （还有 {daysUntilDeadline} 天）
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
