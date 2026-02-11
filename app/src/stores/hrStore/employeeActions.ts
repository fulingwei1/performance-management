import type { Employee } from '@/types';

export const createEmployeeActions = (set: any, get: any) => ({
  fetchEmployees: async () => {
    set({ loading: true, error: null });
    try {
      const { hrApi } = await import('@/services/api');
      const response = await hrApi.getAllEmployees();
      if (response.success) set({ employeesList: response.data, loading: false });
      else set({ error: response.error || '获取员工失败', loading: false });
    } catch (error: any) {
      set({ error: error.message || '网络错误', loading: false });
    }
  },
  
  addEmployee: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const { hrApi } = await import('@/services/api');
      const response = await hrApi.addEmployee(data);
      if (response.success) { get().fetchEmployees(); set({ loading: false }); return true; }
      else { set({ error: response.error || '添加失败', loading: false }); return false; }
    } catch (error: any) { set({ error: error.message || '网络错误', loading: false }); return false; }
  },
  
  updateEmployee: async (id: string, data: any) => {
    set({ loading: true, error: null });
    try {
      const { hrApi } = await import('@/services/api');
      const response = await hrApi.updateEmployee(id, data);
      if (response.success) { get().fetchEmployees(); set({ loading: false }); return true; }
      else { set({ error: response.error || '更新失败', loading: false }); return false; }
    } catch (error: any) { set({ error: error.message || '网络错误', loading: false }); return false; }
  },
  
  deleteEmployee: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { hrApi } = await import('@/services/api');
      const response = await hrApi.deleteEmployee(id);
      if (response.success) { get().fetchEmployees(); set({ loading: false }); return true; }
      else { set({ error: response.error || '删除失败', loading: false }); return false; }
    } catch (error: any) { set({ error: error.message || '网络错误', loading: false }); return false; }
  },
  
  importEmployees: async (employees: any[]) => {
    set({ loading: true, error: null });
    try {
      const { hrApi } = await import('@/services/api');
      const response = await hrApi.importEmployees(employees);
      if (response.success) { get().fetchEmployees(); set({ loading: false }); return response.data; }
      else { set({ error: response.error || '导入失败', loading: false }); return null; }
    } catch (error: any) { set({ error: error.message || '网络错误', loading: false }); return null; }
  },

  getAllEmployees: () => get().employeesList as Employee[],
  getAllManagers: () => (get().employeesList as Employee[]).filter((e: Employee) => e.role === 'manager'),
  getManagerById: (id: string) => (get().employeesList as Employee[]).find((e: Employee) => e.id === id),
});
