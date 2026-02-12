// API服务 - 连接后端
const isProd = import.meta.env.PROD;
let API_BASE_URL = import.meta.env.VITE_API_URL;

// 智能修正：如果是生产环境但配置了 localhost，强制回退到 /api (走代理)
if (isProd && API_BASE_URL && API_BASE_URL.includes('localhost')) {
  console.warn('Production build detected localhost API URL, falling back to /api proxy');
  API_BASE_URL = '/api';
}

// 默认值
if (!API_BASE_URL) {
  API_BASE_URL = isProd ? '/api' : 'http://localhost:3001/api';
}

// 获取Token
const getToken = () => localStorage.getItem('token');

// 安全下载：通过 Authorization header 传递 token，避免 URL 泄露
const secureDownload = async (url: string, filename: string) => {
  const token = getToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: '下载失败' }));
    throw new Error(errorData.message || '下载失败');
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

// 通用请求函数
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
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const message = data.message ?? data.error ?? '请求失败';
      throw new Error(message);
    }
    
    return data;
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
};

// 认证相关API
export const authApi = {
  // 登录
  login: (username: string, password: string, role: string) => 
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role })
    }),
  
  // 获取当前用户
  getCurrentUser: () => request('/auth/me'),
  
  // 修改密码
  changePassword: (oldPassword: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    })
};

// 员工相关API
export const employeeApi = {
  // 获取所有员工
  getAll: () => request('/employees'),
  
  // 获取所有经理
  getManagers: () => request('/employees/managers'),
  
  // 获取下属
  getSubordinates: () => request('/employees/subordinates'),
  
  // 根据ID获取员工
  getById: (id: string) => request(`/employees/${id}`),
  
  // 创建员工
  create: (data: any) => request('/employees', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      password: data.password || '123456' // 默认密码
    })
  }),
  
  // 更新员工
  updateEmployee: (id: string, data: any) => request(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // 删除员工
  deleteEmployee: (id: string) => request(`/employees/${id}`, {
    method: 'DELETE'
  }),

  // 重置密码
  resetPassword: (id: string) => request(`/employees/${id}/reset-password`, {
    method: 'PUT'
  }),

  // 启用/禁用用户
  toggleStatus: (id: string) => request(`/employees/${id}/toggle-status`, {
    method: 'PUT'
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
  getAllRecords: (months?: number) => {
    const query = months ? `?months=${months}` : '';
    return request(`/performance/all-records${query}`);
  },
  
  // 模拟数据管理
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
  submitSummary: (data: { month: string; selfSummary: string; nextMonthPlan: string }) =>
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
  
  // 经理评分
  submitScore: (data: {
    id: string;
    taskCompletion: number;
    initiative: number;
    projectFeedback: number;
    qualityImprovement: number;
    managerComment: string;
    nextMonthWorkArrangement: string;
  }) => request('/performance/score', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // 获取员工绩效历史
  getEmployeeHistory: (employeeId: string) => request(`/performance/employee/${employeeId}/history`)
};

// 经理季度总结API
export const quarterlySummaryApi = {
  save: (data: { quarter: string; summary: string; nextQuarterPlan: string; status: 'draft' | 'submitted' }) =>
    request('/quarterly-summaries', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMySummaries: (quarter?: string) => {
    const params = new URLSearchParams();
    if (quarter) params.append('quarter', quarter);
    const query = params.toString();
    return request(`/quarterly-summaries/my${query ? `?${query}` : ''}`);
  }
};

// HR管理API
export const hrApi = {
  // 获取所有员工
  getAllEmployees: () => request('/employees'),
  
  // 新增员工
  addEmployee: (data: {
    name: string;
    department: string;
    subDepartment?: string;
    role: string;
    level: string;
    managerId?: string;
  }) => request('/employees', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // 更新员工
  updateEmployee: (id: string, data: {
    name?: string;
    department?: string;
    subDepartment?: string;
    role?: string;
    level?: string;
    managerId?: string;
  }) => request(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // 删除员工
  deleteEmployee: (id: string) => request(`/employees/${id}`, {
    method: 'DELETE'
  }),
  
  // 批量导入员工
  importEmployees: (employees: any[]) => request('/employees/import', {
    method: 'POST',
    body: JSON.stringify({ employees })
  }),
  
  // 导出员工
  exportEmployees: () => secureDownload(`${API_BASE_URL}/employees/export`, 'employees.xlsx')
};

export const exportApi = {
  exportMonthlyPerformance: (month: string, options?: {
    format?: 'excel' | 'json';
    includeAnalysis?: boolean;
  }) => {
    const params = new URLSearchParams({
      month,
      format: options?.format || 'excel',
      includeAnalysis: String(options?.includeAnalysis ?? true)
    });
    return secureDownload(`${API_BASE_URL}/export/monthly-performance?${params.toString()}`, `performance-${month}.xlsx`);
  },

  exportAnnualPerformance: (year: string, options?: {
    format?: 'excel' | 'json';
  }) => {
    const params = new URLSearchParams({
      year,
      format: options?.format || 'excel'
    });
    return secureDownload(`${API_BASE_URL}/export/annual-performance?${params.toString()}`, `annual-performance-${year}.xlsx`);
  },

  exportEmployees: (options?: {
    department?: string;
    format?: 'excel' | 'json';
  }) => {
    const params = new URLSearchParams({
      format: options?.format || 'excel'
    });
    if (options?.department) {
      params.append('department', options.department);
    }
    return secureDownload(`${API_BASE_URL}/export/employees?${params.toString()}`, 'employees.xlsx');
  }
};

// 晋升/加薪申请
export const promotionApi = {
  create: (data: {
    employeeId?: string;
    targetLevel: string;
    targetPosition: string;
    raisePercentage: number;
    performanceSummary: string;
    skillSummary: string;
    competencySummary: string;
    workSummary: string;
  }) => request('/promotion-requests', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getMyRequests: () => request('/promotion-requests/my'),

  getPending: () => request('/promotion-requests/pending'),

  approve: (id: string, comment?: string) => request(`/promotion-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment })
  }),

  reject: (id: string, reason: string) => request(`/promotion-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),

  getHistory: (page = 1, pageSize = 10) =>
    request(`/promotion-requests/history?page=${page}&pageSize=${pageSize}`),

  exportRecords: (format: 'excel' | 'json' = 'excel') => {
    const query = new URLSearchParams({ format }).toString();
    return secureDownload(`${API_BASE_URL}/promotion-requests/export?${query}`, `promotion-records.xlsx`);
  }
};

// 组织架构API
export const organizationApi = {
  // 获取组织架构树
  getOrgTree: () => request('/organization/tree'),
  
  // 获取所有部门
  getAllDepartments: () => request('/organization/departments'),
  
  // 获取部门树
  getDepartmentTree: () => request('/organization/departments/tree'),
  
  // 获取部门详情
  getDepartmentById: (id: string) => request(`/organization/departments/${id}`),
  
  // 创建部门
  createDepartment: (data: {
    name: string;
    code: string;
    parentId?: string;
    managerId?: string;
    sortOrder?: number;
  }) => request('/organization/departments', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // 更新部门
  updateDepartment: (id: string, data: any) => request(`/organization/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // 删除部门
  deleteDepartment: (id: string) => request(`/organization/departments/${id}`, {
    method: 'DELETE'
  }),
  
  // 获取所有岗位
  getAllPositions: () => request('/organization/positions'),
  
  // 获取部门岗位
  getPositionsByDepartment: (departmentId: string) => request(`/organization/departments/${departmentId}/positions`),
  
  // 创建岗位
  createPosition: (data: {
    name: string;
    code: string;
    departmentId: string;
    level: string;
    category: string;
    description?: string;
    requirements?: string;
  }) => request('/organization/positions', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // 更新岗位
  updatePosition: (id: string, data: any) => request(`/organization/positions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // 删除岗位
  deletePosition: (id: string) => request(`/organization/positions/${id}`, {
    method: 'DELETE'
  })
};

// 设置API（考核范围等，HR 可写）
export const settingsApi = {
  getAssessmentScope: () => request('/settings/assessment-scope'),
  updateAssessmentScope: (data: { rootDepts: string[]; subDeptsByRoot: Record<string, string[]> }) =>
    request('/settings/assessment-scope', { method: 'PUT', body: JSON.stringify(data) }),
  getPromotionApprovalChain: () => request('/settings/promotion-approval-chain'),
  updatePromotionApprovalChain: (chain: string[]) =>
    request('/settings/promotion-approval-chain', { method: 'PUT', body: JSON.stringify({ chain }) })
};

// 考核周期API
export const assessmentCycleApi = {
  // 获取所有考核周期
  getAllCycles: () => request('/cycles'),
  
  // 获取当前激活的考核周期
  getActiveCycle: () => request('/cycles/active'),
  
  // 获取考核日历
  getCalendar: (year?: number) => request(`/cycles/calendar${year ? `?year=${year}` : ''}`),
  
  // 获取考核周期详情
  getCycleById: (id: string) => request(`/cycles/${id}`),
  
  // 创建考核周期
  createCycle: (data: {
    name: string;
    type: string;
    year: number;
    startDate: string;
    endDate: string;
    selfAssessmentDeadline?: string;
    managerReviewDeadline?: string;
    hrReviewDeadline?: string;
    appealDeadline?: string;
    reminderDays?: number;
    autoSubmit?: boolean;
    excludeHolidays?: boolean;
    description?: string;
  }) => request('/cycles', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // 更新考核周期
  updateCycle: (id: string, data: any) => request(`/cycles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // 删除考核周期
  deleteCycle: (id: string) => request(`/cycles/${id}`, {
    method: 'DELETE'
  }),
  
  // 激活考核周期
  activateCycle: (id: string) => request(`/cycles/${id}/activate`, {
    method: 'POST'
  }),
  
  // 批量生成年度的月度考核周期
  generateMonthlyCycles: (year: number) => request('/cycles/generate-monthly', {
    method: 'POST',
    body: JSON.stringify({ year })
  }),
  
  // 获取节假日
  getHolidays: (year?: number) => request(`/cycles/holidays${year ? `?year=${year}` : ''}`),
  
  // 创建节假日
  createHoliday: (data: { name: string; date: string; type: string }) => request('/cycles/holidays', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // 删除节假日
  deleteHoliday: (id: string) => request(`/cycles/holidays/${id}`, {
    method: 'DELETE'
  }),
  
  // 批量导入节假日
  importHolidays: (holidays: any[]) => request('/cycles/holidays/import', {
    method: 'POST',
    body: JSON.stringify({ holidays })
  })
};

// 指标库API
export const metricLibraryApi = {
  // 获取所有指标
  getAllMetrics: (category?: string) => request(`/metrics${category ? `?category=${category}` : ''}`),
  
  // 获取指标详情
  getMetricById: (id: string) => request(`/metrics/${id}`),
  
  // 创建指标
  createMetric: (data: {
    name: string;
    code: string;
    category: string;
    type: string;
    description: string;
    scoringCriteria?: any[];
    weight?: number;
    departmentIds?: string[];
    positionIds?: string[];
    applicableLevels?: string[];
    minValue?: number;
    maxValue?: number;
  }) => request('/metrics', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // 更新指标
  updateMetric: (id: string, data: any) => request(`/metrics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // 删除指标
  deleteMetric: (id: string) => request(`/metrics/${id}`, {
    method: 'DELETE'
  }),
  
  // 批量导入指标
  importMetrics: (metrics: any[]) => request('/metrics/import', {
    method: 'POST',
    body: JSON.stringify({ metrics })
  }),
  
  // 导出指标
  exportMetrics: () => secureDownload(`${API_BASE_URL}/metrics/export`, 'metrics.xlsx'),
  
  // 初始化默认指标
  initializeDefaultMetrics: () => request('/metrics/initialize', {
    method: 'POST'
  }),
  
  // 获取所有模板
  getAllTemplates: () => request('/metrics/templates'),
  
  // 获取岗位模板
  getTemplateByPosition: (positionId: string) => request(`/metrics/templates/position/${positionId}`),
  
  // 创建模板
  createTemplate: (data: {
    name: string;
    description?: string;
    positionId?: string;
    metrics: { metricId: string; weight: number; required: boolean }[];
  }) => request('/metrics/templates', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};


export const peerReviewApi = {
  getMyReviews: (month: string) => 
    request('/peer-reviews/my-reviews?month=' + month),
  
  getMyTasks: (month: string) => 
    request('/peer-reviews/my-tasks?month=' + month),
  
  submitReview: (data: {
    id: string;
    collaboration: number;
    professionalism: number;
    communication: number;
    comment: string;
  }) => request('/peer-reviews/submit', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  allocateReviews: (data: {
    month: string;
    department: string;
  }) => request('/peer-reviews/allocate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  getDepartmentStats: (month: string) => 
    request('/peer-reviews/department-stats?month=' + month),
  
  getDepartmentReviews: (month: string, revieweeId?: string) => {
    const url = '/peer-reviews/department-reviews?month=' + month;
    return request(revieweeId ? url + '&revieweeId=' + revieweeId : url);
  }
};

// 考核结果发布相关API
export const assessmentPublicationApi = {
  // 发布某月考核结果（HR/Admin）
  publish: (month: string) => 
    request('/assessment-publications/publish', {
      method: 'POST',
      body: JSON.stringify({ month })
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

// 绩效申诉相关API
export const appealApi = {
  // 员工提交申诉
  create: (data: {
    performanceRecordId: string;
    reason: string;
  }) => request('/appeals', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // 查询申诉列表（员工看自己，HR看全部）
  getAll: (status?: string) => {
    const url = status ? `/appeals?status=${status}` : '/appeals';
    return request(url);
  },
  
  // 根据ID获取申诉详情
  getById: (id: string) => request(`/appeals/${id}`),
  
  // HR处理申诉（批准/拒绝）
  review: (id: string, data: {
    status: 'approved' | 'rejected';
    hrComment: string;
  }) => request(`/appeals/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // 删除申诉（仅允许删除自己的待处理申诉）
  delete: (id: string) => request(`/appeals/${id}`, {
    method: 'DELETE'
  })
};

// 站内消息通知相关API
export const notificationApi = {
  // 获取我的消息列表
  getMyNotifications: (read?: boolean) => {
    const url = read !== undefined ? `/notifications?read=${read}` : '/notifications';
    return request(url);
  },
  
  // 获取未读数量
  getUnreadCount: () => request('/notifications/unread-count'),
  
  // 标记为已读
  markAsRead: (id: string) => 
    request(`/notifications/${id}/read`, {
      method: 'PUT'
    }),
  
  // 全部标记为已读
  markAllAsRead: () => 
    request('/notifications/read-all', {
      method: 'PUT'
    }),
  
  // 根据ID获取消息详情
  getById: (id: string) => request(`/notifications/${id}`)
};

// 自动化任务相关API
export const automationApi = {
  // 检查截止日期提醒
  checkReminders: () => 
    request('/automation/check-reminders', {
      method: 'POST'
    })
};

export default {
  auth: authApi,
  employee: employeeApi,
  performance: performanceApi,
  quarterlySummary: quarterlySummaryApi,
  promotion: promotionApi,
  peerReview: peerReviewApi,
  assessmentPublication: assessmentPublicationApi,
  appeal: appealApi,
  export: exportApi,
  notification: notificationApi,
  automation: automationApi
};
