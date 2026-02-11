import { create } from 'zustand';
import { promotionApi } from '@/services/api';
import type { PromotionRequest } from '@/types';

interface PromotionState {
  myRequests: PromotionRequest[];
  pendingRequests: PromotionRequest[];
  approvalHistory: PromotionRequest[];
  historyPage: number;
  historyPageSize: number;
  historyTotal: number;
  loading: boolean;
  error: string | null;

  fetchMyRequests: () => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  fetchHistory: (page?: number, pageSize?: number) => Promise<void>;
  createRequest: (data: {
    employeeId?: string;
    targetLevel: string;
    targetPosition: string;
    raisePercentage: number;
    performanceSummary: string;
    skillSummary: string;
    competencySummary: string;
    workSummary: string;
  }) => Promise<boolean>;
  approveRequest: (id: string, comment?: string) => Promise<boolean>;
  rejectRequest: (id: string, reason: string) => Promise<boolean>;
  clearError: () => void;
}

export const usePromotionStore = create<PromotionState>((set, get) => ({
  myRequests: [],
  pendingRequests: [],
  approvalHistory: [],
  historyPage: 1,
  historyPageSize: 10,
  historyTotal: 0,
  loading: false,
  error: null,

  fetchMyRequests: async () => {
    set({ loading: true, error: null });
    try {
      const response = await promotionApi.getMyRequests();
      set({ myRequests: response.data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message || '获取申请失败', loading: false });
    }
  },

  fetchPendingRequests: async () => {
    set({ loading: true, error: null });
    try {
      const response = await promotionApi.getPending();
      set({ pendingRequests: response.data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message || '获取待审批失败', loading: false });
    }
  },

  fetchHistory: async (page = 1, pageSize = 10) => {
    set({ loading: true, error: null });
    try {
      const response = await promotionApi.getHistory(page, pageSize);
      const payload = response.data || {};
      set({
        approvalHistory: payload.records || [],
        historyPage: payload.page || page,
        historyPageSize: payload.pageSize || pageSize,
        historyTotal: payload.total || 0,
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || '获取审批历史失败', loading: false });
    }
  },

  createRequest: async (data) => {
    set({ loading: true, error: null });
    try {
      await promotionApi.create(data);
      await get().fetchMyRequests();
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({ error: error.message || '提交申请失败', loading: false });
      return false;
    }
  },

  approveRequest: async (id, comment) => {
    set({ loading: true, error: null });
    try {
      await promotionApi.approve(id, comment);
      await get().fetchPendingRequests();
      await get().fetchHistory(get().historyPage, get().historyPageSize);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({ error: error.message || '审批失败', loading: false });
      return false;
    }
  },

  rejectRequest: async (id, reason) => {
    set({ loading: true, error: null });
    try {
      await promotionApi.reject(id, reason);
      await get().fetchPendingRequests();
      await get().fetchHistory(get().historyPage, get().historyPageSize);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({ error: error.message || '拒绝失败', loading: false });
      return false;
    }
  },

  clearError: () => set({ error: null })
}));
