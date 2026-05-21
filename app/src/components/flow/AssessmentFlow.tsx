import type { ReactNode } from 'react';
import { CheckCircle2, Circle, Clock3, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type FlowStepStatus = 'done' | 'active' | 'waiting';

export type FlowStep = {
  title: string;
  description?: string;
  status: FlowStepStatus;
  icon?: LucideIcon;
};

const statusStyle: Record<FlowStepStatus, string> = {
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm',
  waiting: 'border-gray-200 bg-gray-50 text-gray-500',
};

const statusIcon: Record<FlowStepStatus, LucideIcon> = {
  done: CheckCircle2,
  active: Clock3,
  waiting: Circle,
};

export function AssessmentFlowSteps({ steps, compact = false }: { steps: FlowStep[]; compact?: boolean }) {
  return (
    <div className={cn('grid gap-3', compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 md:grid-cols-3')}>
      {steps.map((step, index) => {
        const Icon = step.icon || statusIcon[step.status];
        return (
          <div key={`${step.title}-${index}`} className={cn('rounded-2xl border p-4 transition', statusStyle[step.status])}>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/70 p-2">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">第 {index + 1} 步</div>
                <div className="mt-1 font-semibold text-gray-950">{step.title}</div>
                {step.description && <div className="mt-1 text-sm leading-5 text-gray-600">{step.description}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FlowHero({
  eyebrow,
  title,
  description,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <div className="text-sm font-semibold text-blue-700">{eyebrow}</div>}
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
