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

interface HRState {
  // 任务管理
  monthlyTasks: MonthlyTask[];
  temporaryWorks: TemporaryWork[];
  talentDevelopments: TalentDevelopment[];
  
  // 总经理评分
  gmScores: GMManagerScore[];

  // 经理季度总结
  quarterlySummaries: QuarterlySummary[];
  
  // 所有绩效记录
  allPerformanceRecords: PerformanceRecord[];
  
  // 员工管理（新）
  employeesList: Employee[];
  
  // 考核指标（新）
  metricsList: any[];
  
  // 组织架构（新）
  organizationList: any[];
  
  // 加载状态
  loading: boolean;
  error: string | null;
  
  // Actions
  // 任务管理
  uploadMonthlyTasks: (managerId: string, month: string, tasks: MonthlyTask['tasks']) => void;
  updateMonthlyTask: (taskId: string, managerId: string, month: string, updates: Partial<MonthlyTask['tasks'][0]>) => void;
  addTemporaryWork: (data: Omit<TemporaryWork, 'id' | 'addedAt'>) => void;
  updateTemporaryWork: (id: string, updates: Partial<TemporaryWork>) => void;
  
  // 人才培养
  updateTalentDevelopment: (data: Omit<TalentDevelopment, 'id'>) => void;
  
  // 总经理评分
  submitGMScore: (data: Omit<GMManagerScore, 'id' | 'totalScore' | 'rank' | 'createdAt' | 'updatedAt'>) => void;
  updateGMScore: (id: string, updates: Partial<GMManagerScore>) => void;

  // 经理季度总结
  saveQuarterlySummary: (data: Omit<QuarterlySummary, 'id' | 'createdAt' | 'updatedAt'>) => Promise<QuarterlySummary>;
  fetchQuarterlySummary: (quarter: string) => Promise<QuarterlySummary | undefined>;
  getQuarterlySummary: (managerId: string, quarter: string) => QuarterlySummary | undefined;
  
  // 绩效记录管理
  updatePerformanceRecord: (id: string, updates: Partial<PerformanceRecord>) => void;
  deletePerformanceRecord: (id: string) => void;
  
  // 生成任务
  generateMonthlyTasks: (month: string) => void;
  generateGMTasks: (quarter: string) => void;
  
  // 报表
  exportReport: (month: string) => ReportData[];
  getNormalizationReport: () => ReturnType<typeof generateNormalizationReport>;
  
  // 数据导出
  exportMonthlyPerformance: (month: string, options?: { format?: 'excel' | 'json'; includeAnalysis?: boolean }) => void;
  exportAnnualPerformance: (year: string, options?: { format?: 'excel' | 'json' }) => void;
  exportEmployeesFromDB: (options?: { department?: string; format?: 'excel' | 'json' }) => void;
  
  // 数据查询
  getAllEmployees: () => Employee[];
  getAllManagers: () => Employee[];
  getManagerById: (id: string) => Employee | undefined;
  
  // 绩效记录
  fetchAllPerformanceRecords: () => Promise<void>;
  
  // 员工管理（新）
  fetchEmployees: () => Promise<void>;
  addEmployee: (data: any) => Promise<boolean>;
  updateEmployee: (id: string, data: any) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
  importEmployees: (employees: any[]) => Promise<any>;

  
  // 考核指标（新）
  fetchMetrics: () => Promise<void>;
  updateMetrics: (metrics: any[]) => Promise<boolean>;
  
  // 组织架构（新）
  fetchOrganization: () => Promise<void>;
  updateOrganization: (organization: any[]) => Promise<boolean>;
  
  clearError: () => void;
}

// 生成唯一ID
const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useHRStore = create<HRState>()(
  persist(
    (set, get) => ({
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

      // 获取所有绩效记录
      fetchAllPerformanceRecords: async () => {
        set({ loading: true, error: null });
        try {
          const { performanceApi } = await import('@/services/api');
          const response = await performanceApi.getAllRecords(12); // 最近12个月
          if (response.success) {
            set({ allPerformanceRecords: response.data, loading: false });
          } else {
            set({ error: response.error || '获取绩效记录失败', loading: false });
          }
        } catch (error: any) {
          set({ error: error.message || '获取绩效记录失败', loading: false });
        }
      },

      // 上传月度任务
      uploadMonthlyTasks: (managerId, month, tasks) => {
        const newTask: MonthlyTask = {
          id: generateId(),
          managerId,
          month,
          tasks,
          uploadedBy: 'HR',
          uploadedAt: new Date().toISOString()
        };
        
        set(state => ({
          monthlyTasks: [...state.monthlyTasks.filter(t => !(t.managerId === managerId && t.month === month)), newTask]
        }));
      },

      // 更新月度任务
      updateMonthlyTask: (taskId, managerId, month, updates) => {
        set(state => ({
          monthlyTasks: state.monthlyTasks.map(task => {
            if (task.managerId === managerId && task.month === month) {
              return {
                ...task,
                tasks: task.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
              };
            }
            return task;
          })
        }));
      },

      // 添加临时工作
      addTemporaryWork: (data) => {
        const newWork: TemporaryWork = {
          id: generateId(),
          ...data,
          addedAt: new Date().toISOString()
        };
        
        set(state => ({
          temporaryWorks: [...state.temporaryWorks, newWork]
        }));
      },

      // 更新临时工作
      updateTemporaryWork: (id, updates) => {
        set(state => ({
          temporaryWorks: state.temporaryWorks.map(work => 
            work.id === id ? { ...work, ...updates } : work
          )
        }));
      },

      // 更新人才培养指标
      updateTalentDevelopment: (data) => {
        const existingIndex = get().talentDevelopments.findIndex(
          t => t.managerId === data.managerId && t.quarter === data.quarter
        );
        
        if (existingIndex >= 0) {
          set(state => ({
            talentDevelopments: state.talentDevelopments.map((t, i) => 
              i === existingIndex ? { ...t, ...data } : t
            )
          }));
        } else {
          const newDev: TalentDevelopment = {
            id: generateId(),
            ...data
          };
          set(state => ({
            talentDevelopments: [...state.talentDevelopments, newDev]
          }));
        }
      },

      // 提交总经理评分
      submitGMScore: (data) => {
        const totalScore = 
          data.monthlyTaskCompletion * 0.4 +
          data.temporaryWorkCompletion * 0.25 +
          data.workload * 0.2 +
          data.talentDevelopment * 0.15;
        
        // 计算排名
        const existingScores = get().gmScores.filter(s => s.quarter === data.quarter);
        const sortedScores = [...existingScores, { totalScore } as GMManagerScore]
          .sort((a, b) => b.totalScore - a.totalScore);
        const rank = sortedScores.findIndex(s => s.totalScore === totalScore) + 1;
        
        const newScore: GMManagerScore = {
          id: generateId(),
          ...data,
          totalScore: parseFloat(totalScore.toFixed(2)),
          rank,
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        set(state => ({
          gmScores: [...state.gmScores, newScore]
        }));
      },

      // 更新总经理评分
      updateGMScore: (id, updates) => {
        set(state => ({
          gmScores: state.gmScores.map(score => 
            score.id === id ? { ...score, ...updates, updatedAt: new Date().toISOString() } : score
          )
        }));
      },

      // 保存经理季度总结（后端落库）
      saveQuarterlySummary: async (data) => {
        set({ loading: true, error: null });
        try {
          const { quarterlySummaryApi } = await import('@/services/api');
          const response = await quarterlySummaryApi.save({
            quarter: data.quarter,
            summary: data.summary,
            nextQuarterPlan: data.nextQuarterPlan,
            status: data.status
          });
          const saved = response.data as QuarterlySummary;

          set(state => {
            const existingIndex = state.quarterlySummaries.findIndex(
              s => s.id === saved.id || (s.managerId === saved.managerId && s.quarter === saved.quarter)
            );
            if (existingIndex >= 0) {
              const next = [...state.quarterlySummaries];
              next[existingIndex] = { ...next[existingIndex], ...saved };
              return { quarterlySummaries: next, loading: false };
            }
            return { quarterlySummaries: [...state.quarterlySummaries, saved], loading: false };
          });

          return saved;
        } catch (error: any) {
          set({ error: error.message || '保存季度总结失败', loading: false });
          throw error;
        }
      },

      fetchQuarterlySummary: async (quarter) => {
        set({ loading: true, error: null });
        try {
          const { quarterlySummaryApi } = await import('@/services/api');
          const response = await quarterlySummaryApi.getMySummaries(quarter);
          const records = (response.data || []) as QuarterlySummary[];
          set(state => {
            const merged = [...state.quarterlySummaries];
            records.forEach(record => {
              const idx = merged.findIndex(
                s => s.id === record.id || (s.managerId === record.managerId && s.quarter === record.quarter)
              );
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...record };
              } else {
                merged.push(record);
              }
            });
            return { quarterlySummaries: merged, loading: false };
          });
          return records.find(r => r.quarter === quarter);
        } catch (error: any) {
          set({ error: error.message || '获取季度总结失败', loading: false });
          return undefined;
        }
      },

      getQuarterlySummary: (managerId, quarter) =>
        get().quarterlySummaries.find(s => s.managerId === managerId && s.quarter === quarter),

      // 更新绩效记录
      updatePerformanceRecord: (id, updates) => {
        set(state => ({
          allPerformanceRecords: state.allPerformanceRecords.map(record => 
            record.id === id ? { ...record, ...updates, updatedAt: new Date().toISOString() } : record
          )
        }));
      },

      // 删除绩效记录
      deletePerformanceRecord: (id) => {
        set(state => ({
          allPerformanceRecords: state.allPerformanceRecords.filter(record => record.id !== id)
        }));
      },

      // 生成月度任务
      generateMonthlyTasks: async (month) => {
        const { peerReviewApi } = await import('@/services/api');
        
        // 为每个经理生成月度任务模板 - 使用 employeesList
        const managers = get().employeesList.filter(e => e.role === 'manager');
        
        managers.forEach(manager => {
          const defaultTasks = [
            { id: generateId(), name: '完成部门月度KPI指标', target: '100%', weight: 30, completed: false, completionRate: 0 },
            { id: generateId(), name: '组织部门周例会', target: '4次/月', weight: 15, completed: false, completionRate: 0 },
            { id: generateId(), name: '完成下属绩效评估', target: '100%', weight: 25, completed: false, completionRate: 0 },
            { id: generateId(), name: '提交部门工作报告', target: '1份/月', weight: 15, completed: false, completionRate: 0 },
            { id: generateId(), name: '参与跨部门协作项目', target: '按计划推进', weight: 15, completed: false, completionRate: 0 }
          ];
          
          get().uploadMonthlyTasks(manager.id, month, defaultTasks);
        });
        
        // 为每个部门分配360度互评任务
        const departments = [...new Set(get().employeesList.map(e => e.department))];
        for (const dept of departments) {
          try {
            await peerReviewApi.allocateReviews({
              month,
              department: dept
            });
            console.log(`已为部门 ${dept} 分配360度互评任务`);
          } catch (error) {
            console.error(`为部门 ${dept} 分配360度互评任务失败:`, error);
          }
        }
      },

      // 生成总经理评分任务
      generateGMTasks: (quarter) => {
        const managers = get().employeesList.filter(e => e.role === 'manager');
        
        managers.forEach(manager => {
          const existingScore = get().gmScores.find(s => s.managerId === manager.id && s.quarter === quarter);
          
          if (!existingScore) {
            const newScore: GMManagerScore = {
              id: generateId(),
              managerId: manager.id,
              managerName: manager.name,
              quarter,
              monthlyTaskCompletion: 0,
              temporaryWorkCompletion: 0,
              workload: 0,
              talentDevelopment: 0,
              totalScore: 0,
              gmComment: '',
              rank: 0,
              status: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            set(state => ({
              gmScores: [...state.gmScores, newScore]
            }));
          }
        });
      },

      // 导出报表
      exportReport: (month) => {
        const records = get().allPerformanceRecords.filter(r => r.month === month);
        const departments = [...new Set(records.map(r => r.subDepartment))];
        
        return departments.map(dept => {
          const deptRecords = records.filter(r => r.subDepartment === dept);
          const scores = deptRecords.map(r => r.totalScore);
          const average = scores.reduce((a, b) => a + b, 0) / scores.length;
          
          return {
            month,
            department: dept,
            totalEmployees: deptRecords.length,
            averageScore: parseFloat(average.toFixed(2)),
            excellentCount: scores.filter(s => s >= 1.4).length,
            goodCount: scores.filter(s => s >= 1.15 && s < 1.4).length,
            normalCount: scores.filter(s => s >= 0.9 && s < 1.15).length,
            needImprovementCount: scores.filter(s => s < 0.9).length
          };
        });
      },

      // 获取标准化报告
      getNormalizationReport: () => {
        return generateNormalizationReport(get().allPerformanceRecords);
      },

      // 获取所有员工 - 使用 employeesList
      getAllEmployees: () => get().employeesList,

      // 获取所有经理 - 使用 employeesList
      getAllManagers: () => get().employeesList.filter(e => e.role === 'manager'),

      // 根据ID获取经理 - 使用 employeesList
      getManagerById: (id) => get().employeesList.find(e => e.id === id),
 
      // 员工管理（新）
      fetchEmployees: async () => {
        set({ loading: true, error: null });
        try {
          const { hrApi } = await import('@/services/api');
          const response = await hrApi.getAllEmployees();
          if (response.success) {
            set({ employeesList: response.data, loading: false });
          } else {
            set({ error: response.error || '获取员工失败', loading: false });
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', loading: false });
        }
      },
      
      addEmployee: async (data) => {
        set({ loading: true, error: null });
        try {
          const { hrApi } = await import('@/services/api');
          const response = await hrApi.addEmployee(data);
          if (response.success) {
            get().fetchEmployees();
            set({ loading: false });
            return true;
          } else {
            set({ error: response.error || '添加失败', loading: false });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', loading: false });
          return false;
        }
      },
      
      updateEmployee: async (id, data) => {
        set({ loading: true, error: null });
        try {
          const { hrApi } = await import('@/services/api');
          const response = await hrApi.updateEmployee(id, data);
          if (response.success) {
            get().fetchEmployees();
            set({ loading: false });
            return true;
          } else {
            set({ error: response.error || '更新失败', loading: false });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', loading: false });
          return false;
        }
      },
      
      deleteEmployee: async (id) => {
        set({ loading: true, error: null });
        try {
          const { hrApi } = await import('@/services/api');
          const response = await hrApi.deleteEmployee(id);
          if (response.success) {
            get().fetchEmployees();
            set({ loading: false });
            return true;
          } else {
            set({ error: response.error || '删除失败', loading: false });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', loading: false });
          return false;
        }
      },
      
      importEmployees: async (employees) => {
        set({ loading: true, error: null });
        try {
          const { hrApi } = await import('@/services/api');
          const response = await hrApi.importEmployees(employees);
          if (response.success) {
            get().fetchEmployees();
            set({ loading: false });
            return response.data;
          } else {
            set({ error: response.error || '导入失败', loading: false });
            return null;
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', loading: false });
          return null;
        }
      },
      
      exportEmployees: async () => {
        const { hrApi } = await import('@/services/api');
        hrApi.exportEmployees();
      },
      
      // 考核指标（新）
      fetchMetrics: async () => {
        set({ loading: true, error: null });
        try {
          const { metricLibraryApi } = await import('@/services/api');
          const response = await metricLibraryApi.getAllMetrics();
          if (response.success) {
            set({ metricsList: response.data, loading: false });
          } else {
            set({ error: response.error || '获取指标失败', loading: false });
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', loading: false });
        }
      },

      updateMetrics: async (metrics) => {
        set({ loading: true, error: null });
        try {
          // 批量更新指标
          const { metricLibraryApi } = await import('@/services/api');
          const results = await Promise.all(
            metrics.map(m => m.id
              ? metricLibraryApi.updateMetric(m.id, m)
              : metricLibraryApi.createMetric(m)
            )
          );
          const allSuccess = results.every(r => r.success);
          if (allSuccess) {
            await get().fetchMetrics();
            set({ loading: false });
            return true;
          } else {
            set({ error: '部分指标更新失败', loading: false });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', loading: false });
          return false;
        }
      },

      // 组织架构（新）
      fetchOrganization: async () => {
        set({ loading: true, error: null });
        try {
          const { organizationApi } = await import('@/services/api');
          const response = await organizationApi.getDepartmentTree();
          if (response.success) {
            set({ organizationList: response.data, loading: false });
          } else {
            set({ error: response.error || '获取组织架构失败', loading: false });
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', loading: false });
        }
      },

      updateOrganization: async (organization) => {
        set({ loading: true, error: null });
        try {
          const { organizationApi } = await import('@/services/api');
          const results = await Promise.all(
            organization.map(dept => dept.id
              ? organizationApi.updateDepartment(dept.id, dept)
              : organizationApi.createDepartment(dept)
            )
          );
          const allSuccess = results.every(r => r.success);
          if (allSuccess) {
            await get().fetchOrganization();
            set({ loading: false });
            return true;
          } else {
            set({ error: '部分组织架构更新失败', loading: false });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', loading: false });
          return false;
        }
      },
 
      // 数据导出功能
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
        // employeesList / organizationList 不持久化，始终从接口拉取，避免工作台与员工档案人数不一致
      })
    }
  )
);
