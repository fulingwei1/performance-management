import { performanceApi } from '@/services/api';

export const createDataActions = (set: any) => ({
  fetchAllPerformanceRecords: async () => {
    set({ loading: true, error: null });
    try {
      const response = await performanceApi.getAllRecords(12);
      if (response.success) set({ allPerformanceRecords: response.data, loading: false });
      else set({ error: response.error || '获取绩效记录失败', loading: false });
    } catch (error: any) {
      set({ error: error.message || '获取绩效记录失败', loading: false });
    }
  },
});
