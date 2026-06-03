import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Play, Bell, Archive, Send, FileText, CheckCircle,
  Users, RefreshCw, Calendar, TrendingUp, Zap, ShieldCheck,
  Database, Trash2, UserRoundCheck, Eye, Download
} from 'lucide-react';
import { employeeApi, request, salaryIntegrationApi } from '@/services/api';
import { getDefaultAssessmentMonth } from '@/lib/assessmentMonth';
import { AssessmentFlowSteps } from '@/components/flow/AssessmentFlow';

const apiCall = (path: string, options?: RequestInit) => request(`/automation${path}`, options);

interface ProgressData {
  month: string;
  totalEmployees: number;
  eligibleEmployees: number;
  draftCount: number;
  submittedCount: number;
  scoredCount: number;
  completedCount: number;
  scoredFinishedCount?: number;
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

interface EmployeeOption {
  id: string;
  name: string;
  employeeId?: string;
  department?: string;
  subDepartment?: string;
  status?: string;
}

interface QuarterlyCoefficientPreview {
  quarter: string;
  effectiveQuarter: string;
  summary: {
    employeeCount: number;
    avgQuarterScore: number;
    avgCoefficient: number;
    minCoefficient: number;
    maxCoefficient: number;
    levelCounts?: Record<string, number>;
  };
  results: Array<{
    employeeExternalId: string;
    employeeName: string;
    department?: string;
    subDepartment?: string;
    quarterScore: number;
    monthsCount: number;
    rank: number;
    level: string;
    coefficient: number;
  }>;
}

export default function MonthlyAutomation() {
  const [selectedMonth, setSelectedMonth] = useState(() => getDefaultAssessmentMonth());
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoStatus, setDemoStatus] = useState<DemoDataStatus | null>(null);
  const [salaryPushMode, setSalaryPushMode] = useState<'monthly' | 'quarterly'>('quarterly');
  const [salaryPushConfirmed, setSalaryPushConfirmed] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeTaskSearch, setEmployeeTaskSearch] = useState('');
  const [excludeFromAssessmentOnDelete, setExcludeFromAssessmentOnDelete] = useState(true);
  const [scopeChangeReason, setScopeChangeReason] = useState('员工已在考核周期内离职/本期不参与绩效');
  const [allowDuplicateReminder, setAllowDuplicateReminder] = useState(false);
  const [quarterlyPreview, setQuarterlyPreview] = useState<QuarterlyCoefficientPreview | null>(null);

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

  const loadEmployees = useCallback(async () => {
    try {
      const r = await employeeApi.getAll();
      if (r.success) {
        const list = Array.isArray(r.data) ? r.data : r.data?.employees || [];
        setEmployees(list);
      }
    } catch {
      toast.error('加载员工列表失败');
    }
  }, []);

  useEffect(() => { loadProgress(); loadLogs(); loadDemoStatus(); loadEmployees(); }, [loadProgress, loadLogs, loadDemoStatus, loadEmployees]);

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

  const runEmployeeTaskAction = async (
    action: 'generate' | 'delete' | 'remind',
    options?: { confirmed?: boolean },
  ) => {
    if (selectedEmployeeIds.length === 0) {
      toast.error('请先勾选员工');
      return;
    }
    if (action === 'delete' && !options?.confirmed) {
      const ok = window.confirm(`确认取消已勾选 ${selectedEmployeeIds.length} 名员工的 ${selectedMonth} 绩效任务吗？系统会保留原绩效记录和操作日志，但从本月统计、排名、发布检查和催办中排除，并清理这些员工该月待办/通知${excludeFromAssessmentOnDelete ? '；同时加入考核排除名单，后续不再生成和催办' : ''}。`);
      if (!ok) return;
    }

    setLoading(true);
    try {
      const path = action === 'generate'
        ? '/employee-tasks/generate'
        : action === 'remind'
          ? '/employee-tasks/remind'
          : '/employee-tasks';
      const r = await apiCall(path, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        body: JSON.stringify({
          employeeIds: selectedEmployeeIds,
          month: selectedMonth,
          ...(action === 'delete' ? { excludeFromAssessment: excludeFromAssessmentOnDelete, reason: scopeChangeReason.trim() } : {}),
        }),
      });
      if (r.success) {
        toast.success(r.message || '操作成功');
        await loadProgress();
        await loadLogs();
      } else {
        toast.error(r.message || '操作失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '请求失败');
    } finally {
      setLoading(false);
    }
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
  const normalizedEmployeeTaskSearch = employeeTaskSearch.trim().toLowerCase();
  const filteredEmployees = employees.filter((employee) => {
    if (!normalizedEmployeeTaskSearch) return true;
    return [
      employee.id,
      employee.employeeId,
      employee.name,
      employee.department,
      employee.subDepartment,
      employee.status,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedEmployeeTaskSearch));
  });
  const visibleEmployeeIds = filteredEmployees.map((employee) => employee.id);
  const selectedVisibleCount = visibleEmployeeIds.filter((id) => selectedEmployeeIds.includes(id)).length;
  const allVisibleSelected = visibleEmployeeIds.length > 0 && selectedVisibleCount === visibleEmployeeIds.length;
  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeeIds((current) => (
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    ));
  };
  const selectVisibleEmployees = () => {
    setSelectedEmployeeIds((current) => {
      const next = new Set(current);
      visibleEmployeeIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };
  const unselectVisibleEmployees = () => {
    setSelectedEmployeeIds((current) => current.filter((id) => !visibleEmployeeIds.includes(id)));
  };
  const incompleteCount = progress ? Math.max(progress.eligibleEmployees - progress.completedCount, 0) : 0;
  const scoredFinishedCount = progress?.scoredFinishedCount ?? progress?.scoredCount ?? 0;
  const pendingScoreCount = progress ? Math.max(progress.completedCount - scoredFinishedCount, 0) : 0;
  const completionRate = progress?.eligibleEmployees
    ? (progress.completedCount / progress.eligibleEmployees) * 100
    : 0;
  const scoreCompletionRate = progress?.eligibleEmployees
    ? (scoredFinishedCount / progress.eligibleEmployees) * 100
    : 0;
  const publishReady = Boolean(progress?.eligibleEmployees && scoredFinishedCount === progress.eligibleEmployees);
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const selectedMonthNumber = Number(selectedMonth.slice(5, 7));
  const selectedQuarter = Math.ceil(selectedMonthNumber / 3);
  const sourcePeriodLabel = salaryPushMode === 'monthly' ? selectedMonth : `${selectedYear}-Q${selectedQuarter}`;
  const effectivePeriodLabel = salaryPushMode === 'monthly'
    ? `${selectedMonthNumber === 12 ? selectedYear + 1 : selectedYear}-${String(selectedMonthNumber === 12 ? 1 : selectedMonthNumber + 1).padStart(2, '0')}`
    : `${selectedQuarter === 4 ? selectedYear + 1 : selectedYear}-Q${selectedQuarter === 4 ? 1 : selectedQuarter + 1}`;
  const automationSteps = [
    {
      title: '确认范围和模板',
      description: '先在人事档案和考核配置中确认谁参与、用什么模板。',
      status: 'done' as const,
    },
    {
      title: progress?.eligibleEmployees ? '生成并跟进任务' : '等待生成任务',
      description: progress?.eligibleEmployees ? `${selectedMonth} 当前需完成 ${progress.eligibleEmployees} 人。` : '选择月份后可补生成缺失任务。',
      status: progress?.eligibleEmployees ? 'active' as const : 'waiting' as const,
    },
    {
      title: publishReady ? '发布和归档' : '催办与评分',
      description: publishReady ? '全部评分完成后发布结果，并可推送薪资。' : '未提交只催员工；已提交未评分只催上级。',
      status: publishReady ? 'active' as const : 'waiting' as const,
    },
  ];

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

  const previewQuarterlyCoefficients = async () => {
    setLoading(true);
    try {
      const result = await salaryIntegrationApi.getQuarterlyCoefficients(selectedYear, selectedQuarter);
      if (result.success) {
        setQuarterlyPreview(result.data);
        toast.success(`已生成 ${selectedYear}-Q${selectedQuarter} 季度绩效系数预览`);
      } else {
        toast.error(result.message || '生成季度绩效系数失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成季度绩效系数失败');
    } finally {
      setLoading(false);
    }
  };

  const exportQuarterlyCoefficients = async () => {
    setLoading(true);
    try {
      await salaryIntegrationApi.exportQuarterlyCoefficients(selectedYear, selectedQuarter);
      toast.success('季度绩效系数 Excel 已开始下载');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出季度绩效系数失败');
    } finally {
      setLoading(false);
    }
  };

  const publishWithOptionalDistributionExemption = () => {
    const useExemption = window.confirm('如果只是普通发布点“取消”；如果需要因为 2-7-1 分布不满足但仍要发布，点“确定”并填写豁免原因。');
    if (!useExemption) {
      runAction('publish', { month: selectedMonth });
      return;
    }

    const reason = window.prompt('请填写2-7-1豁免原因（不少于10个字，会进入日志留痕）：');
    if (!reason || reason.trim().length < 10) {
      toast.error('豁免原因不能少于10个字');
      return;
    }

    runAction('publish', {
      month: selectedMonth,
      forceDistribution: true,
      forceReason: reason.trim(),
    });
  };

  const autoPublishWithOptionalDistributionExemption = () => {
    const useExemption = window.confirm('如果只是普通补跑发布+归档点“取消”；如果需要因为 2-7-1 分布不满足但仍要发布并归档，点“确定”并填写豁免原因。');
    if (!useExemption) {
      runAction('auto-publish', { month: selectedMonth });
      return;
    }

    const reason = window.prompt('请填写2-7-1豁免原因（不少于10个字，会进入日志留痕）：');
    if (!reason || reason.trim().length < 10) {
      toast.error('豁免原因不能少于10个字');
      return;
    }

    runAction('auto-publish', {
      month: selectedMonth,
      forceDistribution: true,
      forceReason: reason.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1117] p-6 space-y-6">
      <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-gray-900 via-[#111827] to-blue-950 p-5 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-500/20 p-3">
              <Zap className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-blue-200">HR 流程控制台 · {selectedMonth}</div>
              <h1 className="mt-1 text-2xl font-bold text-white">月度考核任务与发布</h1>
              <p className="text-sm text-gray-300 mt-2">
                正常按后台定时执行；这里用于补生成、精准催办、单人处理、发布归档和薪资推送。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-full bg-white/10 px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-300" />
            <input type="month" value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setSalaryPushConfirmed(false); loadProgress(e.target.value); }}
              className="bg-transparent text-white rounded px-2 py-1 text-sm outline-none" />
            <button onClick={() => { loadProgress(); loadLogs(); }} className="p-2 hover:bg-white/10 rounded-full">
              <RefreshCw className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-white p-3">
          <AssessmentFlowSteps steps={automationSteps} compact />
        </div>
      </div>

      {progress && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">完成监控</h2>
            <p className="text-sm text-gray-400 mt-1">先看当月要完成多少、完成了多少，再决定要不要手动补跑。</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card icon={<Users className="w-5 h-5 text-blue-400" />} label="需完成任务人数"
              value={`${progress.eligibleEmployees}`} sub={`在职总人数 ${progress.totalEmployees} 人`} />
            <Card icon={<CheckCircle className="w-5 h-5 text-green-400" />} label="员工已提交"
              value={`${progress.completedCount}`} sub="已提交总结/计划" />
            <Card icon={<FileText className="w-5 h-5 text-yellow-400" />} label="员工未提交"
              value={`${incompleteCount}`} sub="只催员工本人" />
            <Card icon={<ShieldCheck className="w-5 h-5 text-blue-400" />} label="上级已评分"
              value={`${scoredFinishedCount}`} sub={`待评分 ${pendingScoreCount} 人`} />
            <Card icon={<TrendingUp className="w-5 h-5 text-purple-400" />} label="提交完成率"
              value={`${completionRate.toFixed(1)}%`} sub={rateColor(completionRate)} />
          </div>
          <p className="text-xs text-gray-400">评分完成率：{scoreCompletionRate.toFixed(1)}%。发布归档按“上级评分完成”判断，不按员工提交完成判断。</p>

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

        <div className="bg-gray-900 rounded-lg p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
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

          <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium text-purple-100">季度绩效系数预览与导出</div>
                <div className="mt-1 text-xs text-purple-100/70">
                  按 {selectedYear}-Q{selectedQuarter} 的已完成月度绩效汇总，生成每个人给薪资系统使用的绩效系数。
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={previewQuarterlyCoefficients}
                  disabled={loading}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  预览季度系数
                </button>
                <button
                  type="button"
                  onClick={exportQuarterlyCoefficients}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  导出季度系数
                </button>
              </div>
            </div>

            {quarterlyPreview && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                  <div className="rounded bg-gray-950/50 p-3">
                    <div className="text-gray-400">人数</div>
                    <div className="text-white text-xl font-semibold">{quarterlyPreview.summary.employeeCount}</div>
                  </div>
                  <div className="rounded bg-gray-950/50 p-3">
                    <div className="text-gray-400">季度均分</div>
                    <div className="text-white text-xl font-semibold">{quarterlyPreview.summary.avgQuarterScore}</div>
                  </div>
                  <div className="rounded bg-gray-950/50 p-3">
                    <div className="text-gray-400">平均系数</div>
                    <div className="text-white text-xl font-semibold">{quarterlyPreview.summary.avgCoefficient}</div>
                  </div>
                  <div className="rounded bg-gray-950/50 p-3">
                    <div className="text-gray-400">最低系数</div>
                    <div className="text-white text-xl font-semibold">{quarterlyPreview.summary.minCoefficient}</div>
                  </div>
                  <div className="rounded bg-gray-950/50 p-3">
                    <div className="text-gray-400">最高系数</div>
                    <div className="text-white text-xl font-semibold">{quarterlyPreview.summary.maxCoefficient}</div>
                  </div>
                </div>

                <div className="max-h-72 overflow-auto rounded-lg border border-gray-800">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-950 text-xs text-gray-400">
                      <tr>
                        <th className="px-3 py-2">排名</th>
                        <th className="px-3 py-2">员工</th>
                        <th className="px-3 py-2">部门</th>
                        <th className="px-3 py-2">有效月份</th>
                        <th className="px-3 py-2">季度均分</th>
                        <th className="px-3 py-2">等级</th>
                        <th className="px-3 py-2">绩效系数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarterlyPreview.results.slice(0, 12).map((row) => (
                        <tr key={row.employeeExternalId} className="border-t border-gray-800 text-gray-200">
                          <td className="px-3 py-2">#{row.rank}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-white">{row.employeeName}</div>
                            <div className="text-xs text-gray-500">{row.employeeExternalId}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-400">
                            {[row.department, row.subDepartment].filter(Boolean).join(' / ') || '—'}
                          </td>
                          <td className="px-3 py-2">{row.monthsCount}</td>
                          <td className="px-3 py-2">{row.quarterScore}</td>
                          <td className="px-3 py-2">{row.level}</td>
                          <td className="px-3 py-2 font-semibold text-purple-200">{row.coefficient}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {quarterlyPreview.results.length > 12 && (
                    <div className="border-t border-gray-800 p-3 text-xs text-gray-500">
                      仅预览前 12 人，完整名单请导出 Excel。
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
          <h2 className="text-lg font-semibold text-white">考核周期中途范围调整</h2>
          <p className="text-sm text-gray-400 mt-1">
            勾选 1 人就是单人处理，勾选多人就是批量处理；可在已启动周期内新增、取消、恢复本期考核，不会重跑整月任务。
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-gray-400">勾选员工</label>
                <div className="text-xs text-gray-400">
                  已勾选 <span className="text-white font-semibold">{selectedEmployeeIds.length}</span> 人
                  {filteredEmployees.length !== employees.length ? ` / 当前筛选 ${filteredEmployees.length} 人` : ''}
                </div>
              </div>
              <input
                value={employeeTaskSearch}
                onChange={(event) => setEmployeeTaskSearch(event.target.value)}
                placeholder="搜索姓名、工号、部门、小组、状态..."
                className="mt-1 w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                  disabled={visibleEmployeeIds.length === 0 || allVisibleSelected}
                  onClick={selectVisibleEmployees}
                >
                  全选当前筛选
                </button>
                <button
                  type="button"
                  className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                  disabled={selectedVisibleCount === 0}
                  onClick={unselectVisibleEmployees}
                >
                  取消当前筛选
                </button>
                <button
                  type="button"
                  className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                  disabled={selectedEmployeeIds.length === 0}
                  onClick={() => setSelectedEmployeeIds([])}
                >
                  清空全部
                </button>
                <span className="text-xs text-gray-500">
                  月份使用右上角当前选择：{selectedMonth}；列表包含已禁用/离职员工，便于处理“任务生成后离职/临时加入或移出考核范围”。
                </span>
              </div>

              <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-gray-800">
                {filteredEmployees.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">没有匹配员工</div>
                ) : (
                  filteredEmployees.map((employee) => {
                    const checked = selectedEmployeeIds.includes(employee.id);
                    return (
                      <label
                        key={employee.id}
                        className={`flex cursor-pointer items-start gap-3 border-b border-gray-800 px-3 py-3 text-sm transition last:border-b-0 ${checked ? 'bg-blue-500/10' : 'hover:bg-gray-800/70'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEmployeeSelection(employee.id)}
                          className="mt-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-white">{employee.name}</span>
                            <span className="text-xs text-gray-400">({employee.id})</span>
                            {employee.status && employee.status !== 'active' && (
                              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-200">
                                {employee.status === 'disabled' ? '已禁用/离职' : employee.status}
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block truncate text-xs text-gray-500">
                            {[employee.department, employee.subDepartment].filter(Boolean).join(' / ') || '未维护部门'}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-100">
              <div className="font-medium">提醒发送规则</div>
              <div className="mt-1 text-blue-100/80">
                草稿状态发给员工；已提交状态发给考评人；已评分/完成则不再催办，并进入自动化日志留痕。
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-50">
            <input
              type="checkbox"
              checked={excludeFromAssessmentOnDelete}
              onChange={(event) => setExcludeFromAssessmentOnDelete(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">取消本期考核时，同时加入考核排除名单</span>
              <span className="mt-1 block text-xs text-orange-100/80">
                适用于员工在考核周期内离职：系统不会硬删绩效记录，只会标记“本期不参与”，清理待办/通知，并从应考人数、进度统计、后续催办、排名和发布检查中排除。正式人事状态仍建议在人事档案系统里维护后重新上传。
              </span>
            </span>
          </label>

          <div>
            <label className="text-xs text-gray-400">取消/豁免原因（会进入日志留痕）</label>
            <input
              value={scopeChangeReason}
              onChange={(event) => setScopeChangeReason(event.target.value)}
              placeholder="例如：员工已于考核周期内离职，本期不参与绩效"
              className="mt-1 w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              title="单独生成任务"
              description={`为已勾选员工生成 ${selectedMonth} 绩效任务；如果此前被取消/豁免，会恢复为本期考核任务。`}
              buttonLabel={`生成任务（${selectedEmployeeIds.length}）`}
              buttonClassName="bg-blue-600 hover:bg-blue-700"
              disabled={loading || selectedEmployeeIds.length === 0}
              icon={<UserRoundCheck className="w-4 h-4" />}
              onClick={() => runEmployeeTaskAction('generate')}
            />

            <ActionCard
              title="取消本期考核"
              description="保留绩效记录和日志，标记为本期取消/豁免；清理待办/通知，并从统计、排名、发布检查和催办中排除。"
              buttonLabel={`取消本期（${selectedEmployeeIds.length}）`}
              buttonClassName="bg-red-600 hover:bg-red-700"
              disabled={loading || selectedEmployeeIds.length === 0}
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => runEmployeeTaskAction('delete')}
            />

            <ActionCard
              title="重新发送提醒"
              description="按该员工当前任务状态精准补发一次提醒，不会发给其他员工或不参与考核人员。"
              buttonLabel={`重发提醒（${selectedEmployeeIds.length}）`}
              buttonClassName="bg-amber-600 hover:bg-amber-700"
              disabled={loading || selectedEmployeeIds.length === 0}
              icon={<Bell className="w-4 h-4" />}
              onClick={() => runEmployeeTaskAction('remind')}
            />
          </div>
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
            description={`当后台自动催办没有按预期执行时，为 ${selectedMonth} 补漏检查；同一个人今天已收到过则默认不重复发送。`}
            buttonLabel="强制补发催办"
            buttonClassName="bg-amber-600 hover:bg-amber-700"
            disabled={loading}
            icon={<Bell className="w-4 h-4" />}
            onClick={() => {
              if (window.confirm(`确认要为 ${selectedMonth} 执行催办补漏吗？同一个人今天默认最多收到一次；${allowDuplicateReminder ? '你已勾选允许重复发送，可能会再次收到。' : '如需重复发送，请先勾选“允许重复发送”。'}`)) {
                runAction('check-reminders?force=true', { month: selectedMonth, force: true, allowDuplicateWecom: allowDuplicateReminder });
              }
            }}
          />

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicateReminder}
                onChange={(event) => setAllowDuplicateReminder(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-amber-400 bg-gray-900"
              />
              <span>
                <span className="block font-medium">允许重复发送企业微信催办</span>
                <span className="mt-1 block text-amber-100/75">
                  默认关闭：同一员工/经理同一天最多收到一条综合催办。只有确认测试或补救失败时才勾选。
                </span>
              </span>
            </label>
          </div>

          <ActionCard
            title="补跑结果发布"
            description={`8-10号自动发布/归档漏跑，或员工补齐后需要立即发布时，可为 ${selectedMonth} 补跑发布和归档。`}
            buttonLabel="补跑发布+归档"
            buttonClassName="bg-green-600 hover:bg-green-700"
            disabled={loading}
            icon={<Archive className="w-4 h-4" />}
            onClick={autoPublishWithOptionalDistributionExemption}
            secondaryButton={{
              label: '仅发布结果/豁免',
              icon: <Send className="w-4 h-4" />,
              onClick: publishWithOptionalDistributionExemption,
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
