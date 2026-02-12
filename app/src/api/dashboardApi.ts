import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Dashboard API
export const dashboardApi = {
  // 获取全局概览（GM/Manager）
  getOverview: async (year?: number) => {
    const params = year ? { year } : {};
    const response = await axios.get(`${API_URL}/dashboard/overview`, { params });
    return response.data;
  },

  // 获取我的进度（Employee）
  getMyProgress: async (year?: number) => {
    const params = year ? { year } : {};
    const response = await axios.get(`${API_URL}/dashboard/my-progress`, { params });
    return response.data;
  },

  // 获取排行榜
  getRankings: async (year?: number, limit?: number) => {
    const params: any = {};
    if (year) params.year = year;
    if (limit) params.limit = limit;
    const response = await axios.get(`${API_URL}/dashboard/rankings`, { params });
    return response.data;
  },

  // 获取趋势数据
  getTrends: async (year?: number) => {
    const params = year ? { year } : {};
    const response = await axios.get(`${API_URL}/dashboard/trends`, { params });
    return response.data;
  },
};
