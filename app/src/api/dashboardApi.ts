import { apiClient } from '../services/api';

// Dashboard API
export const dashboardApi = {
  // 获取全局概览（GM/Manager）
  getOverview: async (year?: number) => {
    const params = year ? `?year=${year}` : '';
    const response = await apiClient.get(`/dashboard/overview${params}`);
    return response;
  },

  // 获取我的进度（Employee）
  getMyProgress: async (year?: number) => {
    const params = year ? `?year=${year}` : '';
    const response = await apiClient.get(`/dashboard/my-progress${params}`);
    return response;
  },

  // 获取排行榜
  getRankings: async (year?: number, limit?: number) => {
    const params: string[] = [];
    if (year) params.push(`year=${year}`);
    if (limit) params.push(`limit=${limit}`);
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    const response = await apiClient.get(`/dashboard/rankings${queryString}`);
    return response;
  },

  // 获取趋势数据
  getTrends: async (year?: number) => {
    const params = year ? `?year=${year}` : '';
    const response = await apiClient.get(`/dashboard/trends${params}`);
    return response;
  },
};
