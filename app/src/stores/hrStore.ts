import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Employee,
  PerformanceRecord,
} from '@/types';
import { createEmployeeActions } from './hrStore/employeeActions';
import { createDataActions } from './hrStore/dataActions';

interface HRState {
  allPerformanceRecords: PerformanceRecord[];
  employeesList: Employee[];
  loading: boolean;
  error: string | null;
  
  // Employee actions
  fetchEmployees: () => Promise<void>;
  getAllEmployees: () => Employee[];
  getAllManagers: () => Employee[];
  getManagerById: (id: string) => Employee | undefined;
  
  // Data actions
  fetchAllPerformanceRecords: () => Promise<void>;
  
  clearError: () => void;
}

export const useHRStore = create<HRState>()(
  persist(
    (set, get) => ({
      // State
      allPerformanceRecords: [],
      employeesList: [],
      loading: false,
      error: null,

      // Compose actions from slices
      ...createEmployeeActions(set, get),
      ...createDataActions(set),
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'hr-storage',
      partialize: (state) => ({
        allPerformanceRecords: state.allPerformanceRecords,
      })
    }
  )
);
