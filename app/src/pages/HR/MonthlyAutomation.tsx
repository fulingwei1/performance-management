import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Play, Bell, Archive, Send, FileText, CheckCircle,
  Users, RefreshCw, Calendar, TrendingUp, Zap, ShieldCheck,
  Database, Trash2
} from 'lucide-react';
import { salaryIntegrationApi } from '@/services/api';

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

interface DemoDataStatus {
  performanceRecords: number;
  quarterlySummaries: number;
  todos: number;
  notifications: number;
  total: number;
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
  const [demoStatus, setDemoStatus] = useState<DemoDataStatus | null>(null);
  const [salaryPushMode, setSalaryPushMode] = useState<'monthly' | 'quarterly'>('quarterly');
  const [salaryPushConfirmed, setSalaryPushConfirmed] = useState(false);

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

  const loadDemoStatus = useCallback(async () => {
    try {
      const r = await apiCall('/demo-data/status');
      if (r.success) setDemoStatus(r.data || null);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadProgress(); loadLogs(); loadDemoStatus(); }, [loadProgress, loadLogs, loadDemoStatus]);

  const runAction = async (action: string, body?: any) => {
    setLoading(true);
    try {
      const r = await apiCall(`/${action}`, { method: 'POST', body: JSON.stringify(body || {}) });
      if (r.success) {
        toast.success(r.message || '操作成功');
        await loadProgress();
        await loadLogs();
        await loadDemoStatus();
      } else {
        toast.error(r.message || '操作失败');
      }
    } catch (e) { toast.error('请求失败: ' + String(e)); }
    setLoading(false);
  };

  const generateDemoData = async () => {
    if (!window.confirm(`确认生成演示数据吗？系统会先清除旧演示数据，再生成截至 ${selectedMonth} 的近 3 个月演示绩效记录；不会覆盖真实绩效记录。`)) {
      return;
    }
    setLoading(true);
    try {
      const r = await apiCall('/demo-data/generate', {
        method: 'POST',
        body: JSON.stringify({ month: selectedMonth, monthCount: 3 }),
      });
      if (r.success) {
        toast.success(r.message || '演示数据已生成');
        await loadProgress();
        await loadLogs();
        await loadDemoStatus();
      } else {
        toast.error(r.message || '生成演示数据失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成演示数据失败');
    } finally {
      setLoading(false);
    }
  };

  const clearDemoData = async () => {
    if (!window.confirm('确认清除所有演示数据吗？只会删除带演示标记的数据，不会删除真实绩效记录。')) {
      return;
    }
    setLoading(true);
    try {
      const r = await apiCall('/demo-data', { method: 'DELETE' });
      if (r.success) {
        toast.success(r.message || '演示数据已清除');
        await loadProgress();
        await loadLogs();
        await loadDemoStatus();
      } else {
        toast.error(r.message || '清除演示数据失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '清除演示数据失败');
    } finally {
      setLoading(false);
    }
  };

  const rateColor = (rate: number) => rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400';
  const incompleteCount = progress ? Math.max(progress.eligibleEmployees - progress.completedCount, 0) : 0;
  const completionRate = progress?.eligibleEmployees
    ? (progress.completedCount / progress.eligibleEmployees) * 100
    : 0;
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const selectedMonthNumber = Number(selectedMonth.slice(5, 7));
  const selectedQuarter = Math.ceil(selectedMonthNumber / 3);
  const sourcePeriodLabel = salaryPushMode === 'monthly' ? selectedMonth : `${selectedYear}-Q${selectedQuarter}`;
  const effectivePeriodLabel = salaryPushMode === 'monthly'
    ? `${selectedMonthNumber === 12 ? selectedYear + 1 : selectedYear}-${String(selectedMonthNumber === 12 ? 1 : selectedMonthNumber + 1).padStart(2, '0')}`
    : `${selectedQuarter === 4 ? selectedYear + 1 : selectedYear}-Q${selectedQuarter === 4 ? 1 : selectedQuarter + 1}`;

  const pushToSalary = async () => {
    if (!salaryPushConfirmed) {
      toast.error('请先点击“系统管理员确认”，确认后才允许推送到薪资系统');
      return;
    }

    setLoading(true);
    try {
      const result = await salaryIntegrationApi.pushResults({
        periodType: salaryPushMode,
        year: selectedYear,
        month: salaryPushMode === 'monthly' ? selectedMonthNumber : undefined,
        quarter: salaryPushMode === 'quarterly' ? selectedQuarter : undefined,
        confirmedByAdmin: true,
      });
      if (result.success) {
        toast.success(result.message || '已推送到薪资系统');
        setSalaryPushConfirmed(false);
      } else {
        toast.error(result.message || '推送失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '推送失败');
    } finally {
      setLoading(false);
    }
  };

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
          <input type="month" value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setSalaryPushConfirmed(false); loadProgress(e.target.value); }}
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
          <h2 className="text-lg font-semibold text-white">薪资系统对接</h2>
          <p className="text-sm text-gray-400 mt-1">
            管理员可以选择按月或按季度推送；季度默认影响下一季度，月度默认影响下个月。
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <div>
              <label className="text-xs text-gray-400">推送口径</label>
              <select
                value={salaryPushMode}
                onChange={(event) => {
                  setSalaryPushMode(event.target.value as 'monthly' | 'quarterly');
                  setSalaryPushConfirmed(false);
                }}
                className="mt-1 w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700"
              >
                <option value="quarterly">按季度汇总推送</option>
                <option value="monthly">按月度结果推送</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">当前选择月份</label>
              <div className="mt-1 bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700">
                {selectedMonth}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400">实际推送周期</label>
              <div className="mt-1 bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700">
                {sourcePeriodLabel}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 lg:max-w-md">
            <div className="font-medium">管理员确认后才会写入薪资系统</div>
            <div className="mt-1 text-amber-200/80">
              本次将按 {sourcePeriodLabel} 推送，影响薪资周期：{effectivePeriodLabel}。确认前不会进入绩效工资计算。
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSalaryPushConfirmed(true);
              toast.success('已完成管理员确认，可以推送到薪资系统');
            }}
            disabled={loading || salaryPushConfirmed}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {salaryPushConfirmed ? '已确认' : '系统管理员确认'}
          </button>

          <button
            onClick={pushToSalary}
            disabled={loading || !salaryPushConfirmed}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            推送到薪资系统
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">演示数据</h2>
          <p className="text-sm text-gray-400 mt-1">用于演示系统看板、评分、排名和历史趋势；演示数据有独立标记，可一键清除，不会覆盖真实绩效记录。</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center gap-2 text-white font-medium">
              <Database className="w-4 h-4 text-blue-400" />
              当前演示数据
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded bg-gray-800 p-3">
                <div className="text-gray-400">绩效记录</div>
                <div className="text-white text-xl font-bold">{demoStatus?.performanceRecords ?? 0}</div>
              </div>
              <div className="rounded bg-gray-800 p-3">
                <div className="text-gray-400">季度汇总</div>
                <div className="text-white text-xl font-bold">{demoStatus?.quarterlySummaries ?? 0}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">合计：{demoStatus?.total ?? 0} 条演示相关数据</div>
          </div>

          <ActionCard
            title="一键生成演示数据"
            description={`生成截至 ${selectedMonth} 的近 3 个月演示绩效记录。会先清理旧演示数据，遇到真实绩效记录会自动跳过。`}
            buttonLabel="生成演示数据"
            buttonClassName="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
            icon={<Database className="w-4 h-4" />}
            onClick={generateDemoData}
          />

          <ActionCard
            title="一键清除演示数据"
            description="只清除带演示标记的数据，包括历史 E2E/示例季度汇总；真实绩效数据不会被删除。"
            buttonLabel="清除演示数据"
            buttonClassName="bg-red-600 hover:bg-red-700"
            disabled={loading || !demoStatus?.total}
            icon={<Trash2 className="w-4 h-4" />}
            onClick={clearDemoData}
          />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">手动补跑</h2>
          <p className="text-sm text-gray-400 mt-1">只有自动化漏跑、补发失败，或者需要重建当月数据时，才在这里手动执行。</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <ActionCard
            title="补生成缺失任务"
            description={`当后台自动生成漏跑时，为 ${selectedMonth} 补生成缺失任务；已有任务会跳过，不会删除或重建。`}
            buttonLabel="补生成缺失任务"
            buttonClassName="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
            icon={<Play className="w-4 h-4" />}
            onClick={() => runAction('generate-monthly-tasks', { month: selectedMonth })}
          />

          <ActionCard
            title="补发催办提醒"
            description={`当后台自动催办没有按预期执行时，可为 ${selectedMonth} 强制补发一次；如果今天已发过，会再次发出。`}
            buttonLabel="强制补发催办"
            buttonClassName="bg-amber-600 hover:bg-amber-700"
            disabled={loading}
            icon={<Bell className="w-4 h-4" />}
            onClick={() => {
              if (window.confirm(`确认要为 ${selectedMonth} 强制补发催办吗？如果今天已经催办过，员工和经理会再收到一次。`)) {
                runAction('check-reminders?force=true', { month: selectedMonth, force: true });
              }
            }}
          />

          <ActionCard
            title="补跑结果发布"
            description={`8-10号自动发布/归档漏跑，或员工补齐后需要立即发布时，可为 ${selectedMonth} 补跑发布和归档。`}
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
