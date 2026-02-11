// OKR/KPI API服务
const isProd = import.meta.env.PROD;
let API_BASE_URL = import.meta.env.VITE_API_URL;

if (isProd && API_BASE_URL && API_BASE_URL.includes('localhost')) {
  API_BASE_URL = '/api';
}
if (!API_BASE_URL) {
  API_BASE_URL = isProd ? '/api' : 'http://localhost:3001/api';
}

const getToken = () => localStorage.getItem('token');

const request = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message ?? data.error ?? '请求失败');
    }
    return data;
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
};

// 战略目标
export const strategicObjectiveApi = {
  getAll: () => request('/okr/strategic-objectives'),
  create: (data: { title: string; description: string; year: number; priority: number }) =>
    request('/okr/strategic-objectives', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ title: string; description: string; status: string; progress: number }>) =>
    request(`/okr/strategic-objectives/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/okr/strategic-objectives/${id}`, { method: 'DELETE' }),
};

// OKR目标
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
