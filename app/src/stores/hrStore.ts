import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Employee,
  MonthlyTask,
  TemporaryWork,
  TalentDevelopment,
  GMManagerScore,
  QuarterlySummary,
  PerformanceRecord,
  ReportData
} from '@/types';
import { generateNormalizationReport } from '@/lib/scoreNormalization';
import { createTaskActions } from './hrStore/taskActions';
import { createEmployeeActions } from './hrStore/employeeActions';
import { createDataActions } from './hrStore/dataActions';

interface HRState {
  monthlyTasks: MonthlyTask[];
  temporaryWorks: TemporaryWork[];
  talentDevelopments: TalentDevelopment[];
  gmScores: GMManagerScore[];
  quarterlySummaries: QuarterlySummary[];
  allPerformanceRecords: PerformanceRecord[];
  employeesList: Employee[];
  metricsList: any[];
  organizationList: any[];
  loading: boolean;
  error: string | null;
  
  // Task actions
  uploadMonthlyTasks: (managerId: string, month: string, tasks: MonthlyTask['tasks']) => void;
  updateMonthlyTask: (taskId: string, managerId: string, month: string, updates: Partial<MonthlyTask['tasks'][0]>) => void;
  addTemporaryWork: (data: Omit<TemporaryWork, 'id' | 'addedAt'>) => void;
  updateTemporaryWork: (id: string, updates: Partial<TemporaryWork>) => void;
  updateTalentDevelopment: (data: Omit<TalentDevelopment, 'id'>) => void;
  submitGMScore: (data: Omit<GMManagerScore, 'id' | 'totalScore' | 'rank' | 'createdAt' | 'updatedAt'>) => void;
  updateGMScore: (id: string, updates: Partial<GMManagerScore>) => void;
  saveQuarterlySummary: (data: Omit<QuarterlySummary, 'id' | 'createdAt' | 'updatedAt'>) => Promise<QuarterlySummary>;
  fetchQuarterlySummary: (quarter: string) => Promise<QuarterlySummary | undefined>;
  getQuarterlySummary: (managerId: string, quarter: string) => QuarterlySummary | undefined;
  generateMonthlyTasks: (month: string) => void;
  generateGMTasks: (quarter: string) => void;
  
  // Employee actions
  fetchEmployees: () => Promise<void>;
  addEmployee: (data: any) => Promise<boolean>;
  updateEmployee: (id: string, data: any) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
  importEmployees: (employees: any[]) => Promise<any>;
  getAllEmployees: () => Employee[];
  getAllManagers: () => Employee[];
  getManagerById: (id: string) => Employee | undefined;
  
  // Data actions
  fetchAllPerformanceRecords: () => Promise<void>;
  updatePerformanceRecord: (id: string, updates: Partial<PerformanceRecord>) => void;
  deletePerformanceRecord: (id: string) => void;
  exportReport: (month: string) => ReportData[];
  getNormalizationReport: () => ReturnType<typeof generateNormalizationReport>;
  exportMonthlyPerformance: (month: string, options?: any) => void;
  exportAnnualPerformance: (year: string, options?: any) => void;
  exportEmployeesFromDB: (options?: any) => void;
  fetchMetrics: () => Promise<void>;
  updateMetrics: (metrics: any[]) => Promise<boolean>;
  fetchOrganization: () => Promise<void>;
  updateOrganization: (organization: any[]) => Promise<boolean>;
  
  clearError: () => void;
}

export const useHRStore = create<HRState>()(
  persist(
    (set, get) => ({
      // State
      monthlyTasks: [],
      temporaryWorks: [],
      talentDevelopments: [],
      gmScores: [],
      quarterlySummaries: [],
      allPerformanceRecords: [],
      employeesList: [],
      metricsList: [
        { key: 'taskCompletion', name: '任务完成', weight: 40, description: '按时完成任务的质量和数量' },
        { key: 'initiative', name: '主动性', weight: 30, description: '主动承担责任和解决问题' },
        { key: 'projectFeedback', name: '项目反馈', weight: 20, description: '在项目中的表现和反馈' },
        { key: 'qualityImprovement', name: '质量改进', weight: 10, description: '持续改进工作质量' }
      ],
      organizationList: [],
      loading: false,
      error: null,

      // Compose actions from slices
      ...createTaskActions(set, get),
      ...createEmployeeActions(set, get),
      ...createDataActions(set, get),
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'hr-storage',
      partialize: (state) => ({
        monthlyTasks: state.monthlyTasks,
        temporaryWorks: state.temporaryWorks,
        talentDevelopments: state.talentDevelopments,
        gmScores: state.gmScores,
        allPerformanceRecords: state.allPerformanceRecords,
        metricsList: state.metricsList
      })
    }
  )
);
