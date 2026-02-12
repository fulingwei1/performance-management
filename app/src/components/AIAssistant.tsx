/**
 * AI助手组件 - 侧边栏形式
 * 用于员工自评和经理评分时提供AI建议
 */

import { useState } from 'react';
import { Sparkles, Loader2, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  /** AI功能类型 */
  type: 'self-summary' | 'next-month-plan' | 'manager-comment' | 'work-arrangement';
  /** AI请求参数 */
  requestData: any;
  /** 采用建议的回调 */
  onAdopt: (content: string) => void;
  /** 自定义样式 */
  className?: string;
}

interface AIVersion {
  content: string;
  index: number;
}

export function AIAssistant({ type, requestData, onAdopt, className }: AIAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<AIVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 获取API端点
  const getEndpoint = () => {
    const endpoints = {
      'self-summary': '/api/ai/self-summary',
      'next-month-plan': '/api/ai/next-month-plan',
      'manager-comment': '/api/ai/manager-comment',
      'work-arrangement': '/api/ai/work-arrangement'
    };
    return endpoints[type];
  };

  // 获取标题
  const getTitle = () => {
    const titles = {
      'self-summary': '本月工作总结',
      'next-month-plan': '下月工作计划',
      'manager-comment': '综合评价',
      'work-arrangement': '下月工作安排'
    };
    return titles[type];
  };

  // 生成AI建议
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setVersions([]);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录，请重新登录');
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const endpoint = getEndpoint();

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AI生成失败');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'AI生成失败');
      }

      // 处理返回的版本
      const versionList = result.data.versions || [result.data.comment || ''];
      setVersions(versionList.map((content: string, index: number) => ({ content, index })));

    } catch (err: any) {
      console.error('AI生成错误:', err);
      setError(err.message || '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 采用版本
  const handleAdopt = (content: string, index: number) => {
    onAdopt(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">AI 助手</h3>
          <Badge variant="outline" className="text-xs bg-white">
            Beta
          </Badge>
        </div>
        <p className="text-xs text-gray-600">
          根据数据智能生成{getTitle()}建议
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 生成按钮 */}
        {versions.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              点击下方按钮，让AI帮你生成建议
            </p>
            <Button 
              onClick={handleGenerate}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              生成AI建议
            </Button>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-600" />
            <p className="text-sm text-gray-600">AI正在思考中...</p>
            <p className="text-xs text-gray-400 mt-2">通常需要5-10秒</p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <div className="text-red-600 text-sm">
                  <p className="font-medium mb-1">生成失败</p>
                  <p className="text-xs">{error}</p>
                </div>
              </div>
              <Button 
                onClick={handleGenerate}
                variant="outline"
                size="sm"
                className="mt-3 w-full border-red-300 text-red-700 hover:bg-red-100"
              >
                重新生成
              </Button>
            </CardContent>
          </Card>
        )}

        {/* AI生成的版本 */}
        {versions.map((version, idx) => (
          <Card 
            key={idx}
            className="border-purple-200 hover:border-purple-400 transition-all cursor-pointer group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  版本 {idx + 1}
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAdopt(version.content, idx)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-600" />
                      <span className="text-green-600">已采用</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      采用
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {version.content}
              </p>
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {version.content.length} 字
                </span>
                <Button
                  size="sm"
                  onClick={() => handleAdopt(version.content, idx)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  采用此版本
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 重新生成按钮 */}
        {versions.length > 0 && (
          <Button 
            onClick={handleGenerate}
            variant="outline"
            className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                重新生成
              </>
            )}
          </Button>
        )}

        {/* 使用提示 */}
        {versions.length === 0 && !loading && !error && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 font-medium mb-2">💡 使用提示</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• AI会生成3个不同风格的版本</li>
              <li>• 点击"采用"按钮快速插入</li>
              <li>• 可以在AI建议基础上修改</li>
              <li>• 如果不满意，可以重新生成</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
