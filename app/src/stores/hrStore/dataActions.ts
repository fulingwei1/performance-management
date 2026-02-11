import type { PerformanceRecord, ReportData } from '@/types';
import { generateNormalizationReport } from '@/lib/scoreNormalization';

export const createDataActions = (set: any, get: any) => ({
  fetchAllPerformanceRecords: async () => {
    set({ loading: true, error: null });
    try {
      const { performanceApi } = await import('@/services/api');
      const response = await performanceApi.getAllRecords(12);
      if (response.success) set({ allPerformanceRecords: response.data, loading: false });
      else set({ error: response.error || '获取绩效记录失败', loading: false });
    } catch (error: any) {
      set({ error: error.message || '获取绩效记录失败', loading: false });
    }
  },

  updatePerformanceRecord: (id: string, updates: Partial<PerformanceRecord>) => {
    set((state: any) => ({
      allPerformanceRecords: state.allPerformanceRecords.map((record: PerformanceRecord) =>
        record.id === id ? { ...record, ...updates, updatedAt: new Date().toISOString() } : record
      )
    }));
  },

  deletePerformanceRecord: (id: string) => {
    set((state: any) => ({
      allPerformanceRecords: state.allPerformanceRecords.filter((record: PerformanceRecord) => record.id !== id)
    }));
  },

  exportReport: (month: string): ReportData[] => {
    const records = get().allPerformanceRecords.filter((r: PerformanceRecord) => r.month === month);
    const departments = [...new Set(records.map((r: PerformanceRecord) => r.subDepartment))];
    return departments.map((dept: any) => {
      const deptRecords = records.filter((r: PerformanceRecord) => r.subDepartment === dept);
      const scores = deptRecords.map((r: PerformanceRecord) => r.totalScore);
      const average = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      return {
        month, department: dept, totalEmployees: deptRecords.length,
        averageScore: parseFloat(average.toFixed(2)),
        excellentCount: scores.filter((s: number) => s >= 1.4).length,
        goodCount: scores.filter((s: number) => s >= 1.15 && s < 1.4).length,
        normalCount: scores.filter((s: number) => s >= 0.9 && s < 1.15).length,
        needImprovementCount: scores.filter((s: number) => s < 0.9).length
      };
    });
  },

  getNormalizationReport: () => generateNormalizationReport(get().allPerformanceRecords),

  exportMonthlyPerformance: async (month: string, options = {}) => {
    const { exportApi } = await import('@/services/api');
    exportApi.exportMonthlyPerformance(month, options);
  },

  exportAnnualPerformance: async (year: string, options = {}) => {
    const { exportApi } = await import('@/services/api');
    exportApi.exportAnnualPerformance(year, options);
  },

  exportEmployeesFromDB: async (options = {}) => {
    const { exportApi } = await import('@/services/api');
    exportApi.exportEmployees(options);
  },

  fetchMetrics: async () => {
    set({ loading: true, error: null });
    try {
      const { metricLibraryApi } = await import('@/services/api');
      const response = await metricLibraryApi.getAllMetrics();
      if (response.success) set({ metricsList: response.data, loading: false });
      else set({ error: response.error || '获取指标失败', loading: false });
    } catch (error: any) { set({ error: error.message || '网络错误', loading: false }); }
  },

  updateMetrics: async (metrics: any[]) => {
    set({ loading: true, error: null });
    try {
      const { metricLibraryApi } = await import('@/services/api');
      const results = await Promise.all(metrics.map((m: any) => m.id ? metricLibraryApi.updateMetric(m.id, m) : metricLibraryApi.createMetric(m)));
      if (results.every((r: any) => r.success)) { await get().fetchMetrics(); set({ loading: false }); return true; }
      else { set({ error: '部分指标更新失败', loading: false }); return false; }
    } catch (error: any) { set({ error: error.message || '网络错误', loading: false }); return false; }
  },

  fetchOrganization: async () => {
    set({ loading: true, error: null });
    try {
      const { organizationApi } = await import('@/services/api');
      const response = await organizationApi.getDepartmentTree();
      if (response.success) set({ organizationList: response.data, loading: false });
      else set({ error: response.error || '获取组织架构失败', loading: false });
    } catch (error: any) { set({ error: error.message || '网络错误', loading: false }); }
  },

  updateOrganization: async (organization: any[]) => {
    set({ loading: true, error: null });
    try {
      const { organizationApi } = await import('@/services/api');
      const results = await Promise.all(organization.map((dept: any) => dept.id ? organizationApi.updateDepartment(dept.id, dept) : organizationApi.createDepartment(dept)));
      if (results.every((r: any) => r.success)) { await get().fetchOrganization(); set({ loading: false }); return true; }
      else { set({ error: '部分组织架构更新失败', loading: false }); return false; }
    } catch (error: any) { set({ error: error.message || '网络错误', loading: false }); return false; }
  },
});
