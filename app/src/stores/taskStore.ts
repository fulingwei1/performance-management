import { create } from 'zustand';

import { usePerformanceStore } from './performanceStore';
import { useHRStore } from './hrStore';

export type TaskType = 'fill_summary' | 'manager_score' | 'peer_review';

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  relatedId?: string; // 关联的记录ID
  employeeName?: string; // 经理评分时显示员工姓名
  month: string;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;

  // Actions
  generateMonthlyTasks: (month?: string, records?: any[]) => void;
  fetchEmployeeTasks: (employeeId: string, month?: string) => Task[];
  fetchManagerTasks: (managerId: string, month?: string) => Task[];
  completeTask: (taskId: string) => void;
  getPendingTasksCount: (userId: string, role: 'employee' | 'manager') => number;
}

// 获取当前月份
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// 生成任务ID
const generateTaskId = (type: TaskType, userId: string, month: string, relatedId?: string) => {
  return `task-${type}-${userId}-${month}${relatedId ? `-${relatedId}` : ''}`;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  // 生成月度任务
  generateMonthlyTasks: (month?: string, records?: any[]) => {
    const targetMonth = month || getCurrentMonth();
    const newTasks: Task[] = [];

    // 获取当前performanceStore中的最新记录状态（如果提供了records参数则使用传入的）
    const performanceRecords = records || usePerformanceStore.getState().records;
    // 从 hrStore 获取员工列表
    const employees = useHRStore.getState().employeesList;

    // 为每个员工生成填写工作总结的任务
    employees.filter(e => e.role === 'employee').forEach(employee => {
      const recordId = `rec-${employee.id}-${targetMonth}`;
      // 从performanceStore获取最新状态
      const existingRecord = performanceRecords.find(r => r.id === recordId);

      // 员工任务：填写工作总结
      const summaryTask: Task = {
        id: generateTaskId('fill_summary', employee.id, targetMonth),
        type: 'fill_summary',
        title: '填写月度工作总结',
        description: `请填写${targetMonth}月份的工作总结和下月计划`,
        status: existingRecord?.selfSummary ? 'completed' : 'pending',
        dueDate: `${targetMonth}-05`,
        priority: 'high',
        relatedId: recordId,
        month: targetMonth
      };
      newTasks.push(summaryTask);

    });

    // 为每个经理生成为下属评分的任务
    employees.filter(e => e.role === 'manager').forEach(manager => {
      const teamMembers = employees.filter(e => e.managerId === manager.id);

      teamMembers.forEach(employee => {
        const recordId = `rec-${employee.id}-${targetMonth}`;
        // 从performanceStore获取最新状态
        const existingRecord = performanceRecords.find(r => r.id === recordId);
        // 判断任务是否完成：记录状态为completed且经理已填写评语
        const isCompleted = existingRecord?.status === 'completed' &&
                           existingRecord?.managerComment &&
                           existingRecord?.managerComment.length > 0;

        const scoreTask: Task = {
          id: generateTaskId('manager_score', manager.id, targetMonth, employee.id),
          type: 'manager_score',
          title: `为${employee.name}评分`,
          description: `请对${employee.name}的${targetMonth}月工作进行评分并填写评语`,
          status: isCompleted ? 'completed' : 'pending',
          dueDate: `${targetMonth}-15`,
          priority: 'high',
          relatedId: recordId,
          employeeName: employee.name,
          month: targetMonth
        };
        newTasks.push(scoreTask);
      });
    });

    set({ tasks: newTasks });
  },

  // 获取员工任务列表
  fetchEmployeeTasks: (employeeId: string, month?: string) => {
    const targetMonth = month || getCurrentMonth();
    const { tasks } = get();

    return tasks.filter(task =>
      task.id.includes(`-${employeeId}-`) &&
      task.month === targetMonth &&
      task.type === 'fill_summary'
    );
  },

  // 获取经理任务列表
  fetchManagerTasks: (managerId: string, month?: string) => {
    const targetMonth = month || getCurrentMonth();
    const { tasks } = get();

    return tasks.filter(task =>
      task.id.includes(`-${managerId}-`) &&
      task.month === targetMonth &&
      task.type === 'manager_score'
    );
  },

  // 完成任务
  completeTask: (taskId: string) => {
    set(state => ({
      tasks: state.tasks.map(task =>
        task.id === taskId ? { ...task, status: 'completed' as const } : task
      )
    }));
  },

  // 获取待办任务数量
  getPendingTasksCount: (userId: string, role: 'employee' | 'manager') => {
    const { tasks } = get();
    const currentMonth = getCurrentMonth();

    return tasks.filter(task =>
      task.id.includes(`-${userId}-`) &&
      task.month === currentMonth &&
      task.status !== 'completed' &&
      (role === 'employee'
        ? task.type === 'fill_summary'
        : task.type === 'manager_score')
    ).length;
  }
}));
