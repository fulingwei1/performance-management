import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { scoreLevels, dimensionCriteria } from '@/lib/config';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, CheckCircle2, Info } from 'lucide-react';

interface ScoreSelectorWithCriteriaProps {
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  dimensionKey: string; // 维度key，用于获取对应的评分标准
  showCriteria?: boolean; // 是否默认展开标准
  compact?: boolean; // 紧凑模式
}

export function ScoreSelectorWithCriteria({ 
  value, 
  onChange, 
  disabled = false,
  dimensionKey,
  showCriteria = false,
  compact = false
}: ScoreSelectorWithCriteriaProps) {
  const [expanded, setExpanded] = useState(showCriteria);
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);
  
  // 获取当前选中的等级
  const selectedLevel = scoreLevels.find(l => l.score === value);
  const criteria = dimensionCriteria[dimensionKey];
  
  // 获取要显示的标准（悬停优先，否则显示选中的）
  const displayLevel = hoveredLevel || selectedLevel?.level;
  const displayCriteria = displayLevel && criteria ? criteria[displayLevel] : null;

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
        
        {/* 展开/收起按钮 */}
        {criteria && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all",
              expanded 
                ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            )}
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">{expanded ? '收起标准' : '评分标准'}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* 当前悬停/选中等级的简要提示 */}
      {displayCriteria && !expanded && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
        >
          <span 
            className="font-semibold px-2.5 py-1 rounded-md text-white text-xs shadow-sm"
            style={{ 
              backgroundColor: scoreLevels.find(l => l.level === displayLevel)?.color 
            }}
          >
            {displayLevel}
          </span>
          <span className="font-medium text-gray-700">{displayCriteria.title}</span>
          <span className="text-gray-400 text-sm">— 点击"评分标准"查看详情</span>
        </motion.div>
      )}

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
                          {levelCriteria.behaviors.slice(0, 3).map((behavior, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span 
                                className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                                style={{ backgroundColor: level.color }}
                              />
                              <span className="line-clamp-2">{behavior}</span>
                            </li>
                          ))}
                          {levelCriteria.behaviors.length > 3 && (
                            <li className="text-gray-400 pl-2">
                              +{levelCriteria.behaviors.length - 3} 更多...
                            </li>
                          )}
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
