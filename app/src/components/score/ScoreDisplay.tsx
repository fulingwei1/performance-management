import { motion } from 'framer-motion';
import { scoreToLevel, getLevelLabel, getLevelColor } from '@/lib/calculateScore';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ScoreDisplayProps {
  score: number;
  showLabel?: boolean;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ScoreDisplay({ 
  score, 
  showLabel = true, 
  showProgress = false,
  size = 'md',
  className 
}: ScoreDisplayProps) {
  const level = scoreToLevel(score);
  const label = getLevelLabel(level);
  const color = getLevelColor(level);
  
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };
  
  const badgeSizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  };
  
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        <motion.span
          key={score}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn("font-bold tabular-nums", sizeClasses[size])}
          style={{ color }}
        >
          {score.toFixed(2)}
        </motion.span>
        
        {showLabel && (
          <span
            className={cn(
              "rounded-full font-medium text-white",
              badgeSizeClasses[size]
            )}
            style={{ backgroundColor: color }}
          >
            {label}
          </span>
        )}
      </div>
      
      {showProgress && (
        <div className="w-full mt-1">
          <Progress 
            value={(score / 1.5) * 100} 
            className="h-2"
            style={{ 
              '--progress-background': `${color}30`,
              '--progress-fill': color 
            } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  );
}
