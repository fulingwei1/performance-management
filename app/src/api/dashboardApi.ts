const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getToken = () => localStorage.getItem('token');

const fetchAPI = async (endpoint: string) => {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
};

// Dashboard API
export const dashboardApi = {
  // 获取全局概览（GM/Manager）
  getOverview: async (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return fetchAPI(`/dashboard/overview${params}`);
  },

  // 获取我的进度（Employee）
  getMyProgress: async (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return fetchAPI(`/dashboard/my-progress${params}`);
  },

  // 获取排行榜
  getRankings: async (year?: number, limit?: number) => {
    const params: string[] = [];
    if (year) params.push(`year=${year}`);
    if (limit) params.push(`limit=${limit}`);
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    return fetchAPI(`/dashboard/rankings${queryString}`);
  },

  // 获取趋势数据
  getTrends: async (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return fetchAPI(`/dashboard/trends${params}`);
  },
};
