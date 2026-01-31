import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

export function StarRating({ 
  value, 
  onChange, 
  max = 5, 
  size = 'md',
  readOnly = false 
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const isFilled = (hoverValue || value) >= starValue;
        
        return (
          <motion.button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readOnly && setHoverValue(starValue)}
            onMouseLeave={() => !readOnly && setHoverValue(0)}
            whileHover={!readOnly ? { scale: 1.2 } : {}}
            whileTap={!readOnly ? { scale: 0.9 } : {}}
            className={cn(
              "transition-colors duration-200",
              readOnly && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-all duration-200",
                isFilled 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "fill-gray-100 text-gray-300"
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
