import { Sparkles, Lightbulb, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { calculateTotalScore } from '@/lib/calculateScore';
import type { AISuggestion } from '@/types';

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onApplyScores?: (scores: AISuggestion['suggestedScores']) => void;
  compact?: boolean;
}

export function AISuggestionCard({ suggestion, onApplyScores, compact = false }: AISuggestionCardProps) {
  
  const totalSuggestedScore = calculateTotalScore(
    suggestion.suggestedScores.taskCompletion,
    suggestion.suggestedScores.initiative,
    suggestion.suggestedScores.projectFeedback,
    suggestion.suggestedScores.qualityImprovement
  );
  
  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-purple-900">AI建议</span>
                <Badge className="bg-purple-100 text-purple-700 text-xs">AI</Badge>
              </div>
              <p className="text-sm text-purple-700 mt-1 line-clamp-2">{suggestion.summary}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-sm">
                  <span className="text-gray-500">建议得分:</span>
                  <span className="font-semibold text-purple-700 ml-1">{totalSuggestedScore.toFixed(2)}</span>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-purple-600 h-7"
                >
                  查看详情
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-purple-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                AI智能评分建议
                <Badge className="bg-purple-100 text-purple-700">AI生成</Badge>
              </CardTitle>
              <p className="text-sm text-gray-500">基于员工工作总结的智能分析</p>
            </div>
          </div>
          {onApplyScores && (
            <Button 
              size="sm" 
              onClick={() => onApplyScores(suggestion.suggestedScores)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              应用建议分数
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="bg-white/70 rounded-lg p-4">
          <p className="text-gray-700">{suggestion.summary}</p>
        </div>
        
        {/* Suggested Scores */}
        <div className="bg-white/70 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            建议评分
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ScoreItem 
              label="任务完成" 
              score={suggestion.suggestedScores.taskCompletion} 
              weight="40%"
            />
            <ScoreItem 
              label="主动性" 
              score={suggestion.suggestedScores.initiative} 
              weight="30%"
            />
            <ScoreItem 
              label="项目反馈" 
              score={suggestion.suggestedScores.projectFeedback} 
              weight="20%"
            />
            <ScoreItem 
              label="质量改进" 
              score={suggestion.suggestedScores.qualityImprovement} 
              weight="10%"
            />
          </div>
          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <span className="text-gray-600">综合建议得分</span>
            <ScoreDisplay score={totalSuggestedScore} showLabel size="md" />
          </div>
        </div>
        
        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50/70 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              优点
            </h4>
            <ul className="space-y-1">
              {suggestion.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-orange-50/70 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              改进建议
            </h4>
            <ul className="space-y-1">
              {suggestion.improvements.map((improvement, i) => (
                <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Reasoning */}
        <div className="bg-blue-50/70 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-1 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            评分依据
          </h4>
          <p className="text-sm text-blue-700">{suggestion.reasoning}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ScoreItemProps {
  label: string;
  score: number;
  weight: string;
}

function ScoreItem({ label, score, weight }: ScoreItemProps) {
  return (
    <div className="text-center p-2 bg-white rounded-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-purple-600">{score.toFixed(1)}</p>
      <p className="text-xs text-gray-400">{weight}</p>
    </div>
  );
}
