import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, ClipboardList, RefreshCcw, Search, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const roleLabels: Record<string, string> = {
  employee: '员工',
  manager: '部门经理',
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

export default function LogManagement() {
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginTotal, setLoginTotal] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loginPage, setLoginPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loginResult, setLoginResult] = useState<'all' | 'success' | 'failed'>('all');
  const [auditResult, setAuditResult] = useState<'all' | 'SUCCESS' | 'FAILED' | 'UNAUTHORIZED'>('all');
  const [auditModule, setAuditModule] = useState('');
  const pageSize = 50;

  const loadLoginLogs = async (page = loginPage) => {
    setLoading(true);
    try {
      const response = await logApi.getLoginLogs({
        keyword,
        success: loginResult === 'all' ? undefined : loginResult === 'success',
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

  const loadAuditLogs = async (page = auditPage) => {
    setLoading(true);
    try {
      const response = await logApi.getAuditLogs({
        module: auditModule || undefined,
        result: auditResult === 'all' ? undefined : auditResult,
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

  useEffect(() => {
    loadLoginLogs(1);
    loadAuditLogs(1);
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
  };

  const applyLoginFilters = () => {
    setLoginPage(1);
    loadLoginLogs(1);
  };

  const applyAuditFilters = () => {
    setAuditPage(1);
    loadAuditLogs(1);
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
                        <TableCell>{log.loginMethod === 'idCard' ? '姓名+身份证后六位' : '密码'}</TableCell>
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
      </Tabs>
    </motion.div>
  );
}
