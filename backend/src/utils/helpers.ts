import { EmployeeLevel } from '../types';

// 分组配置
export const groupConfig = {
  highLevels: ['senior', 'intermediate'] as EmployeeLevel[],
  lowLevels: ['junior', 'assistant'] as EmployeeLevel[]
};

// 判断员工属于高分组还是低分组
export const getGroupType = (level: EmployeeLevel): 'high' | 'low' => {
  return groupConfig.highLevels.includes(level) ? 'high' : 'low';
};

// 获取当前月份 YYYY-MM
export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// 获取当前季度 YYYY-QX
export const getCurrentQuarter = (): string => {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${quarter}`;
};

// 生成唯一ID
export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 计算总分
export const calculateTotalScore = (
  taskCompletion: number,
  initiative: number,
  projectFeedback: number,
  qualityImprovement: number
): number => {
  const total = 
    taskCompletion * 0.4 + 
    initiative * 0.3 + 
    projectFeedback * 0.2 + 
    qualityImprovement * 0.1;
  return parseFloat(total.toFixed(2));
};

// 分数转等级
export const scoreToLevel = (score: number): 'L1' | 'L2' | 'L3' | 'L4' | 'L5' => {
  if (score >= 1.4) return 'L5';
  if (score >= 1.15) return 'L4';
  if (score >= 0.9) return 'L3';
  if (score >= 0.65) return 'L2';
  return 'L1';
};

// 等级转分数
export const levelToScore = (level: string): number => {
  const map: Record<string, number> = {
    'L5': 1.5,
    'L4': 1.2,
    'L3': 1.0,
    'L2': 0.8,
    'L1': 0.5
  };
  return map[level] || 1.0;
};

// 等级标签
export const levelLabels: Record<string, string> = {
  senior: '高级工程师',
  intermediate: '中级工程师',
  junior: '初级工程师',
  assistant: '助理工程师'
};

// 角色标签
export const roleLabels: Record<string, string> = {
  employee: '员工',
  manager: '部门经理',
  gm: '总经理',
  hr: '人力资源'
};
