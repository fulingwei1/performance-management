/**
 * 员工评价关键词选择器
 * 用于经理在评分时快速选择评价标签
 */

import { useState, useMemo } from 'react';
import { Search, X, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import keywordsData from '@/data/evaluation-keywords.json';

interface Keyword {
  id: string;
  text: string;
  category: string;
  level: string[];
  description: string;
}

interface KeywordSelectorProps {
  value: string[];  // 已选关键词ID列表
  onChange: (keywords: string[]) => void;
  maxCount?: number;  // 最大选择数量
  employeeLevel?: 'basic' | 'senior' | 'manager' | 'executive';
  className?: string;
}

const categoryIcons: Record<string, string> = {
  'ability': '📊',
  'attitude': '🎯',
  'teamwork': '🤝',
  'management': '💡',
  'quality': '🌟',
  'performance': '🚀',
  'others': '🎨',
};

const categoryLabels: Record<string, string> = {
  'ability': '工作能力',
  'attitude': '工作态度',
  'teamwork': '团队协作',
  'management': '管理能力',
  'quality': '个人素质',
  'performance': '工作表现',
  'others': '其他',
};

export function KeywordSelector({
  value = [],
  onChange,
  maxCount = 7,
  employeeLevel = 'basic',
  className,
}: KeywordSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'positive' | 'negative'>('positive');

  // 获取关键词数据
  const positiveKeywords = keywordsData.positive as Keyword[];
  const negativeKeywords = keywordsData.negative as Keyword[];

  // 根据员工级别和搜索词过滤关键词
  const filteredPositive = useMemo(() => {
    return positiveKeywords.filter(kw => {
      const levelMatch = kw.level.includes(employeeLevel) || kw.level.includes('basic');
      const searchMatch = !searchQuery || 
        kw.text.includes(searchQuery) || 
        kw.description.includes(searchQuery);
      return levelMatch && searchMatch;
    });
  }, [employeeLevel, searchQuery, positiveKeywords]);

  const filteredNegative = useMemo(() => {
    return negativeKeywords.filter(kw => {
      const levelMatch = kw.level.includes(employeeLevel) || kw.level.includes('basic');
      const searchMatch = !searchQuery || 
        kw.text.includes(searchQuery) || 
        kw.description.includes(searchQuery);
      return levelMatch && searchMatch;
    });
  }, [employeeLevel, searchQuery, negativeKeywords]);

  // 按分类分组
  const groupByCategory = (keywords: Keyword[]) => {
    const groups: Record<string, Keyword[]> = {};
    keywords.forEach(kw => {
      if (!groups[kw.category]) {
        groups[kw.category] = [];
      }
      groups[kw.category].push(kw);
    });
    return groups;
  };

  const positiveGroups = groupByCategory(filteredPositive);
  const negativeGroups = groupByCategory(filteredNegative);

  // 切换选择
  const toggleKeyword = (keywordId: string) => {
    if (value.includes(keywordId)) {
      // 取消选择
      onChange(value.filter(id => id !== keywordId));
    } else {
      // 添加选择
      if (value.length >= maxCount) {
        // 达到最大数量，替换最后一个
        onChange([...value.slice(0, maxCount - 1), keywordId]);
      } else {
        onChange([...value, keywordId]);
      }
    }
  };

  // 获取已选关键词的详细信息
  const selectedKeywords = useMemo(() => {
    return [...positiveKeywords, ...negativeKeywords].filter(kw => value.includes(kw.id));
  }, [value, positiveKeywords, negativeKeywords]);

  const selectedPositive = selectedKeywords.filter(kw => kw.id.startsWith('p'));
  const selectedNegative = selectedKeywords.filter(kw => kw.id.startsWith('n'));

  // 清空所有选择
  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 已选标签 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">
            已选标签 ({value.length}/{maxCount})
          </Label>
          {value.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              清空
            </button>
          )}
        </div>
        <div className="min-h-[60px] p-3 bg-gray-50 rounded-lg border border-gray-200">
          {value.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-2">
              点击下方标签添加评价关键词
            </div>
          ) : (
            <div className="space-y-2">
              {selectedPositive.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedPositive.map(kw => (
                    <Badge
                      key={kw.id}
                      className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200 cursor-pointer"
                      onClick={() => toggleKeyword(kw.id)}
                    >
                      {kw.text}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              {selectedNegative.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedNegative.map(kw => (
                    <Badge
                      key={kw.id}
                      className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 cursor-pointer"
                      onClick={() => toggleKeyword(kw.id)}
                    >
                      {kw.text}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="搜索关键词..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 正面/负面切换 */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('positive')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'positive'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          正面评价 ({filteredPositive.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('negative')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'negative'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          待改进 ({filteredNegative.length})
        </button>
      </div>

      {/* 关键词列表 */}
      <div className="max-h-[400px] overflow-y-auto space-y-4">
        {activeTab === 'positive' ? (
          // 正面关键词
          Object.entries(positiveGroups).map(([category, keywords]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{categoryIcons[category]}</span>
                <span className="text-sm font-medium text-gray-700">
                  {categoryLabels[category]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map(kw => {
                  const isSelected = value.includes(kw.id);
                  return (
                    <button
                      key={kw.id}
                      type="button"
                      onClick={() => toggleKeyword(kw.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-all',
                        isSelected
                          ? 'bg-green-100 text-green-700 border-green-300 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:bg-green-50'
                      )}
                      title={kw.description}
                    >
                      {kw.text}
                      {isSelected && (
                        <CheckCircle className="w-3 h-3 ml-1 inline" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          // 负面关键词（待改进）
          Object.entries(negativeGroups).map(([category, keywords]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{categoryIcons[category]}</span>
                <span className="text-sm font-medium text-gray-700">
                  {categoryLabels[category]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map(kw => {
                  const isSelected = value.includes(kw.id);
                  return (
                    <button
                      key={kw.id}
                      type="button"
                      onClick={() => toggleKeyword(kw.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-all',
                        isSelected
                          ? 'bg-orange-100 text-orange-700 border-orange-300 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      )}
                      title={kw.description}
                    >
                      {kw.text}
                      {isSelected && (
                        <CheckCircle className="w-3 h-3 ml-1 inline" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 使用提示 */}
      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
        💡 <strong>使用提示：</strong>
        选择3-5个最突出的正面标签，可选1-2个待改进方向。
        标签会自动保存到评语中。
      </div>
    </div>
  );
}
