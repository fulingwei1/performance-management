// OKR/KPI API服务 — 统一使用 api.ts 的 request 函数
import { request } from '@/services/api';

// OKR 专属的战略目标（路径前缀 /okr/，区别于 api.ts 的 /strategic-objectives）
export const okrStrategicObjectiveApi = {
  getAll: () => request('/okr/strategic-objectives'),
  create: (data: { title: string; description: string; year: number; priority: number }) =>
    request('/okr/strategic-objectives', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ title: string; description: string; status: string; progress: number }>) =>
    request(`/okr/strategic-objectives/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/okr/strategic-objectives/${id}`, { method: 'DELETE' }),
};

// OKR目标（注意：api.ts 也有 objectiveApi 指向 /objectives，本文件指向 /okr/objectives）
export const objectiveApi = {
  getAll: (params?: { level?: string; parentId?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request(`/okr/objectives${query}`);
  },
  getMy: () => request('/okr/objectives/my'),
  getTree: () => request('/okr/objectives/tree'),
  create: (data: {
    title: string; description?: string; level: 'company' | 'department' | 'personal';
    parentId?: string; strategicObjectiveId?: string; ownerId?: string;
    startDate?: string; endDate?: string; feedbackCycle?: string;
  }) => request('/okr/objectives', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ title: string; description: string; status: string; progress: number; startDate: string; endDate: string; feedbackCycle: string }>) =>
    request(`/okr/objectives/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getRelated: () => request('/okr/objectives/related'),
  getFeedbacks: (id: string) => request(`/okr/objectives/${id}/feedbacks`),
  delete: (id: string) =>
    request(`/okr/objectives/${id}`, { method: 'DELETE' }),
};

// Key Results
export const krApi = {
  getByObjective: (objectiveId: string) => request(`/okr/objectives/${objectiveId}/krs`),
  create: (objectiveId: string, data: {
    title: string; targetValue: number; unit: string; weight: number;
  }) => request(`/okr/objectives/${objectiveId}/krs`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ currentValue: number; status: string }>) =>
    request(`/okr/krs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/okr/krs/${id}`, { method: 'DELETE' }),
};

// KPI
export const kpiApi = {
  getMy: () => request('/okr/kpis/my'),
  getByEmployee: (employeeId: string) => request(`/okr/kpis/employee/${employeeId}`),
  getByDepartment: (department: string) => request(`/okr/kpis/department/${department}`),
  create: (data: {
    name: string; targetValue: number; unit: string; weight: number;
    employeeId: string; krId?: string; period: string;
  }) => request('/okr/kpis', { method: 'POST', body: JSON.stringify(data) }),
  updateActual: (id: string, actualValue: number) =>
    request(`/okr/kpis/${id}/actual`, { method: 'PUT', body: JSON.stringify({ actualValue }) }),
  delete: (id: string) =>
    request(`/okr/kpis/${id}`, { method: 'DELETE' }),
};

// 绩效合约
export const contractApi = {
  getMy: () => request('/okr/contracts/my'),
  getAll: () => request('/okr/contracts'),
  getById: (id: string) => request(`/okr/contracts/${id}`),
  create: (data: {
    employeeId: string; period: string; kpiIds: string[]; objectives: string[];
  }) => request('/okr/contracts', { method: 'POST', body: JSON.stringify(data) }),
  sign: (id: string) =>
    request(`/okr/contracts/${id}/sign`, { method: 'POST' }),
  approve: (id: string) =>
    request(`/okr/contracts/${id}/approve`, { method: 'POST' }),
};

// 月度汇报
export const monthlyReportApi = {
  getMy: () => request('/okr/monthly-reports/my'),
  getByEmployee: (employeeId: string) => request(`/okr/monthly-reports/employee/${employeeId}`),
  getTeam: () => request('/okr/monthly-reports/team'),
  create: (data: {
    month: string; summary: string; achievements: string[];
    challenges: string; nextPlan: string; krProgress?: { krId: string; progress: number }[];
  }) => request('/okr/monthly-reports', { method: 'POST', body: JSON.stringify(data) }),
  review: (id: string, data: { comment: string; rating: number }) =>
    request(`/okr/monthly-reports/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
};

// OKR Assignments (分配拆解)
export const assignmentApi = {
  assign: (objectiveId: string, data: { assigneeId: string; deadline?: string; message?: string }) =>
    request(`/okr/objectives/${objectiveId}/assign`, { method: 'POST', body: JSON.stringify(data) }),
  getMy: () => request('/okr/assignments/my'),
  complete: (id: string) =>
    request(`/okr/assignments/${id}/complete`, { method: 'PUT' }),
};

// 附件管理
export const attachmentApi = {
  upload: async (file: File, relatedType: string, relatedId: string) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('relatedType', relatedType);
    formData.append('relatedId', relatedId);
    // attachment upload 需要 multipart，不能用统一的 JSON request
    const { API_BASE_URL } = await import('@/lib/api-config');
    const response = await fetch(`${API_BASE_URL}/attachments/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
        window.location.replace('/login');
        throw new Error('登录已过期，请重新登录');
      }
      throw new Error(data.message ?? data.error ?? '上传失败');
    }
    return response.json();
  },
  getByRelated: (relatedType: string, relatedId: string) =>
    request(`/attachments/${relatedType}/${relatedId}`),
  delete: (id: string) =>
    request(`/attachments/${id}`, { method: 'DELETE' }),
};

// 奖金管理
export const bonusApi = {
  getConfig: () => request('/bonus/config'),
  updateConfig: (rules: any[]) =>
    request('/bonus/config', { method: 'PUT', body: JSON.stringify({ rules }) }),
  calculate: (data: { year: number; quarter: number }) =>
    request('/bonus/calculate', { method: 'POST', body: JSON.stringify(data) }),
  getResults: (params?: { year?: number; quarter?: number }) => {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request(`/bonus/results${query}`);
  },
  updateResult: (id: string, data: { bonus?: number; baseSalary?: number }) =>
    request(`/bonus/results/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// 部门管理
export const departmentApi = {
  getTree: () => request('/departments/tree'),
  create: (data: { name: string; parentId?: string; managerId?: string; code?: string }) =>
    request('/departments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; parentId: string; code: string }>) =>
    request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/departments/${id}`, { method: 'DELETE' }),
  getMembers: (id: string) => request(`/departments/${id}/members`),
  setManager: (id: string, managerId: string) =>
    request(`/departments/${id}/manager`, { method: 'PUT', body: JSON.stringify({ managerId }) }),
};

// 绩效面谈
export const interviewApi = {
  getMy: () => request('/okr/interviews/my'),
  getTeam: () => request('/okr/interviews/team'),
  create: (data: {
    employeeId: string; scheduledAt: string; type: 'monthly' | 'quarterly' | 'annual';
    topics?: string[];
  }) => request('/okr/interviews', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{
    summary: string; actionItems: string[]; status: string; completedAt: string;
  }>) => request(`/okr/interviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
