/**
 * 内存数据库实现 - 用于开发和演示模式
 * 提供完整的CRUD操作模拟
 */

import { Employee, PerformanceRecord, PeerReview, Department, Position, AssessmentCycle, Holiday, PerformanceMetric, MetricTemplate, PromotionRequest, QuarterlySummary, StrategicObjective, Objective, KeyResult, KpiAssignment, PerformanceContract, MonthlyReport, PerformanceInterview, OkrAssignment, Attachment, PeerReviewCycle, PeerReviewTask, BonusConfig, BonusResult, GoalProgress, Appeal, ObjectiveAdjustment } from '../types';
import { AIUsageLog } from '../models/aiUsageLog.model';
import { Notification } from '../models/notification.model';
import logger from './logger';

// 内存数据存储
interface MemoryStore {
  employees: Map<string, Employee>;
  performanceRecords: Map<string, PerformanceRecord>;
  peerReviews: Map<string, PeerReview>;
  quarterlySummaries: Map<string, QuarterlySummary>;
  promotionRequests: Map<string, PromotionRequest>;
  departments: Map<string, Department>;
  positions: Map<string, Position>;
  assessmentCycles: Map<string, AssessmentCycle>;
  holidays: Map<string, Holiday>;
  performanceMetrics: Map<string, PerformanceMetric>;
  metricTemplates: Map<string, MetricTemplate>;
  strategicObjectives: Map<string, StrategicObjective>;
  objectives: Map<string, Objective>;
  keyResults: Map<string, KeyResult>;
  kpiAssignments: Map<string, KpiAssignment>;
  performanceContracts: Map<string, PerformanceContract>;
  monthlyReports: Map<string, MonthlyReport>;
  performanceInterviews: Map<string, PerformanceInterview>;
  okrAssignments: Map<string, OkrAssignment>;
  attachments: Map<string, Attachment>;
  peerReviewCycles: Map<string, PeerReviewCycle>;
  peerReviewTasks: Map<string, PeerReviewTask>;
  bonusConfig: Map<string, BonusConfig>;
  bonusResults: Map<string, BonusResult>;
  goalProgress?: Map<string, GoalProgress>;
  aiUsageLogs: Map<string, AIUsageLog>;
  appeals?: Map<string, Appeal>;
  notifications?: Map<string, Notification>;
  objectiveAdjustments?: Map<string, ObjectiveAdjustment>;
  todos?: Map<string, any>;
}

export const memoryStore: MemoryStore = {
  employees: new Map(),
  performanceRecords: new Map(),
  peerReviews: new Map(),
  quarterlySummaries: new Map(),
  promotionRequests: new Map(),
  departments: new Map(),
  positions: new Map(),
  assessmentCycles: new Map(),
  holidays: new Map(),
  performanceMetrics: new Map(),
  metricTemplates: new Map(),
  strategicObjectives: new Map(),
  objectives: new Map(),
  keyResults: new Map(),
  kpiAssignments: new Map(),
  performanceContracts: new Map(),
  monthlyReports: new Map(),
  performanceInterviews: new Map(),
  okrAssignments: new Map(),
  attachments: new Map(),
  peerReviewCycles: new Map(),
  peerReviewTasks: new Map(),
  bonusConfig: new Map(),
  bonusResults: new Map(),
  goalProgress: new Map(),
  aiUsageLogs: new Map(),
  appeals: new Map(),
  notifications: new Map(),
  objectiveAdjustments: new Map(),
};

// 员工数据操作
const employeeOperations = {
  findById: (id: string): Employee | undefined => {
    return memoryStore.employees.get(id);
  },

  findByName: (name: string): Employee | undefined => {
    return Array.from(memoryStore.employees.values()).find(emp => emp.name === name);
  },

  findAll: (): Employee[] => {
    return Array.from(memoryStore.employees.values());
  },

  findByRole: (role: string): Employee[] => {
    return Array.from(memoryStore.employees.values()).filter(emp => emp.role === role);
  },

  findByManagerId: (managerId: string): Employee[] => {
    return Array.from(memoryStore.employees.values()).filter(emp => emp.managerId === managerId);
  },

  findByDepartment: (department: string): Employee[] => {
    return Array.from(memoryStore.employees.values()).filter(emp =>
      emp.department === department || emp.subDepartment === department
    );
  },

  create: (employee: Employee): Employee => {
    memoryStore.employees.set(employee.id, employee);
    return employee;
  },

  update: (id: string, updates: Partial<Employee>): Employee | undefined => {
    const existing = memoryStore.employees.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    memoryStore.employees.set(id, updated);
    return updated;
  },

  delete: (id: string): boolean => {
    return memoryStore.employees.delete(id);
  },

  batchInsert: (employees: Employee[]): void => {
    employees.forEach(emp => {
      memoryStore.employees.set(emp.id, emp);
    });
  },
};

// 绩效记录数据操作
const performanceRecordOperations = {
  findById: (id: string): PerformanceRecord | undefined => {
    return memoryStore.performanceRecords.get(id);
  },

  findByEmployeeId: (employeeId: string): PerformanceRecord[] => {
    return Array.from(memoryStore.performanceRecords.values())
      .filter(record => record.employeeId === employeeId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  },

  findByMonth: (month: string): PerformanceRecord[] => {
    return Array.from(memoryStore.performanceRecords.values())
      .filter(record => record.month === month);
  },

  findAll: (): PerformanceRecord[] => {
    return Array.from(memoryStore.performanceRecords.values());
  },

  create: (record: PerformanceRecord): PerformanceRecord => {
    memoryStore.performanceRecords.set(record.id, record);
    return record;
  },

  update: (id: string, updates: Partial<PerformanceRecord>): PerformanceRecord | undefined => {
    const existing = memoryStore.performanceRecords.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    memoryStore.performanceRecords.set(id, updated as PerformanceRecord);
    return updated as PerformanceRecord;
  },

  delete: (id: string): boolean => {
    return memoryStore.performanceRecords.delete(id);
  },
};

// 互评记录数据操作
const peerReviewOperations = {
  findById: (id: string): PeerReview | undefined => {
    return memoryStore.peerReviews.get(id);
  },

  findByReviewerId: (reviewerId: string): PeerReview[] => {
    return Array.from(memoryStore.peerReviews.values())
      .filter(review => review.reviewerId === reviewerId);
  },

  findByRevieweeId: (revieweeId: string): PeerReview[] => {
    return Array.from(memoryStore.peerReviews.values())
      .filter(review => review.revieweeId === revieweeId);
  },

  findByRecordId: (recordId: string): PeerReview[] => {
    return Array.from(memoryStore.peerReviews.values())
      .filter(review => review.recordId === recordId);
  },

  create: (review: PeerReview): PeerReview => {
    memoryStore.peerReviews.set(review.id, review);
    return review;
  },

  update: (id: string, updates: Partial<PeerReview>): PeerReview | undefined => {
    const existing = memoryStore.peerReviews.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    memoryStore.peerReviews.set(id, updated as PeerReview);
    return updated as PeerReview;
  },

  delete: (id: string): boolean => {
    return memoryStore.peerReviews.delete(id);
  },
};

// 经理季度总结数据操作
const quarterlySummaryOperations = {
  findById: (id: string): QuarterlySummary | undefined => {
    return memoryStore.quarterlySummaries.get(id);
  },

  findByManagerId: (managerId: string): QuarterlySummary[] => {
    return Array.from(memoryStore.quarterlySummaries.values())
      .filter(summary => summary.managerId === managerId)
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
  },

  findAll: (): QuarterlySummary[] => {
    return Array.from(memoryStore.quarterlySummaries.values());
  },

  create: (summary: QuarterlySummary): QuarterlySummary => {
    memoryStore.quarterlySummaries.set(summary.id, summary);
    return summary;
  },

  update: (id: string, updates: Partial<QuarterlySummary>): QuarterlySummary | undefined => {
    const existing = memoryStore.quarterlySummaries.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    memoryStore.quarterlySummaries.set(id, updated as QuarterlySummary);
    return updated as QuarterlySummary;
  },

  delete: (id: string): boolean => {
    return memoryStore.quarterlySummaries.delete(id);
  },
};

// 晋升/加薪申请数据操作
const promotionRequestOperations = {
  findById: (id: string): PromotionRequest | undefined => {
    return memoryStore.promotionRequests.get(id);
  },

  findByEmployeeId: (employeeId: string): PromotionRequest[] => {
    return Array.from(memoryStore.promotionRequests.values())
      .filter(req => req.employeeId === employeeId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  },

  findByRequesterId: (requesterId: string): PromotionRequest[] => {
    return Array.from(memoryStore.promotionRequests.values())
      .filter(req => req.requesterId === requesterId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  },

  findAll: (): PromotionRequest[] => {
    return Array.from(memoryStore.promotionRequests.values());
  },

  create: (request: PromotionRequest): PromotionRequest => {
    memoryStore.promotionRequests.set(request.id, request);
    return request;
  },

  update: (id: string, updates: Partial<PromotionRequest>): PromotionRequest | undefined => {
    const existing = memoryStore.promotionRequests.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    memoryStore.promotionRequests.set(id, updated as PromotionRequest);
    return updated as PromotionRequest;
  },

  delete: (id: string): boolean => {
    return memoryStore.promotionRequests.delete(id);
  },
};

// 内存数据库接口
export const memoryDB = {
  employees: employeeOperations,
  performanceRecords: performanceRecordOperations,
  peerReviews: peerReviewOperations,
  quarterlySummaries: quarterlySummaryOperations,
  promotionRequests: promotionRequestOperations,
};

// 初始化内存数据库
export const memoryQuery = async (sql: string, params?: any[]): Promise<any[]> => {
  logger.info(`📦 Memory DB query: ${sql} ${params}`);
  
  if (sql.includes('SELECT') && sql.includes('employees')) {
    if (sql.includes('WHERE id = ?')) {
      const employee = memoryStore.employees.get(params?.[0]);
      return employee ? [employee] : [];
    }
    if (sql.includes('WHERE role = ?')) {
      return Array.from(memoryStore.employees.values()).filter(emp => emp.role === params?.[0]);
    }
    if (sql.includes('WHERE department = ?')) {
      return Array.from(memoryStore.employees.values()).filter(emp => emp.department === params?.[0]);
    }
    return Array.from(memoryStore.employees.values());
  }
  
  if (sql.includes('SELECT') && sql.includes('performance')) {
    return Array.from(memoryStore.performanceRecords.values());
  }
  
  logger.info(`⚠️ Unsupported memory database query: ${sql}`);
  return [];
};

export const initMemoryDB = (): void => {
  // 如果已有数据（被其他入口初始化过），不再清空
  if (memoryStore.employees.size > 0) {
    logger.info(`📦 内存数据库已有 ${memoryStore.employees.size} 条员工数据，跳过重新初始化`);
    return;
  }

  logger.info('📦 初始化内存数据库...');
  
  // 清空现有数据
  memoryStore.employees.clear();
  memoryStore.performanceRecords.clear();
  memoryStore.peerReviews.clear();
  memoryStore.quarterlySummaries.clear();
  memoryStore.promotionRequests.clear();
  memoryStore.departments.clear();
  memoryStore.positions.clear();
  memoryStore.assessmentCycles.clear();
  memoryStore.holidays.clear();
  memoryStore.performanceMetrics.clear();
  memoryStore.metricTemplates.clear();
  memoryStore.strategicObjectives.clear();
  memoryStore.objectives.clear();
  memoryStore.keyResults.clear();
  memoryStore.kpiAssignments.clear();
  memoryStore.performanceContracts.clear();
  memoryStore.monthlyReports.clear();
  memoryStore.performanceInterviews.clear();
  memoryStore.okrAssignments.clear();
  memoryStore.attachments.clear();
  memoryStore.peerReviewCycles.clear();
  memoryStore.peerReviewTasks.clear();
  memoryStore.bonusConfig.clear();
  memoryStore.bonusResults.clear();
  memoryStore.goalProgress?.clear();
  memoryStore.aiUsageLogs.clear();

  // 初始化默认部门
  const defaultDepts: Department[] = [
    { id: 'dept-1', name: '总公司', code: 'HQ', sortOrder: 0, status: 'active' },
    { id: 'dept-2', name: '技术部', code: 'TECH', parentId: 'dept-1', sortOrder: 1, status: 'active' },
    { id: 'dept-3', name: '市场部', code: 'MKT', parentId: 'dept-1', sortOrder: 2, status: 'active' },
    { id: 'dept-4', name: '人力资源部', code: 'HR', parentId: 'dept-1', sortOrder: 3, status: 'active' },
    { id: 'dept-5', name: '财务部', code: 'FIN', parentId: 'dept-1', sortOrder: 4, status: 'active' },
  ];
  defaultDepts.forEach(d => memoryStore.departments.set(d.id, d));

  // 初始化默认奖金配置
  memoryStore.bonusConfig.set('default', {
    id: 'default',
    rules: [
      { grade: 'A+', coefficient: 2.0, label: '卓越', minScore: 95 },
      { grade: 'A', coefficient: 1.5, label: '优秀', minScore: 85 },
      { grade: 'B+', coefficient: 1.2, label: '良好', minScore: 75 },
      { grade: 'B', coefficient: 1.0, label: '合格', minScore: 60 },
      { grade: 'C', coefficient: 0.5, label: '待改进', minScore: 40 },
      { grade: 'D', coefficient: 0, label: '不合格', minScore: 0 },
    ],
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  });
  
  logger.info('✅ 内存数据库已初始化');
};

// 清空所有数据（用于测试）
export const clearMemoryDB = (): void => {
  memoryStore.employees.clear();
  memoryStore.performanceRecords.clear();
  memoryStore.peerReviews.clear();
  memoryStore.quarterlySummaries.clear();
  memoryStore.promotionRequests.clear();
  memoryStore.departments.clear();
  memoryStore.positions.clear();
  memoryStore.assessmentCycles.clear();
  memoryStore.holidays.clear();
  memoryStore.performanceMetrics.clear();
  memoryStore.metricTemplates.clear();
  memoryStore.strategicObjectives.clear();
  memoryStore.objectives.clear();
  memoryStore.keyResults.clear();
  memoryStore.kpiAssignments.clear();
  memoryStore.performanceContracts.clear();
  memoryStore.monthlyReports.clear();
  memoryStore.performanceInterviews.clear();
  memoryStore.okrAssignments.clear();
  memoryStore.attachments.clear();
  memoryStore.peerReviewCycles.clear();
  memoryStore.peerReviewTasks.clear();
  memoryStore.bonusConfig.clear();
  memoryStore.bonusResults.clear();
  memoryStore.goalProgress?.clear();
  memoryStore.aiUsageLogs.clear();
};

// 获取统计信息
export const getMemoryDBStats = (): { 
  employees: number; 
  performanceRecords: number; 
  peerReviews: number;
  quarterlySummaries: number;
  promotionRequests: number;
  departments: number;
  positions: number;
  assessmentCycles: number;
  holidays: number;
  performanceMetrics: number;
  metricTemplates: number;
  strategicObjectives: number;
  objectives: number;
  keyResults: number;
  kpiAssignments: number;
  performanceContracts: number;
  monthlyReports: number;
  performanceInterviews: number;
  okrAssignments: number;
  attachments: number;
  peerReviewCycles: number;
  peerReviewTasks: number;
  bonusConfig: number;
  bonusResults: number;
} => {
  return {
    employees: memoryStore.employees.size,
    performanceRecords: memoryStore.performanceRecords.size,
    peerReviews: memoryStore.peerReviews.size,
    quarterlySummaries: memoryStore.quarterlySummaries.size,
    promotionRequests: memoryStore.promotionRequests.size,
    departments: memoryStore.departments.size,
    positions: memoryStore.positions.size,
    assessmentCycles: memoryStore.assessmentCycles.size,
    holidays: memoryStore.holidays.size,
    performanceMetrics: memoryStore.performanceMetrics.size,
    metricTemplates: memoryStore.metricTemplates.size,
    strategicObjectives: memoryStore.strategicObjectives.size,
    objectives: memoryStore.objectives.size,
    keyResults: memoryStore.keyResults.size,
    kpiAssignments: memoryStore.kpiAssignments.size,
    performanceContracts: memoryStore.performanceContracts.size,
    monthlyReports: memoryStore.monthlyReports.size,
    performanceInterviews: memoryStore.performanceInterviews.size,
    okrAssignments: memoryStore.okrAssignments.size,
    attachments: memoryStore.attachments.size,
    peerReviewCycles: memoryStore.peerReviewCycles.size,
    peerReviewTasks: memoryStore.peerReviewTasks.size,
    bonusConfig: memoryStore.bonusConfig.size,
    bonusResults: memoryStore.bonusResults.size,
  };
};
