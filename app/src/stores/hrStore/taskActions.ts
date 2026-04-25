import type { MonthlyTask, TemporaryWork, TalentDevelopment, GMManagerScore, QuarterlySummary } from '@/types';
import { quarterlySummaryApi } from '@/services/api';

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createTaskActions = (set: any, get: any) => ({
  uploadMonthlyTasks: (managerId: string, month: string, tasks: MonthlyTask['tasks']) => {
    const newTask: MonthlyTask = {
      id: generateId(), managerId, month, tasks,
      uploadedBy: 'HR', uploadedAt: new Date().toISOString()
    };
    set((state: any) => ({
      monthlyTasks: [...state.monthlyTasks.filter((t: MonthlyTask) => !(t.managerId === managerId && t.month === month)), newTask]
    }));
  },

  updateMonthlyTask: (taskId: string, managerId: string, month: string, updates: Partial<MonthlyTask['tasks'][0]>) => {
    set((state: any) => ({
      monthlyTasks: state.monthlyTasks.map((task: MonthlyTask) => {
        if (task.managerId === managerId && task.month === month) {
          return { ...task, tasks: task.tasks.map((t: any) => t.id === taskId ? { ...t, ...updates } : t) };
        }
        return task;
      })
    }));
  },

  addTemporaryWork: (data: Omit<TemporaryWork, 'id' | 'addedAt'>) => {
    const newWork: TemporaryWork = { id: generateId(), ...data, addedAt: new Date().toISOString() };
    set((state: any) => ({ temporaryWorks: [...state.temporaryWorks, newWork] }));
  },

  updateTemporaryWork: (id: string, updates: Partial<TemporaryWork>) => {
    set((state: any) => ({
      temporaryWorks: state.temporaryWorks.map((work: TemporaryWork) => work.id === id ? { ...work, ...updates } : work)
    }));
  },

  updateTalentDevelopment: (data: Omit<TalentDevelopment, 'id'>) => {
    const existingIndex = get().talentDevelopments.findIndex(
      (t: TalentDevelopment) => t.managerId === data.managerId && t.quarter === data.quarter
    );
    if (existingIndex >= 0) {
      set((state: any) => ({
        talentDevelopments: state.talentDevelopments.map((t: TalentDevelopment, i: number) => i === existingIndex ? { ...t, ...data } : t)
      }));
    } else {
      set((state: any) => ({ talentDevelopments: [...state.talentDevelopments, { id: generateId(), ...data }] }));
    }
  },

  submitGMScore: (data: Omit<GMManagerScore, 'id' | 'totalScore' | 'rank' | 'createdAt' | 'updatedAt'>) => {
    const totalScore = data.monthlyTaskCompletion * 0.4 + data.temporaryWorkCompletion * 0.25 + data.workload * 0.2 + data.talentDevelopment * 0.15;
    const existingScores = get().gmScores.filter((s: GMManagerScore) => s.quarter === data.quarter);
    const sortedScores = [...existingScores, { totalScore } as GMManagerScore].sort((a, b) => b.totalScore - a.totalScore);
    const rank = sortedScores.findIndex(s => s.totalScore === totalScore) + 1;
    const newScore: GMManagerScore = {
      id: generateId(), ...data, totalScore: parseFloat(totalScore.toFixed(2)), rank,
      status: 'completed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    set((state: any) => ({ gmScores: [...state.gmScores, newScore] }));
  },

  updateGMScore: (id: string, updates: Partial<GMManagerScore>) => {
    set((state: any) => ({
      gmScores: state.gmScores.map((score: GMManagerScore) => score.id === id ? { ...score, ...updates, updatedAt: new Date().toISOString() } : score)
    }));
  },

  saveQuarterlySummary: async (data: Omit<QuarterlySummary, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ loading: true, error: null });
    try {
      const response = await quarterlySummaryApi.save({ quarter: data.quarter, summary: data.summary, nextQuarterPlan: data.nextQuarterPlan, status: data.status });
      const saved = response.data as QuarterlySummary;
      set((state: any) => {
        const existingIndex = state.quarterlySummaries.findIndex(
          (s: QuarterlySummary) => s.id === saved.id || (s.managerId === saved.managerId && s.quarter === saved.quarter)
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

  fetchQuarterlySummary: async (quarter: string) => {
    set({ loading: true, error: null });
    try {
      const response = await quarterlySummaryApi.getMySummaries(quarter);
      const records = (response.data || []) as QuarterlySummary[];
      set((state: any) => {
        const merged = [...state.quarterlySummaries];
        records.forEach((record: QuarterlySummary) => {
          const idx = merged.findIndex((s: QuarterlySummary) => s.id === record.id || (s.managerId === record.managerId && s.quarter === record.quarter));
          if (idx >= 0) merged[idx] = { ...merged[idx], ...record };
          else merged.push(record);
        });
        return { quarterlySummaries: merged, loading: false };
      });
      return records.find((r: QuarterlySummary) => r.quarter === quarter);
    } catch (error: any) {
      set({ error: error.message || '获取季度总结失败', loading: false });
      return undefined;
    }
  },

  getQuarterlySummary: (managerId: string, quarter: string) =>
    get().quarterlySummaries.find((s: QuarterlySummary) => s.managerId === managerId && s.quarter === quarter),

  generateMonthlyTasks: async (month: string) => {
    const managers = get().employeesList.filter((e: any) => e.role === 'manager');
    managers.forEach((manager: any) => {
      const defaultTasks = [
        { id: generateId(), name: '完成部门月度KPI指标', target: '100%', weight: 30, completed: false, completionRate: 0 },
        { id: generateId(), name: '组织部门周例会', target: '4次/月', weight: 15, completed: false, completionRate: 0 },
        { id: generateId(), name: '完成下属绩效评估', target: '100%', weight: 25, completed: false, completionRate: 0 },
        { id: generateId(), name: '提交部门工作报告', target: '1份/月', weight: 15, completed: false, completionRate: 0 },
        { id: generateId(), name: '参与跨部门协作项目', target: '按计划推进', weight: 15, completed: false, completionRate: 0 }
      ];
      get().uploadMonthlyTasks(manager.id, month, defaultTasks);
    });
    // 360度互评已切换为“周期 + 评价关系”模型；月度任务生成不再调用旧的自动分配接口。
    // HR/Admin 可在互评管理中创建周期和评价关系。
  },

  generateGMTasks: (quarter: string) => {
    const employeesList = get().employeesList || [];
    const managers = employeesList.filter((e: any) => e.role === 'manager');
    console.log(`[hrStore] generateGMTasks - 季度: ${quarter}`);
    console.log(`[hrStore] employeesList 总数: ${employeesList.length}`);
    console.log(`[hrStore] 部门经理数: ${managers.length}`, managers.map((m: any) => m.name));
    console.log(`[hrStore] 现有gmScores数: ${get().gmScores.length}`);
    
    let addedCount = 0;
    managers.forEach((manager: any) => {
      if (!get().gmScores.find((s: GMManagerScore) => s.managerId === manager.id && s.quarter === quarter)) {
        console.log(`[hrStore] 为 ${manager.name} (${manager.id}) 生成 ${quarter} 评分任务`);
        set((state: any) => ({
          gmScores: [...state.gmScores, {
            id: generateId(), managerId: manager.id, managerName: manager.name, quarter,
            monthlyTaskCompletion: 0, temporaryWorkCompletion: 0, workload: 0, talentDevelopment: 0,
            totalScore: 0, gmComment: '', rank: 0, status: 'pending',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          }]
        }));
        addedCount++;
      }
    });
    console.log(`[hrStore] 共生成 ${addedCount} 个评分任务`);
  },
});
