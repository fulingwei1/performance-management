import { API_BASE_URL } from '@/lib/api-config';

// API服务 - 连接后端

// 获取Token
const getToken = () => localStorage.getItem('token');

const clearAuthState = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('auth-storage');
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;

  const base = (import.meta as any).env.BASE_URL.replace(/\/+$/, '') || '';
  const loginPath = `${base}/login`;
  if (window.location.pathname !== loginPath) {
    window.location.replace(loginPath);
  }
};

const readErrorPayload = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}));
  }

  const text = await response.text().catch(() => '');
  return text ? { message: text } : {};
};

const handleUnauthorized = (message?: string) => {
  clearAuthState();
  redirectToLogin();
  throw new Error(message || '登录已过期，请重新登录');
};

// 安全下载：通过 Authorization header 传递 token，避免 URL 泄露
const secureDownload = async (url: string, filename: string) => {
  const token = getToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const errorData = await readErrorPayload(res);
    const message = errorData.message ?? errorData.error ?? '下载失败';
    if (res.status === 401) {
      handleUnauthorized(message);
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
};

// 通用请求函数
export const request = async (url: string, options: ApiRequestOptions = {}) => {
  const { timeoutMs: requestTimeoutMs, ...fetchOptions } = options;
  const token = getToken();
  const isFormDataBody = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
  const headers: Record<string, string> = {
    ...fetchOptions.headers as Record<string, string>
  };

  if (!isFormDataBody) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = (fetchOptions.method || 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? 2 : 1;
  const timeoutMs = Number(requestTimeoutMs || (import.meta as any).env.VITE_API_TIMEOUT_MS || 15000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...fetchOptions,
        headers,
        signal: fetchOptions.signal || controller.signal
      });

      window.clearTimeout(timeoutId);
      const data = await readErrorPayload(response);

      if (!response.ok) {
        const message = data.message ?? data.error ?? '请求失败';
        if (response.status === 401 && url !== '/auth/login') {
          handleUnauthorized(message);
        }
        throw new Error(message);
      }

      return data;
    } catch (error: any) {
      window.clearTimeout(timeoutId);
      const isAbort = error?.name === 'AbortError';
      if (attempt < maxAttempts && method === 'GET' && !isAbort) {
        continue;
      }
      console.error('API请求错误:', error);
      if (isAbort) {
        throw new Error('请求超时，请稍后重试');
      }
      throw error;
    }
  }

  throw new Error('请求失败');
};

// 认证相关API
export const authApi = {
  // 登录
  login: (username: string, idCardLast6: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, idCardLast6: (idCardLast6 || '').trim() })
    }),

  // 获取当前用户
  getCurrentUser: () => request('/auth/me')
};

// 员工相关API
export const employeeApi = {
  // 获取所有员工
  getAll: (options?: { includeDisabled?: boolean }) => {
    const query = options?.includeDisabled ? '?includeDisabled=true' : '';
    return request(`/employees${query}`);
  },

  // 获取下属
  getSubordinates: () => request('/employees/subordinates'),

  // 获取当前用户/经理的绩效参与状态
  getAssessmentParticipation: () => request('/employees/assessment-participation'),

  // 根据ID获取员工
  getById: (id: string) => request(`/employees/${id}`),

  // 更新员工
  updateEmployee: (id: string, data: Record<string, unknown>) => request(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};

// 绩效相关API
export const performanceApi = {
  // 获取我的绩效记录
  getMyRecords: () => request('/performance/my-records'),

  // 获取我的某月绩效记录
  getMyRecordByMonth: (month: string) => request(`/performance/my-record/${month}`),

  // 获取团队绩效记录（经理）
  // month: 指定月份; months: 最近N个月; 都不传返回全部
  getTeamRecords: (month?: string, months?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (months) params.append('months', months.toString());
    const query = params.toString();
    return request(`/performance/team-records${query ? `?${query}` : ''}`);
  },

  // 获取某月份全部绩效记录（总经理/HR）
  getRecordsByMonth: (month: string) => request(`/performance/month/${month}`),

  // 获取全公司所有记录（总经理/HR）
  getAllRecords: (months?: number, month?: string) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (months && !month) params.append('months', months.toString());
    const query = params.toString();
    return request(`/performance/all-records${query ? `?${query}` : ''}`);
  },

  // 获取某月每月之星推荐汇总
  getMonthlyStars: (month: string) => request(`/performance/monthly-stars/${month}`),

  // 获取合理化建议汇总
  getImprovementSuggestions: (params?: { month?: string; scope?: 'team' | 'all' }) =>
    request(`/performance/improvement-suggestions${buildQueryString(params as Record<string, QueryValue> | undefined)}`),

  // 演示数据状态（看板提示用）
  generateDemoData: () => request('/performance/demo-data/generate', { method: 'POST' }),
  clearDemoData: () => request('/performance/demo-data', { method: 'DELETE' }),
  getDemoDataStatus: () => request('/performance/demo-data/status'),

  // HR批量生成绩效任务
  generateTasks: (month: string) => request('/performance/generate-tasks', {
    method: 'POST',
    body: JSON.stringify({ month })
  }),

  // 获取月度统计数据（用于导出）
  getStatsByMonth: (month: string) => request(`/performance/stats/${month}`),

  // 删除某个月的所有绩效记录（HR）
  deleteRecordsByMonth: (month: string, payload: { confirm: string; force?: boolean }) =>
    request(`/performance/month/${month}`, {
      method: 'DELETE',
      body: JSON.stringify(payload)
    }),

  // 删除全部绩效记录（HR）
  deleteAllRecords: (payload: { confirm: string; force?: boolean }) =>
    request('/performance/all-records', {
      method: 'DELETE',
      body: JSON.stringify(payload)
    }),

  // 提交工作总结
  submitSummary: (data: {
    month: string;
    selfSummary: string;
    nextMonthPlan: string;
    employeeIssueTags?: string[];
    resourceNeedTags?: string[];
    improvementSuggestion?: string;
    suggestionAnonymous?: boolean;
  }) =>
    request('/performance/summary', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // 创建空记录（经理给未提交的员工评分时使用）
  createEmptyRecord: (data: { employeeId: string; month: string }) =>
    request('/performance/create-empty-record', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // 经理/组长反馈员工离职或本期不参与绩效
  reportNonParticipation: (data: { employeeId: string; month: string; reason?: string }) =>
    request('/performance/nonparticipation-report', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // 获取绩效记录对应的评分模板（用于动态渲染评分表单）
  getRecordTemplate: (id: string) => request(`/performance/${id}/template`),

  // 根据ID获取绩效记录
  getRecordById: (id: string) => request(`/performance/${id}`),

  // 上传2-7-1末位绩效面谈表
  uploadInterviewForm: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/performance/${id}/interview-form`, {
      method: 'POST',
      body: formData
    });
  },

  // 经理评分
  submitScore: (data: {
    id: string;
    taskCompletion?: number;
    initiative?: number;
    projectFeedback?: number;
    qualityImprovement?: number;
    managerComment: string;
    nextMonthWorkArrangement: string;
    evaluationKeywords?: string[];
    issueTypeTags?: string[];
    highlightTags?: string[];
    workTypeTags?: string[];
    improvementActionTags?: string[];
    issueAttributionTags?: string[];
    workloadTags?: string[];
    managerSuggestionTags?: string[];
    scoreEvidence?: string;
    monthlyStarRecommended?: boolean;
    monthlyStarCategory?: string;
    monthlyStarReason?: string;
    monthlyStarPublic?: boolean;
    expectedUpdatedAt?: string;
    // 动态模板评分
    templateId?: string;
    templateName?: string;
    departmentType?: string;
    metricScores?: Array<{
      metricId: string;
      metricName: string;
      metricCode: string;
      weight: number;
      score: number;
      level: string;
      comment?: string;
    }>;
  }) => request('/performance/score', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // 获取员工绩效历史
  getEmployeeHistory: (employeeId: string) => request(`/monthly-assessment/employee/${employeeId}`)
};

export const analyticsApi = {
  getReportSummary: (month: string) =>
    request(`/analytics/report-summary?month=${encodeURIComponent(month)}`),
};

export const assessmentTemplateApi = {
  getAll: (params?: { departmentType?: string; includeMetrics?: boolean; status?: string }) =>
    request(`/assessment-templates${buildQueryString(params as Record<string, QueryValue> | undefined)}`),
  getById: (id: string) => request(`/assessment-templates/${id}`),
  getDefault: (departmentType: string) => request(`/assessment-templates/default/${departmentType}`),
  create: (data: Record<string, unknown>) => request('/assessment-templates', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Record<string, unknown>) => request(`/assessment-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request(`/assessment-templates/${id}`, { method: 'DELETE' }),
  // 匹配模板
  match: (params?: { role?: string; level?: string; position?: string; department?: string; subDepartment?: string }) =>
    request(`/assessment-templates/match${buildQueryString(params as Record<string, QueryValue> | undefined)}`),
  // 预览分配
  previewAssignments: (data?: { employeeIds?: string[] }) =>
    request('/assessment-templates/preview-assignments', {
      method: 'POST',
      body: JSON.stringify(data || {})
    })
};

// 绩效参与范围/排名配置（HR/Admin）
export const performanceConfigApi = {
  getRankingConfig: () => request('/performance-config/ranking'),
  updateRankingConfig: (config: Record<string, unknown>) =>
    request('/performance-config/ranking', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  previewRanking: (month: string) =>
    request(`/performance-config/ranking/preview?month=${encodeURIComponent(month)}`),
  recalculateMonthRanks: (month: string) =>
    request('/performance-config/ranking/recalculate', {
      method: 'POST',
      body: JSON.stringify({ month }),
    }),
};

export const employeeQuarterlyApi = {
  getMy: (params?: { year?: number; quarter?: number }) =>
    request(`/employee-quarterly/my${buildQueryString(params as Record<string, QueryValue> | undefined)}`),
  getTeam: (params: { year: number; quarter: number }) =>
    request(`/employee-quarterly/team${buildQueryString(params as Record<string, QueryValue>)}`),
};

export const exportApi = {
  // 考核数据导出
  exportMonthlyAssessments: (params: URLSearchParams) =>
    secureDownload(`${API_BASE_URL}/assessment-export/monthly-assessments?${params.toString()}`, `月度绩效考核数据_${Date.now()}.xlsx`),

  exportDepartmentStats: () =>
    secureDownload(`${API_BASE_URL}/assessment-export/department-stats`, `部门类型统计_${Date.now()}.xlsx`),

  exportScoreTrend: (employeeId: string) =>
    secureDownload(`${API_BASE_URL}/assessment-export/score-trend/${employeeId}`, `评分趋势_${employeeId}_${Date.now()}.xlsx`),
};

export const salaryIntegrationApi = {
  getQuarterlyCoefficients: (year: number, quarter: number) =>
    request(`/integrations/salary/quarterly-coefficients?year=${encodeURIComponent(String(year))}&quarter=${encodeURIComponent(String(quarter))}`),

  exportQuarterlyCoefficients: (year: number, quarter: number) =>
    secureDownload(
      `${API_BASE_URL}/integrations/salary/quarterly-coefficients/export?year=${encodeURIComponent(String(year))}&quarter=${encodeURIComponent(String(quarter))}`,
      `季度绩效系数_${year}-Q${quarter}_${Date.now()}.xlsx`
    ),

  pushResults: (data: {
    periodType: 'monthly' | 'quarterly';
    year: number;
    month?: number;
    quarter?: number;
    confirmedByAdmin?: boolean;
  }) => request('/integrations/salary/push', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  pushMonthly: (year: number, month: number) => request('/integrations/salary/push-monthly', {
    method: 'POST',
    body: JSON.stringify({ year, month, confirmedByAdmin: true }),
  }),

  pushQuarterly: (year: number, quarter: number) => request('/integrations/salary/push-quarterly', {
    method: 'POST',
    body: JSON.stringify({ year, quarter, confirmedByAdmin: true }),
  }),
};

type QueryValue = string | number | boolean | undefined | null;

const buildQueryString = (params?: Record<string, QueryValue>) => {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const search = query.toString();
  return search ? `?${search}` : '';
};

// 日志管理 API
export const logApi = {
  getLoginLogs: (params?: {
    keyword?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    success?: boolean;
    page?: number;
    limit?: number;
  }) => request(`/auth/login-logs${buildQueryString(params as Record<string, QueryValue> | undefined)}`),

  getAuditLogs: (params?: {
    user_id?: string;
    action?: string;
    module?: string;
    target_type?: string;
    result?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }) => request(`/audit-logs${buildQueryString(params as Record<string, QueryValue> | undefined)}`),

  getAutomationLogs: (params?: {
    page?: number;
    limit?: number;
  }) => request(`/automation/logs${buildQueryString(params as Record<string, QueryValue> | undefined)}`),
};

// 考核结果发布相关API
export const assessmentPublicationApi = {
  // 发布某月考核结果（HR/Admin）
  publish: (month: string, options?: { forceDistribution?: boolean; forceReason?: string }) =>
    request('/assessment-publications/publish', {
      method: 'POST',
      body: JSON.stringify({ month, ...(options || {}) })
    }),

  // 取消发布（仅测试环境）
  unpublish: (month: string) =>
    request(`/assessment-publications/${month}/unpublish`, {
      method: 'DELETE'
    }),

  // 检查某月是否已发布
  checkPublished: (month: string) =>
    request(`/assessment-publications/${month}/status`),

  // 获取所有已发布月份列表
  getAllPublished: () =>
    request('/assessment-publications/published')
};

export interface SatisfactionSurveyQuestion {
  key: string;
  label: string;
  description?: string;
}

export interface SatisfactionSurvey {
  id: string;
  year: number;
  half: 1 | 2;
  period: string;
  title: string;
  description: string;
  questions: SatisfactionSurveyQuestion[];
  status: 'draft' | 'open' | 'closed';
  startDate: string;
  endDate: string;
}

export interface SatisfactionSurveyResponse {
  id: string;
  surveyId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment: string;
  anonymous: boolean;
  scores: Record<string, number>;
  comment?: string;
  submittedAt: string;
}

export interface SatisfactionSurveyStats {
  survey: SatisfactionSurvey;
  responseCount: number;
  overallAverage: number | null;
  questionAverages: Array<SatisfactionSurveyQuestion & { average: number | null }>;
  departmentBreakdown: Array<{ department: string; responseCount: number; average: number | null }>;
  comments: Array<{ anonymous: boolean; employeeName?: string; department: string; comment: string; submittedAt: string }>;
}

export const satisfactionSurveyApi = {
  getCurrent: () => request('/satisfaction-surveys/current'),
  list: () => request('/satisfaction-surveys'),
  ensureCurrent: (payload?: { year?: number; half?: 1 | 2 }) =>
    request('/satisfaction-surveys/current/ensure', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    }),
  submitResponse: (surveyId: string, payload: { scores: Record<string, number>; comment?: string; anonymous?: boolean }) =>
    request(`/satisfaction-surveys/${surveyId}/responses`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getStats: (surveyId: string) => request(`/satisfaction-surveys/${surveyId}/stats`),
  open: (surveyId: string) => request(`/satisfaction-surveys/${surveyId}/open`, { method: 'POST' }),
  close: (surveyId: string) => request(`/satisfaction-surveys/${surveyId}/close`, { method: 'POST' }),
};

export default {
  auth: authApi,
  employee: employeeApi,
  performance: performanceApi,
  employeeQuarterly: employeeQuarterlyApi,
  assessmentTemplate: assessmentTemplateApi,
  assessmentPublication: assessmentPublicationApi,
  export: exportApi,
  satisfactionSurvey: satisfactionSurveyApi,
  log: logApi
};

// 待办事项API
export const todoApi = {
  getMyTodos: (status?: string) => request(`/todos/my${status ? `?status=${status}` : ''}`),
  getStatistics: () => request('/todos/statistics'),
  getSummary: () => request('/todos/summary'),
  markCompleted: (id: string) => request(`/todos/${id}/complete`, { method: 'PUT' }),
};

// 数据导入 API
export const dataImportApi = {
  getEmployeeTemplate: () => {
    return secureDownload(`${API_BASE_URL}/data-import/template/employees`, '员工导入模板.xlsx');
  },
  importEmployees: async (formData: FormData) => {
    return request('/data-import/employees', {
      method: 'POST',
      body: formData,
      timeoutMs: 300000,
    });
  },
  importHrArchive: async (formData: FormData) => {
    return request('/data-import/hr-archive', {
      method: 'POST',
      body: formData,
      timeoutMs: 300000,
    });
  },
};
