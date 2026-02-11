import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { scoreLevels, dimensionCriteria } from '@/lib/config';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface ScoreSelectorWithCriteriaProps {
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  dimensionKey: string; // 维度key，用于获取对应的评分标准
  showCriteria?: boolean; // 兼容旧用法，当前始终展开标准
  compact?: boolean; // 紧凑模式
}

export function ScoreSelectorWithCriteria({ 
  value, 
  onChange, 
  disabled = false,
  dimensionKey,
  compact = false
}: ScoreSelectorWithCriteriaProps) {
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);
  const expanded = true;
  
  const criteria = dimensionCriteria[dimensionKey];

  return (
    <div className="space-y-3">
      {/* 评分按钮行 - 自适应宽度 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 flex-1">
          {scoreLevels.map((level) => {
            const isSelected = value === level.score;
            const isHovered = hoveredLevel === level.level;
            
            return (
              <motion.button
                key={level.level}
                type="button"
                disabled={disabled}
                onClick={() => onChange(level.score)}
                onMouseEnter={() => setHoveredLevel(level.level)}
                onMouseLeave={() => setHoveredLevel(null)}
                whileHover={!disabled ? { scale: 1.03 } : {}}
                whileTap={!disabled ? { scale: 0.97 } : {}}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200 flex-1 min-w-[60px]",
                  compact ? "h-14 max-w-[80px]" : "h-16 max-w-[90px]",
                  isSelected 
                    ? "border-current shadow-lg ring-2 ring-offset-1" 
                    : "border-gray-200 hover:border-gray-300 shadow-sm",
                  disabled && "cursor-not-allowed opacity-60"
                )}
                style={{
                  backgroundColor: isSelected ? `${level.color}12` : isHovered ? `${level.color}08` : 'white',
                  color: isSelected ? level.color : isHovered ? level.color : '#6B7280',
                  borderColor: isSelected ? level.color : isHovered ? `${level.color}60` : undefined,
                  // @ts-expect-error ringColor is a Tailwind CSS property
                  '--tw-ring-color': isSelected ? `${level.color}30` : undefined
                }}
              >
                <span className={cn("font-bold", compact ? "text-base" : "text-lg")}>{level.level}</span>
                <span className="text-[11px] font-medium">{level.label}</span>
                {!compact && <span className="text-[10px] opacity-60">{level.score}分</span>}
                {isSelected && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5"
                  >
                    <CheckCircle2 className="w-5 h-5 drop-shadow-sm" style={{ color: level.color }} fill="white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
        
      </div>

      {/* 当前悬停/选中等级的简要提示 */}
      {/* 展开的评分标准面板 */}
      <AnimatePresence>
        {expanded && criteria && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl p-4 border border-gray-200 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">评分标准参考</h4>
                <span className="text-xs text-gray-400">点击任意等级可直接选中</span>
              </div>
              
              {/* 横向排列的等级卡片 */}
              <div className="grid grid-cols-5 gap-3">
                {scoreLevels.map((level) => {
                  const levelCriteria = criteria[level.level];
                  const isSelected = value === level.score;
                  const isHovered = hoveredLevel === level.level;
                  
                  return (
                    <motion.div
                      key={level.level}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all cursor-pointer",
                        isSelected 
                          ? "shadow-md ring-1 ring-offset-1" 
                          : isHovered
                            ? "shadow-sm bg-white"
                            : "bg-white/70 hover:bg-white"
                      )}
                      style={{
                        borderColor: isSelected ? level.color : isHovered ? `${level.color}60` : '#E5E7EB'
                      }}
                      onClick={() => !disabled && onChange(level.score)}
                      onMouseEnter={() => setHoveredLevel(level.level)}
                      onMouseLeave={() => setHoveredLevel(null)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* 等级标题 */}
                      <div className="flex items-center justify-between mb-2">
                        <span 
                          className="font-bold px-2 py-0.5 rounded-md text-white text-xs shadow-sm"
                          style={{ backgroundColor: level.color }}
                        >
                          {level.level}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4" style={{ color: level.color }} />
                        )}
                      </div>
                      
                      {/* 等级名称和分数 */}
                      <div className="mb-2">
                        <p className="font-medium text-gray-800 text-sm">{levelCriteria?.title}</p>
                        <p className="text-xs text-gray-400">{level.score}分</p>
                      </div>
                      
                      {/* 行为标准列表 */}
                      {levelCriteria && (
                        <ul className="text-[11px] text-gray-600 space-y-1">
                          {levelCriteria.behaviors.map((behavior, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span 
                                className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                                style={{ backgroundColor: level.color }}
                              />
                              <span>{behavior}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
