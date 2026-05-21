import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, BellRing, CheckCircle2, ClipboardList, RefreshCcw, Search, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { logApi } from '@/services/api';

type LoginLog = {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  subDepartment?: string;
  loginTime: string | Date;
  loginMethod: 'idCard' | 'password';
  loginIp: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
};

type AuditLog = {
  id: number;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  action: string;
  module: string;
  target_type?: string;
  target_id?: string;
  description?: string;
  request_method?: string;
  request_url?: string;
  result?: string;
  error_message?: string;
  created_at?: string | Date;
};

type ReminderRecipientLog = {
  employeeId?: string;
  employeeName?: string;
  department?: string;
  subDepartment?: string;
  role?: string;
  taskType?: string;
  wecomUserId?: string;
  sent?: boolean;
  reason?: string;
  pendingCount?: number;
  pendingEmployees?: Array<{ employeeId: string; employeeName: string }>;
};

type AutomationLog = {
  id: string;
  job_type?: string;
  task_type?: string;
  month?: string;
  status?: string;
  details?: any;
  duration_ms?: number;
  executed_at?: string | Date;
};

const roleLabels: Record<string, string> = {
  employee: '员工',
  manager: '组长/经理',
  gm: '总经理',
  hr: 'HR',
  admin: '管理员',
};

const actionLabels: Record<string, string> = {
  CREATE: '新增',
  READ: '查看',
  UPDATE: '修改',
  DELETE: '删除',
  LOGIN: '登录',
  LOGOUT: '退出',
};

const formatTime = (value?: string | Date) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
};

const browserSummary = (userAgent?: string) => {
  if (!userAgent) return '-';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  return userAgent.slice(0, 24);
};

const parseDetails = (details: any) => {
  if (!details) return {};
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  }
  return details;
};

const getReminderRecipients = (log: AutomationLog): ReminderRecipientLog[] => {
  const details = parseDetails(log.details);
  return [
    ...(details.employeeReminders?.recipientDetails || []),
    ...(details.managerReminders?.recipientDetails || []),
    ...(details.departmentProgress?.recipientDetails || []),
  ];
};

const getReminderSummary = (log: AutomationLog) => {
  const details = parseDetails(log.details);
  if ((log.task_type || log.job_type) !== 'send_reminders') {
    return '非催办任务';
  }
  const employee = details.employeeReminders || {};
  const manager = details.managerReminders || {};
  const department = details.departmentProgress || {};
  return [
    `员工待提交 ${employee.pendingCount ?? 0} 人 / 企微 ${employee.wecomCount ?? 0}`,
    `经理待评分 ${manager.pendingCount ?? 0} 条 / 企微 ${manager.wecomCount ?? 0}`,
    `部门进度接收 ${department.recipientCount ?? 0} 人`,
  ].join('；');
};

export default function LogManagement() {
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);
  const [loginTotal, setLoginTotal] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [automationTotal, setAutomationTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loginPage, setLoginPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [automationPage, setAutomationPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loginResult, setLoginResult] = useState<'all' | 'success' | 'failed'>('all');
  const [auditResult, setAuditResult] = useState<'all' | 'SUCCESS' | 'FAILED' | 'UNAUTHORIZED'>('all');
  const [auditModule, setAuditModule] = useState('');
  const pageSize = 50;
  const debouncedKeyword = useDebouncedValue(keyword, 400);
  const debouncedAuditModule = useDebouncedValue(auditModule, 400);

  const loadLoginLogs = async (page = loginPage, searchKeyword = debouncedKeyword, resultFilter = loginResult) => {
    setLoading(true);
    try {
      const response = await logApi.getLoginLogs({
        keyword: searchKeyword,
        success: resultFilter === 'all' ? undefined : resultFilter === 'success',
        page,
        limit: pageSize,
      });
      if (response.success) {
        setLoginLogs(response.data?.logs || []);
        setLoginTotal(response.pagination?.total || response.data?.total || 0);
      } else {
        toast.error(response.message || '加载登录日志失败');
      }
    } catch (error: any) {
      toast.error(error?.message || '加载登录日志失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (page = auditPage, moduleKeyword = debouncedAuditModule, resultFilter = auditResult) => {
    setLoading(true);
    try {
      const response = await logApi.getAuditLogs({
        module: moduleKeyword || undefined,
        result: resultFilter === 'all' ? undefined : resultFilter,
        page,
        limit: pageSize,
      });
      if (response.success) {
        setAuditLogs(response.data?.logs || []);
        setAuditTotal(response.data?.pagination?.total || 0);
      } else {
        toast.error(response.message || '加载操作日志失败');
      }
    } catch (error: any) {
      toast.error(error?.message || '加载操作日志失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAutomationLogs = async (page = automationPage) => {
    setLoading(true);
    try {
      const response = await logApi.getAutomationLogs({ page, limit: pageSize });
      if (response.success) {
        setAutomationLogs(response.data || []);
        setAutomationTotal(response.pagination?.total || 0);
      } else {
        toast.error(response.message || '加载催办记录失败');
      }
    } catch (error: any) {
      toast.error(error?.message || '加载催办记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoginPage(1);
    loadLoginLogs(1, debouncedKeyword, loginResult);
  }, [debouncedKeyword, loginResult]);

  useEffect(() => {
    setAuditPage(1);
    loadAuditLogs(1, debouncedAuditModule, auditResult);
  }, [debouncedAuditModule, auditResult]);

  useEffect(() => {
    loadAutomationLogs(1);
  }, []);

  const loginStats = useMemo(() => {
    const successCount = loginLogs.filter((log) => log.success).length;
    return {
      total: loginTotal,
      success: successCount,
      failed: loginLogs.length - successCount,
    };
  }, [loginLogs, loginTotal]);

  const refresh = () => {
    loadLoginLogs(loginPage);
    loadAuditLogs(auditPage);
    loadAutomationLogs(automationPage);
  };

  const applyLoginFilters = () => {
    setLoginPage(1);
    loadLoginLogs(1, keyword, loginResult);
  };

  const applyAuditFilters = () => {
    setAuditPage(1);
    loadAuditLogs(1, auditModule, auditResult);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">日志管理</h1>
          <p className="mt-1 text-gray-500">重点查看登录日志，同时保留系统操作审计，方便追溯谁在什么时候做了什么。</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">登录日志总数</p>
                <p className="text-3xl font-bold">{loginStats.total}</p>
              </div>
              <Activity className="w-9 h-9 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">当前页成功登录</p>
                <p className="text-3xl font-bold text-emerald-600">{loginStats.success}</p>
              </div>
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">当前页失败登录</p>
                <p className="text-3xl font-bold text-red-500">{loginStats.failed}</p>
              </div>
              <ShieldAlert className="w-9 h-9 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="login" className="space-y-4">
        <TabsList>
          <TabsTrigger value="login" className="px-4">
            登录日志
          </TabsTrigger>
          <TabsTrigger value="audit" className="px-4">
            操作审计
          </TabsTrigger>
          <TabsTrigger value="automation" className="px-4">
            催办记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                登录日志
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') applyLoginFilters();
                    }}
                    placeholder="搜索姓名、工号、部门或登录IP"
                    className="pl-9"
                  />
                </div>
                <Select value={loginResult} onValueChange={(value: any) => setLoginResult(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部结果</SelectItem>
                    <SelectItem value="success">仅成功</SelectItem>
                    <SelectItem value="failed">仅失败</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={applyLoginFilters} disabled={loading}>查询</Button>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>登录时间</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>方式</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>浏览器</TableHead>
                      <TableHead>结果</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatTime(log.loginTime)}</TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{log.employeeName || '-'}</div>
                          <div className="text-xs text-gray-500">{log.employeeId}</div>
                        </TableCell>
                        <TableCell>{roleLabels[log.role] || log.role || '-'}</TableCell>
                        <TableCell>{[log.department, log.subDepartment].filter(Boolean).join(' / ') || '-'}</TableCell>
                        <TableCell>姓名/工号 + 身份证后六位</TableCell>
                        <TableCell>{log.loginIp || '-'}</TableCell>
                        <TableCell>{browserSummary(log.userAgent)}</TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge className="bg-emerald-100 text-emerald-700">成功</Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3" />
                              {log.failureReason || '失败'}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!loading && loginLogs.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-500">暂无登录日志。</div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>共 {loginTotal} 条，每页 {pageSize} 条</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={loginPage <= 1 || loading}
                    onClick={() => {
                      const next = loginPage - 1;
                      setLoginPage(next);
                      loadLoginLogs(next);
                    }}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    disabled={loginPage * pageSize >= loginTotal || loading}
                    onClick={() => {
                      const next = loginPage + 1;
                      setLoginPage(next);
                      loadLoginLogs(next);
                    }}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">操作审计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[220px_180px_auto]">
                <Input
                  value={auditModule}
                  onChange={(event) => setAuditModule(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyAuditFilters();
                  }}
                  placeholder="按模块过滤，如 auth"
                />
                <Select value={auditResult} onValueChange={(value: any) => setAuditResult(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部结果</SelectItem>
                    <SelectItem value="SUCCESS">成功</SelectItem>
                    <SelectItem value="FAILED">失败</SelectItem>
                    <SelectItem value="UNAUTHORIZED">无权限</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={applyAuditFilters} disabled={loading}>查询</Button>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>时间</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>动作</TableHead>
                      <TableHead>模块</TableHead>
                      <TableHead>请求</TableHead>
                      <TableHead>说明</TableHead>
                      <TableHead>结果</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatTime(log.created_at)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{log.user_name || '未知用户'}</div>
                          <div className="text-xs text-gray-500">{log.user_id || '-'}</div>
                        </TableCell>
                        <TableCell>{actionLabels[log.action] || log.action}</TableCell>
                        <TableCell>{log.module}</TableCell>
                        <TableCell>
                          <div>{log.request_method || '-'}</div>
                          <div className="max-w-xs truncate text-xs text-gray-500">{log.request_url || '-'}</div>
                        </TableCell>
                        <TableCell className="max-w-sm truncate">{log.description || log.error_message || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.result === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-700'
                                : log.result === 'UNAUTHORIZED'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }
                          >
                            {log.result || '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!loading && auditLogs.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-500">暂无操作审计日志。</div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>共 {auditTotal} 条，每页 {pageSize} 条</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={auditPage <= 1 || loading}
                    onClick={() => {
                      const next = auditPage - 1;
                      setAuditPage(next);
                      loadAuditLogs(next);
                    }}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    disabled={auditPage * pageSize >= auditTotal || loading}
                    onClick={() => {
                      const next = auditPage + 1;
                      setAuditPage(next);
                      loadAuditLogs(next);
                    }}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BellRing className="w-5 h-5 text-amber-600" />
                催办发送记录
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                这里记录每次系统催办的发送对象：员工待提交、经理待评分、部门进度推送都会保存接收人、企业微信ID、发送结果和失败原因。历史旧日志可能只有数量，没有明细。
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>执行时间</TableHead>
                      <TableHead>任务/月度</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>耗时</TableHead>
                      <TableHead>发送摘要</TableHead>
                      <TableHead>接收人明细</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {automationLogs.map((log) => {
                      const recipients = getReminderRecipients(log);
                      const sentCount = recipients.filter((recipient) => recipient.sent).length;
                      const failedCount = recipients.filter((recipient) => !recipient.sent).length;
                      return (
                        <TableRow key={log.id}>
                          <TableCell>{formatTime(log.executed_at)}</TableCell>
                          <TableCell>
                            <div className="font-medium">{log.task_type || log.job_type || '-'}</div>
                            <div className="text-xs text-gray-500">{log.month || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                log.status === 'success'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : log.status === 'skipped'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-red-100 text-red-700'
                              }
                            >
                              {log.status || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>{typeof log.duration_ms === 'number' ? `${log.duration_ms}ms` : '-'}</TableCell>
                          <TableCell className="min-w-[280px] text-sm text-gray-700">{getReminderSummary(log)}</TableCell>
                          <TableCell className="min-w-[360px]">
                            {recipients.length > 0 ? (
                              <details>
                                <summary className="cursor-pointer text-sm text-blue-600">
                                  {recipients.length} 个对象（已发 {sentCount}，未发 {failedCount}）
                                </summary>
                                <div className="mt-2 flex max-w-xl flex-wrap gap-2">
                                  {recipients.map((recipient, index) => (
                                    <Badge
                                      key={`${recipient.taskType}-${recipient.employeeId}-${index}`}
                                      className={recipient.sent ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}
                                      title={[
                                        recipient.wecomUserId ? `企微：${recipient.wecomUserId}` : '',
                                        recipient.reason ? `原因：${recipient.reason}` : '',
                                        recipient.pendingEmployees?.length
                                          ? `待处理：${recipient.pendingEmployees.map((item) => item.employeeName).join('、')}`
                                          : '',
                                      ].filter(Boolean).join('\n')}
                                    >
                                      {recipient.employeeName || recipient.employeeId || '未知'}
                                      {recipient.taskType ? ` · ${recipient.taskType}` : ''}
                                      {recipient.sent ? ' · 已发' : ` · ${recipient.reason || '未发'}`}
                                    </Badge>
                                  ))}
                                </div>
                              </details>
                            ) : (
                              <span className="text-sm text-gray-500">暂无明细（旧日志仅保留数量）</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {!loading && automationLogs.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-500">暂无催办/自动化日志。</div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>共 {automationTotal} 条，每页 {pageSize} 条</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={automationPage <= 1 || loading}
                    onClick={() => {
                      const next = automationPage - 1;
                      setAutomationPage(next);
                      loadAutomationLogs(next);
                    }}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    disabled={automationPage * pageSize >= automationTotal || loading}
                    onClick={() => {
                      const next = automationPage + 1;
                      setAutomationPage(next);
                      loadAutomationLogs(next);
                    }}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
