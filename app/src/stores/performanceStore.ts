import { create } from 'zustand';
import type { PerformanceRecord, Filters } from '@/types';
import { performanceApi } from '@/services/api';

interface PerformanceState {
  records: PerformanceRecord[];
  currentRecord: PerformanceRecord | null;
  loading: boolean;
  error: string | null;
  filters: Filters;
  
  // Actions
  fetchRecords: (filters?: Filters) => Promise<void>;
  fetchRecord: (id: string) => Promise<void>;
  fetchMyRecords: (employeeId: string) => Promise<void>;
  fetchTeamRecords: (managerId: string, month?: string) => Promise<void>;
  fetchGroupRecords: (groupType: 'high' | 'low', subDepartments?: string[]) => PerformanceRecord[];
  saveSummary: (data: Partial<PerformanceRecord>) => Promise<boolean>;
  submitScore: (data: Partial<PerformanceRecord>) => Promise<boolean>;
  submitPeerReview: (data: Partial<PerformanceRecord>) => Promise<boolean>;
  setFilters: (filters: Filters) => void;
  clearError: () => void;
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  records: [],
  currentRecord: null,
  loading: false,
  error: null,
  filters: {},

  fetchRecords: async (filters?: Filters) => {
    set({ loading: true, error: null });
    
    try {
      // 调用API获取团队记录（根据当前用户角色）
      const response = await performanceApi.getTeamRecords(filters?.month);
      
      if (response.success) {
        set({ records: response.data, loading: false });
      } else {
        set({ error: response.error || '获取数据失败', loading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', loading: false });
    }
  },

  fetchRecord: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      const record = get().records.find(r => r.id === id);
      if (record) {
        set({ currentRecord: record, loading: false });
      } else {
        set({ error: '记录不存在', loading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '获取记录失败', loading: false });
    }
  },

  fetchMyRecords: async (_employeeId: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await performanceApi.getMyRecords();
      
      if (response.success) {
        set({ records: response.data, loading: false });
      } else {
        set({ error: response.error || '获取数据失败', loading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', loading: false });
    }
  },

  fetchTeamRecords: async (_managerId: string, month?: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await performanceApi.getTeamRecords(month);
      
      if (response.success) {
        set({ records: response.data, loading: false });
      } else {
        set({ error: response.error || '获取数据失败', loading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', loading: false });
    }
  },

  fetchGroupRecords: (groupType: 'high' | 'low', subDepartments?: string[]) => {
    const { records } = get();
    let filteredRecords = records.filter(r => r.groupType === groupType);
    
    if (subDepartments && subDepartments.length > 0) {
      filteredRecords = filteredRecords.filter(r => subDepartments.includes(r.subDepartment || ''));
    }
    
    return filteredRecords.sort((a, b) => b.totalScore - a.totalScore);
  },

  saveSummary: async (data: Partial<PerformanceRecord>) => {
    set({ loading: true, error: null });
    
    try {
      const response = await performanceApi.submitSummary({
        month: data.month || '',
        selfSummary: data.selfSummary || '',
        nextMonthPlan: data.nextMonthPlan || ''
      });
      
      if (response.success) {
        const { records } = get();
        const existingIndex = records.findIndex(r => r.id === response.data.id);
        
        if (existingIndex >= 0) {
          const newRecords = [...records];
          newRecords[existingIndex] = response.data;
          set({ records: newRecords, currentRecord: response.data, loading: false });
        } else {
          set({ 
            records: [...records, response.data], 
            currentRecord: response.data, 
            loading: false 
          });
        }
        return true;
      } else {
        set({ error: response.error || '提交失败', loading: false });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', loading: false });
      return false;
    }
  },

  submitScore: async (data: Partial<PerformanceRecord>) => {
    set({ loading: true, error: null });
    
    try {
      const taskCompletion = data.taskCompletion || 1.0;
      const initiative = data.initiative || 1.0;
      const projectFeedback = data.projectFeedback || 1.0;
      const qualityImprovement = data.qualityImprovement || 1.0;
      
      const response = await performanceApi.submitScore({
        id: data.id || '',
        taskCompletion,
        initiative,
        projectFeedback,
        qualityImprovement,
        managerComment: data.managerComment || '',
        nextMonthWorkArrangement: data.nextMonthWorkArrangement || ''
      });
      
      if (response.success) {
        const { records } = get();
        const existingIndex = records.findIndex(r => r.id === response.data.id);
        
        if (existingIndex >= 0) {
          const newRecords = [...records];
          newRecords[existingIndex] = response.data;
          set({ records: newRecords, currentRecord: response.data, loading: false });
        }
        return true;
      } else {
        set({ error: response.error || '评分失败', loading: false });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', loading: false });
      return false;
    }
  },

  submitPeerReview: async (_data: Partial<PerformanceRecord>) => {
    set({ loading: true, error: null });
    
    // 模拟提交成功
    await new Promise(resolve => setTimeout(resolve, 600));
    
    set({ loading: false });
    return true;
  },

  setFilters: (filters: Filters) => {
    set({ filters });
    get().fetchRecords(filters);
  },

  clearError: () => {
    set({ error: null });
  }
}));
