import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Play, Bell, Archive, Send, FileText, CheckCircle,
  Users, RefreshCw, Calendar, TrendingUp, Zap
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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
  const incompleteCount = progress ? Math.max(progress.eligibleEmployees - progress.completedCount, 0) : 0;
  const completionRate = progress?.eligibleEmployees
    ? (progress.completedCount / progress.eligibleEmployees) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[#0f1117] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">手动触发与完成监控</h1>
            <p className="text-sm text-gray-400 mt-1">自动化已在后台定时执行，这里只做补跑、补发和完成进度监控。</p>
          </div>
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

      {progress && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">完成监控</h2>
            <p className="text-sm text-gray-400 mt-1">先看当月要完成多少、完成了多少，再决定要不要手动补跑。</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card icon={<Users className="w-5 h-5 text-blue-400" />} label="需完成任务人数"
              value={`${progress.eligibleEmployees}`} sub={`公司总人数 ${progress.totalEmployees} 人`} />
            <Card icon={<CheckCircle className="w-5 h-5 text-green-400" />} label="已经完成"
              value={`${progress.completedCount}`} sub="已完成整套流程" />
            <Card icon={<FileText className="w-5 h-5 text-yellow-400" />} label="还未完成"
              value={`${incompleteCount}`} sub="仍需跟进" />
            <Card icon={<TrendingUp className="w-5 h-5 text-purple-400" />} label="完成率"
              value={`${completionRate.toFixed(1)}%`} sub={rateColor(completionRate)} />
          </div>

          {progress.departmentProgress?.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">部门完成进度</h3>
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

          {logs.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">最近补跑/执行日志</h3>
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

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">手动补跑</h2>
          <p className="text-sm text-gray-400 mt-1">只有自动化漏跑、补发失败，或者需要重建当月数据时，才在这里手动执行。</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <ActionCard
            title="补跑任务生成"
            description={`当后台自动生成漏跑或需要重建时，再手动为 ${selectedMonth} 执行一次任务生成。`}
            buttonLabel="生成任务"
            buttonClassName="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
            icon={<Play className="w-4 h-4" />}
            onClick={() => runAction('generate-monthly-tasks', { month: selectedMonth })}
          />

          <ActionCard
            title="补发催办提醒"
            description="当后台自动催办没有按预期执行时，可在这里手动补发一次提醒。"
            buttonLabel="立即催办"
            buttonClassName="bg-amber-600 hover:bg-amber-700"
            disabled={loading}
            icon={<Bell className="w-4 h-4" />}
            onClick={() => runAction('check-reminders')}
          />

          <ActionCard
            title="补跑结果发布"
            description="当后台自动发布或归档没执行成功时，可在这里手动补跑发布和归档。"
            buttonLabel="补跑发布+归档"
            buttonClassName="bg-green-600 hover:bg-green-700"
            disabled={loading}
            icon={<Archive className="w-4 h-4" />}
            onClick={() => runAction('auto-publish', { month: selectedMonth })}
            secondaryButton={{
              label: '仅发布结果',
              icon: <Send className="w-4 h-4" />,
              onClick: () => runAction('publish', { month: selectedMonth }),
            }}
          />
        </div>
      </motion.div>
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

function ActionCard({
  title,
  description,
  buttonLabel,
  buttonClassName,
  disabled,
  icon,
  onClick,
  secondaryButton,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  buttonClassName: string;
  disabled: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  secondaryButton?: { label: string; icon: React.ReactNode; onClick: () => void };
}) {
  return (
    <div className="bg-gray-900 rounded-lg p-6 flex flex-col justify-between gap-4">
      <div>
        <h3 className="text-white font-medium mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-6">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onClick}
          disabled={disabled}
          className={`${buttonClassName} text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50`}
        >
          {icon} {buttonLabel}
        </button>
        {secondaryButton && (
          <button
            onClick={secondaryButton.onClick}
            disabled={disabled}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {secondaryButton.icon} {secondaryButton.label}
          </button>
        )}
      </div>
    </div>
  );
}
