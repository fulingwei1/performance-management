/**
 * 目标管理 API 服务
 * 包含目标设置、确认、进度追踪等功能
 */

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

// 目标类型定义
export interface QuarterlyTarget {
  quarter: number;
  target: number;
}

export interface MonthlyTargets {
  [month: string]: number; // "1": 800000, "2": 800000, ...
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  level: 'strategic' | 'department' | 'individual';
  parentId?: string;
  strategicObjectiveId?: string;
  department: string;
  ownerId: string;
  ownerName?: string;
  year: number;
  quarter?: number;
  weight: number;
  progress: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  feedbackCycle?: string;
  targetValue?: number;
  quarterlyTargets?: QuarterlyTarget[];
  monthlyTargets?: MonthlyTargets;
  employeeConfirmedAt?: string;
  employeeFeedback?: string;
  createdAt?: string;
  updatedAt?: string;
  keyResults?: any[];
  children?: Objective[];
}

export interface GoalProgress {
  id: string;
  objectiveId: string;
  employeeId: string;
  year: number;
  month: number;
  employeeCompletionRate?: number;
  employeeComment?: string;
  employeeSubmittedAt?: string;
  managerCompletionRate?: number;
  managerComment?: string;
  managerReviewedAt?: string;
  managerId?: string;
  status: 'draft' | 'employee_submitted' | 'manager_reviewed';
  createdAt?: string;
  updatedAt?: string;
}

// 目标管理 API
export const goalApi = {
  // 获取所有目标
  getAll: (params?: { year?: number; level?: string; ownerId?: string; department?: string }) => {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request(`/objectives${query}`);
  },

  // 获取目标树（年度视图）
  getTree: (year: number) => {
    return request(`/objectives/tree?year=${year}`);
  },

  // 获取单个目标
  getById: (id: string) => {
    return request(`/objectives/${id}`);
  },

  // 创建目标
  create: (data: {
    title: string;
    description: string;
    level: 'strategic' | 'department' | 'individual';
    department: string;
    ownerId: string;
    year: number;
    weight: number;
    targetValue?: number;
    quarterlyTargets?: QuarterlyTarget[];
    monthlyTargets?: MonthlyTargets;
    status?: string;
    parentId?: string;
    strategicObjectiveId?: string;
  }) => {
    return request('/objectives', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 更新目标
  update: (id: string, data: Partial<Objective>) => {
    return request(`/objectives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除目标
  delete: (id: string) => {
    return request(`/objectives/${id}`, {
      method: 'DELETE'
    });
  },

  // 更新目标进度
  updateProgress: (id: string, progress: number) => {
    return request(`/objectives/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress })
    });
  },

  // 员工确认目标
  confirm: (id: string, feedback?: string) => {
    return request(`/objectives/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ feedback })
    });
  },

  // 验证权重
  validateWeights: (objectives: { weight: number }[]) => {
    return request('/objectives/validate-weights', {
      method: 'POST',
      body: JSON.stringify({ objectives })
    });
  },

  // 添加关键结果
  addKeyResult: (objectiveId: string, data: {
    title: string;
    metricType?: string;
    targetValue?: number;
    unit?: string;
    weight?: number;
    dueDate?: string;
  }) => {
    return request(`/objectives/${objectiveId}/key-results`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
};

// 目标进度 API
export const goalProgressApi = {
  // 获取所有进度
  getAll: (params?: { employeeId?: string; objectiveId?: string; year?: number; month?: number }) => {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request(`/goal-progress${query}`);
  },

  // 获取单个进度
  getById: (id: string) => {
    return request(`/goal-progress/${id}`);
  },

  // 获取特定目标的特定月份进度
  getByObjectiveAndMonth: (objectiveId: string, year: number, month: number) => {
    return request(`/goal-progress/objective/${objectiveId}/year/${year}/month/${month}`);
  },

  // 获取员工某月的所有目标进度
  getEmployeeMonthlyProgress: (employeeId: string, year: number, month: number) => {
    return request(`/goal-progress/employee/${employeeId}/year/${year}/month/${month}`);
  },

  // 员工提交目标完成度
  submitEmployee: (data: {
    objectiveId: string;
    year: number;
    month: number;
    completionRate: number;
    comment?: string;
  }) => {
    return request('/goal-progress/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 经理审核目标完成度
  reviewManager: (id: string, data: {
    completionRate: number;
    comment?: string;
  }) => {
    return request(`/goal-progress/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除进度
  delete: (id: string) => {
    return request(`/goal-progress/${id}`, {
      method: 'DELETE'
    });
  },
};
