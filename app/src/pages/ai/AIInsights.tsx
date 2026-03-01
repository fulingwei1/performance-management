import React, { useState, useEffect } from 'react';
import { 
  TrendingUpIcon, 
  AlertTriangleIcon, 
  UsersIcon,
  BrainIcon,
  ChevronRightIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PredictionData {
  predictions: Array<{
    month: string;
    predictedScore: number;
    confidenceInterval: { lower: number; upper: number };
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

interface PromotionCandidate {
  employeeId: number;
  employeeName: string;
  department: string;
  currentPosition: string;
  score: number;
  metrics: {
    performanceScore: number;
    goalCompletionRate: number;
    peerReviewScore: number;
    tenure: number;
  };
  recommendation: string;
  strengths: string[];
  concerns: string[];
}

interface Anomaly {
  employeeId: number;
  employeeName: string;
  department: string;
  anomalyType: string;
  level: 'info' | 'warning' | 'alert';
  description: string;
  currentScore: number;
  month: string;
  suggestions: string[];
}

export const AIInsights: React.FC = () => {
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [candidates, setCandidates] = useState<PromotionCandidate[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'prediction' | 'promotion' | 'anomaly'>('prediction');

  useEffect(() => {
    loadAIData();
  }, []);

  const loadAIData = async () => {
    try {
      setLoading(true);

      // 加载晋升候选人
      const candidatesRes = await fetch(`${API_URL}/api/ai/promotion-candidates?limit=10`);
      const candidatesData = await candidatesRes.json();
      if (candidatesData.success) {
        setCandidates(candidatesData.data);
      }

      // 加载异常检测
      const anomaliesRes = await fetch(`${API_URL}/api/ai/performance-anomalies`);
      const anomaliesData = await anomaliesRes.json();
      if (anomaliesData.success) {
        setAnomalies(anomaliesData.data);
      }
    } catch (error) {
      console.error('加载AI数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const levelColors = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    alert: 'bg-red-100 text-red-800'
  };

  const trendIcons = {
    increasing: '📈',
    decreasing: '📉',
    stable: '➡️'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BrainIcon className="h-8 w-8 text-purple-600" />
            AI 智能洞察
          </h1>
          <p className="text-gray-600 mt-1">
            基于机器学习的绩效预测、晋升推荐和异常检测
          </p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('promotion')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'promotion'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UsersIcon className="inline h-5 w-5 mr-2" />
            晋升推荐
          </button>
          <button
            onClick={() => setSelectedTab('anomaly')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'anomaly'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangleIcon className="inline h-5 w-5 mr-2" />
            异常检测
          </button>
        </nav>
      </div>

      {/* 晋升推荐 Tab */}
      {selectedTab === 'promotion' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">晋升候选人排行榜 Top 10</h2>
            
            {candidates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无候选人数据</p>
            ) : (
              <div className="space-y-4">
                {candidates.map((candidate, index) => (
                  <div key={candidate.employeeId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{candidate.employeeName}</h3>
                            <p className="text-sm text-gray-600">
                              {candidate.department} · {candidate.currentPosition}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">绩效得分</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {candidate.metrics.performanceScore.toFixed(1)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">目标完成率</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {candidate.metrics.goalCompletionRate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">同事评价</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {candidate.metrics.peerReviewScore.toFixed(1)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">在岗时长</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {candidate.metrics.tenure.toFixed(0)}%
                            </p>
                          </div>
                        </div>

                        {candidate.strengths.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-green-700 mb-1">优势:</p>
                            <ul className="text-sm text-gray-700 space-y-1">
                              {candidate.strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-green-600">✓</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {candidate.score.toFixed(1)}
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          candidate.score >= 85
                            ? 'bg-green-100 text-green-800'
                            : candidate.score >= 75
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {candidate.recommendation}
                        </span>
                      </div>
                    </div>

                    {/* 雷达图 */}
                    <div className="mt-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart data={[
                          { subject: '绩效', value: candidate.metrics.performanceScore, fullMark: 100 },
                          { subject: '目标', value: candidate.metrics.goalCompletionRate, fullMark: 100 },
                          { subject: '评价', value: candidate.metrics.peerReviewScore, fullMark: 100 },
                          { subject: '资历', value: candidate.metrics.tenure, fullMark: 100 }
                        ]}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar name={candidate.employeeName} dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 异常检测 Tab */}
      {selectedTab === 'anomaly' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">绩效异常预警</h2>
            
            {anomalies.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <span className="text-3xl">✓</span>
                </div>
                <p className="text-gray-600">当前无异常情况，系统运行良好！</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.map((anomaly, index) => (
                  <div
                    key={`${anomaly.employeeId}-${index}`}
                    className={`border-l-4 rounded-r-lg p-4 ${
                      anomaly.level === 'alert'
                        ? 'border-red-500 bg-red-50'
                        : anomaly.level === 'warning'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{anomaly.employeeName}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelColors[anomaly.level]}`}>
                            {anomaly.anomalyType}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{anomaly.department}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{anomaly.currentScore}</div>
                        <p className="text-xs text-gray-500">{anomaly.month}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{anomaly.description}</p>

                    {anomaly.suggestions.length > 0 && (
                      <div className="bg-white/50 rounded p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">💡 建议措施:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {anomaly.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <ChevronRightIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
