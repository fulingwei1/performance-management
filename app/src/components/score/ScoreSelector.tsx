import { motion } from 'framer-motion';
import { scoreLevels } from '@/lib/config';
import { cn } from '@/lib/utils';

interface ScoreSelectorProps {
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}

export function ScoreSelector({ value, onChange, disabled = false }: ScoreSelectorProps) {
  return (
    <div className="flex gap-2">
      {scoreLevels.map((level) => {
        const isSelected = value === level.score;
        
        return (
          <motion.button
            key={level.level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level.score)}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 transition-all duration-200",
              isSelected 
                ? "border-current shadow-md" 
                : "border-gray-200 hover:border-gray-300",
              disabled && "cursor-not-allowed opacity-60"
            )}
            style={{
              backgroundColor: isSelected ? `${level.color}15` : 'white',
              color: isSelected ? level.color : '#6B7280',
              borderColor: isSelected ? level.color : undefined
            }}
          >
            <span className="text-lg font-bold">{level.level}</span>
            <span className="text-xs">{level.score}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
