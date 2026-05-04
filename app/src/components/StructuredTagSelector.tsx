import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TagGroup {
  label: string;
  tags: string[];
}

interface StructuredTagSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  groups: TagGroup[];
  maxCount?: number;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export function StructuredTagSelector({
  value,
  onChange,
  groups,
  maxCount = 4,
  emptyText = '未选择',
  className,
  disabled = false
}: StructuredTagSelectorProps) {
  const toggleTag = (tag: string) => {
    if (disabled) return;
    if (value.includes(tag)) {
      onChange(value.filter((item) => item !== tag));
      return;
    }
    if (value.length >= maxCount) return;
    onChange([...value, tag]);
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">已选 {value.length}/{maxCount}</div>
        {value.length > 0 && !disabled && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500" onClick={clearAll}>
            清空
          </Button>
        )}
      </div>

      <div className="min-h-[48px] rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2">
        {value.length === 0 ? (
          <div className="text-xs text-gray-400">{emptyText}</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {value.map((tag) => (
              <Badge
                key={tag}
                className="cursor-pointer bg-blue-100 text-blue-700 hover:bg-blue-200"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label} className="space-y-2">
            <div className="text-xs font-medium text-gray-500">{group.label}</div>
            <div className="flex flex-wrap gap-2">
              {group.tags.map((tag) => {
                const selected = value.includes(tag);
                const tagDisabled = disabled || (!selected && value.length >= maxCount);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    disabled={tagDisabled}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs transition-colors',
                      selected
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                      tagDisabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
