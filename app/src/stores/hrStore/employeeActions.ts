import type { Employee } from '@/types';
import { employeeApi } from '@/services/api';

export const createEmployeeActions = (set: any, get: any) => ({
  fetchEmployees: async () => {
    set({ loading: true, error: null, employeesList: [] });
    try {
      const response = await employeeApi.getAll();
      if (response.success) {
        set({ employeesList: response.data, loading: false });
      } else {
        console.error('[hrStore] 加载员工失败:', response.error);
        set({ error: response.error || '获取员工失败', loading: false });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '网络错误';
      console.error('[hrStore] 网络错误:', msg);
      set({ error: msg, loading: false });
    }
  },
  getAllEmployees: () => get().employeesList as Employee[],
  getAllManagers: () => (get().employeesList as Employee[]).filter((e: Employee) => e.role === 'manager'),
  getManagerById: (id: string) => (get().employeesList as Employee[]).find((e: Employee) => e.id === id),
});
