import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Play, BarChart3, Bell, Archive, Send, FileText, CheckCircle,
  Clock, Users, AlertTriangle, RefreshCw, Calendar, TrendingUp,
  Mail, Zap
} from 'lucide-react';

const API_BASE = '/api/automation';

function apiCall(path: string, options?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  }).then(r => r.json());
}

interface ProgressData {
  month: string;
  totalEmployees: number;
  eligibleEmployees: number;
  draftCount: number;
  submittedCount: number;
  scoredCount: number;
  completedCount: number;
  participationRate: number;
  departmentProgress: { department: string; total: number; completed: number; rate: number }[];
}

export default function MonthlyAutomation() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'reminders' | 'stats' | 'archive'>('overview');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  });
  const [months, setMonths] = useState<string[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiCall('/months').then(r => {
      if (r.success) setMonths(r.data);
    }).catch(() => {});
  }, []);

  const loadProgress = useCallback(async (month?: string) => {
    const m = month || selectedMonth;
    try {
      const r = await apiCall(`/progress/${m}`);
      if (r.success) setProgress(r.data);
    } catch { toast.error('加载进度失败'); }
  }, [selectedMonth]);

  const loadLogs = useCallback(async () => {
    try {
      const r = await apiCall('/logs');
      if (r.success) setLogs(r.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadProgress(); loadLogs(); }, [loadProgress, loadLogs]);

  const runAction = async (action: string, body?: any) => {
    setLoading(true);
    try {
      const r = await apiCall(`/${action}`, { method: 'POST', body: JSON.stringify(body || {}) });
      if (r.success) {
        toast.success(r.message || '操作成功');
        await loadProgress();
        await loadLogs();
      } else {
        toast.error(r.message || '操作失败');
      }
    } catch (e) { toast.error('请求失败: ' + String(e)); }
    setLoading(false);
  };

  const rateColor = (rate: number) => rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-[#0f1117] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold text-white">月度自动化管理</h1>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="month" value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); loadProgress(e.target.value); }}
            className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm border border-gray-700" />
          <button onClick={() => { loadProgress(); loadLogs(); }} className="p-2 hover:bg-gray-800 rounded-lg">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {[
          { key: 'overview', label: '总览', icon: BarChart3 },
          { key: 'tasks', label: '任务生成', icon: FileText },
          { key: 'reminders', label: '催办提醒', icon: Bell },
          { key: 'stats', label: '统计分析', icon: TrendingUp },
          { key: 'archive', label: '发布归档', icon: Archive },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && progress && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card icon={<Users className="w-5 h-5 text-blue-400" />} label="应考核人数"
              value={`${progress.eligibleEmployees}`} sub={`共 ${progress.totalEmployees} 人`} />
            <Card icon={<FileText className="w-5 h-5 text-yellow-400" />} label="待提交"
              value={`${progress.draftCount}`} sub="自评未完成" />
            <Card icon={<CheckCircle className="w-5 h-5 text-green-400" />} label="已完成"
              value={`${progress.completedCount}`} sub="全部完成" />
            <Card icon={<TrendingUp className="w-5 h-5 text-purple-400" />} label="参与率"
              value={`${(progress.participationRate * 100).toFixed(1)}%`} sub={rateColor(progress.participationRate * 100)} />
          </div>

          {/* Department Progress */}
          {progress.departmentProgress?.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">部门进度</h3>
              <div className="space-y-2">
                {progress.departmentProgress.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-gray-300 text-sm w-32 truncate">{d.department}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full bg-blue-500 transition-all" style={{ width: `${d.rate}%` }} />
                    </div>
                    <span className={`text-sm font-mono w-16 text-right ${rateColor(d.rate)}`}>
                      {d.rate.toFixed(0)}%
                    </span>
                    <span className="text-gray-500 text-xs">{d.completed}/{d.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Logs */}
          {logs.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">最近执行日志</h3>
              <div className="space-y-1 max-h-40 overflow-auto">
                {logs.slice(0, 10).map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-400' : log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                    <span className="text-gray-400">{new Date(log.executed_at || log.created_at).toLocaleString('zh-CN')}</span>
                    <span className="text-gray-300">{log.task_type}</span>
                    <span className={log.status === 'success' ? 'text-green-400' : 'text-red-400'}>{log.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Task Generation */}
      {activeTab === 'tasks' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-white font-medium mb-2">手动生成本月考核任务</h3>
            <p className="text-gray-400 text-sm mb-4">
              为所有 eligible 员工（{progress?.eligibleEmployees || '?'} 人）创建 {selectedMonth} 月的绩效记录、通知和待办。
            </p>
            <button onClick={() => runAction('generate-monthly-tasks', { month: selectedMonth })}
              disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
              <Play className="w-4 h-4" /> 生成任务
            </button>
          </div>
        </motion.div>
      )}

      {/* Reminders */}
      {activeTab === 'reminders' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-white font-medium mb-2">催办提醒</h3>
            <p className="text-gray-400 text-sm mb-4">
              检查所有未完成考核的员工，发送催办通知和邮件。截止日前 3 天开始催办。
            </p>
            <button onClick={() => runAction('check-reminders')}
              disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
              <Bell className="w-4 h-4" /> 立即催办
            </button>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      {activeTab === 'stats' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-white font-medium mb-2">统计分析报告</h3>
            <p className="text-gray-400 text-sm mb-4">
              生成 {selectedMonth} 月的统计报告和图表（部门分布、分数趋势、等级占比）。
            </p>
            <button onClick={() => runAction('generate-monthly-stats', { month: selectedMonth })}
              disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
              <BarChart3 className="w-4 h-4" /> 生成报告
            </button>
          </div>
        </motion.div>
      )}

      {/* Archive */}
      {activeTab === 'archive' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-white font-medium mb-2">发布与归档</h3>
            <p className="text-gray-400 text-sm mb-4">
              自动发布 {selectedMonth} 月考核结果并归档数据。发布后员工可查看考核结果。
            </p>
            <div className="flex gap-3">
              <button onClick={() => runAction('publish', { month: selectedMonth })}
                disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
                <Send className="w-4 h-4" /> 手动发布
              </button>
              <button onClick={() => runAction('auto-publish', { month: selectedMonth })}
                disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Archive className="w-4 h-4" /> 自动发布+归档
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* no inline style needed — using Tailwind classes directly */}
    </div>
  );
}

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 flex items-start gap-3">
      {icon}
      <div>
        <div className="text-gray-400 text-xs">{label}</div>
        <div className="text-white text-2xl font-bold">{value}</div>
        {sub && <div className="text-gray-500 text-xs mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
