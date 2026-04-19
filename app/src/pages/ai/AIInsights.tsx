import React, { useEffect, useMemo, useState } from 'react';
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

interface EmployeeOption {
  id: string;
  name: string;
  department?: string;
  position?: string;
}

interface PromotionCandidate {
  employeeId: string;
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
  employeeId: string;
  employeeName: string;
  department: string;
  anomalyType: string;
  level: 'info' | 'warning' | 'alert';
  description: string;
  currentScore: number;
  month: string;
  suggestions: string[];
}

const trendLabels = {
  increasing: '上升',
  decreasing: '下降',
  stable: '稳定'
} as const;

const trendIcons = {
  increasing: '📈',
  decreasing: '📉',
  stable: '➡️'
} as const;

export const AIInsights: React.FC = () => {
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [candidates, setCandidates] = useState<PromotionCandidate[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [predictionMonths, setPredictionMonths] = useState(3);
  const [selectedTab, setSelectedTab] = useState<'prediction' | 'promotion' | 'anomaly'>('prediction');

  useEffect(() => {
    void loadAIData();
  }, []);

  useEffect(() => {
    if (selectedTab === 'prediction' && selectedEmployeeId) {
      void loadPrediction(selectedEmployeeId, predictionMonths);
    }
  }, [selectedEmployeeId, predictionMonths, selectedTab]);

  const selectedEmployee = useMemo(
    () => employees.find(employee => String(employee.id) === String(selectedEmployeeId)) || null,
    [employees, selectedEmployeeId]
  );

  const chartData = useMemo(
    () =>
      predictions?.predictions.map(item => ({
        month: item.month,
        预测值: item.predictedScore,
        下限: item.confidenceInterval.lower,
        上限: item.confidenceInterval.upper
      })) || [],
    [predictions]
  );

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadAIData = async () => {
    try {
      setLoading(true);

      const [candidatesRes, anomaliesRes, employeesRes] = await Promise.all([
        fetch(`${API_URL}/api/ai/promotion-candidates?limit=10`),
        fetch(`${API_URL}/api/ai/performance-anomalies`),
        fetch(`${API_URL}/api/employees`, {
          headers: getAuthHeaders()
        })
      ]);

      const [candidatesData, anomaliesData, employeesData] = await Promise.all([
        candidatesRes.json().catch(() => null),
        anomaliesRes.json().catch(() => null),
        employeesRes.json().catch(() => null)
      ]);

      if (candidatesRes.ok && candidatesData?.success) {
        setCandidates(candidatesData.data || []);
      }

      if (anomaliesRes.ok && anomaliesData?.success) {
        setAnomalies(anomaliesData.data || []);
      }

      if (employeesRes.ok && employeesData?.success) {
        const employeeList = employeesData.data || [];
        setEmployees(employeeList);
        if (employeeList.length > 0) {
          setSelectedEmployeeId(current => current || String(employeeList[0].id));
        }
      }
    } catch (error) {
      console.error('加载AI数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrediction = async (employeeId: string, months: number) => {
    try {
      setPredictionLoading(true);
      setPredictionError('');

      const response = await fetch(`${API_URL}/api/ai/predict-performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId,
          months
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || '绩效预测加载失败');
      }

      setPredictions(data.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : '绩效预测加载失败';
      setPredictionError(message);
      setPredictions(null);
    } finally {
      setPredictionLoading(false);
    }
  };

  const levelColors = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    alert: 'bg-red-100 text-red-800'
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

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('prediction')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'prediction'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUpIcon className="inline h-5 w-5 mr-2" />
            绩效预测
          </button>
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

      {selectedTab === 'prediction' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">员工绩效趋势预测</h2>
                <p className="text-sm text-gray-600 mt-1">
                  选择员工后，系统会基于历史绩效自动预测未来 {predictionMonths} 个月走势。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:min-w-[420px]">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">员工</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(event) => setSelectedEmployeeId(event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {employees.length === 0 ? (
                      <option value="">暂无员工数据</option>
                    ) : (
                      employees.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} {employee.department ? `· ${employee.department}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">预测周期</label>
                  <select
                    value={predictionMonths}
                    onChange={(event) => setPredictionMonths(Number(event.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value={3}>未来 3 个月</option>
                    <option value={6}>未来 6 个月</option>
                    <option value={12}>未来 12 个月</option>
                  </select>
                </div>
              </div>
            </div>

            {selectedEmployee && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                当前员工: <span className="font-semibold">{selectedEmployee.name}</span>
                {selectedEmployee.department ? `，部门：${selectedEmployee.department}` : ''}
                {selectedEmployee.position ? `，岗位：${selectedEmployee.position}` : ''}
              </div>
            )}

            {predictionLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : predictionError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
                {predictionError}
              </div>
            ) : !predictions ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                先选择一个员工，系统会自动加载预测结果。
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">趋势判断</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {trendIcons[predictions.trend]} {trendLabels[predictions.trend]}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">预测置信度</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {predictions.confidence}%
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">末月预测</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {predictions.predictions[predictions.predictions.length - 1]?.predictedScore ?? '--'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      区间 {predictions.predictions[predictions.predictions.length - 1]?.confidenceInterval.lower ?? '--'}
                      {' ~ '}
                      {predictions.predictions[predictions.predictions.length - 1]?.confidenceInterval.upper ?? '--'}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">预测走势</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="预测值" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="下限" stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="上限" stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">月份明细</h3>
                  <div className="space-y-3">
                    {predictions.predictions.map(item => (
                      <div key={item.month} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{item.month}</p>
                          <p className="text-sm text-gray-500">
                            置信区间 {item.confidenceInterval.lower} ~ {item.confidenceInterval.upper}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold text-blue-600">{item.predictedScore}</p>
                          <p className="text-xs text-gray-500">预测分数</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                              {candidate.strengths.map((strength, strengthIndex) => (
                                <li key={strengthIndex} className="flex items-start gap-1">
                                  <span className="text-green-600">✓</span> {strength}
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
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            candidate.score >= 85
                              ? 'bg-green-100 text-green-800'
                              : candidate.score >= 75
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {candidate.recommendation}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart
                          data={[
                            { subject: '绩效', value: candidate.metrics.performanceScore, fullMark: 100 },
                            { subject: '目标', value: candidate.metrics.goalCompletionRate, fullMark: 100 },
                            { subject: '评价', value: candidate.metrics.peerReviewScore, fullMark: 100 },
                            { subject: '资历', value: candidate.metrics.tenure, fullMark: 100 }
                          ]}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name={candidate.employeeName}
                            dataKey="value"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.5}
                          />
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
                          {anomaly.suggestions.map((suggestion, suggestionIndex) => (
                            <li key={suggestionIndex} className="flex items-start gap-1">
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
