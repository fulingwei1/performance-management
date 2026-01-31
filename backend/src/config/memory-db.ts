/**
 * 内存数据库实现 - 用于开发和演示模式
 * 提供完整的CRUD操作模拟
 */

import { Employee, PerformanceRecord, PeerReview, Department, Position, AssessmentCycle, Holiday, PerformanceMetric, MetricTemplate } from '../types';

// 内存数据存储
interface MemoryStore {
  employees: Map<string, Employee>;
  performanceRecords: Map<string, PerformanceRecord>;
  peerReviews: Map<string, PeerReview>;
  departments: Map<string, Department>;
  positions: Map<string, Position>;
  assessmentCycles: Map<string, AssessmentCycle>;
  holidays: Map<string, Holiday>;
  performanceMetrics: Map<string, PerformanceMetric>;
  metricTemplates: Map<string, MetricTemplate>;
}

export const memoryStore: MemoryStore = {
  employees: new Map(),
  performanceRecords: new Map(),
  peerReviews: new Map(),
  departments: new Map(),
  positions: new Map(),
  assessmentCycles: new Map(),
  holidays: new Map(),
  performanceMetrics: new Map(),
  metricTemplates: new Map(),
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

// 内存数据库接口
export const memoryDB = {
  employees: employeeOperations,
  performanceRecords: performanceRecordOperations,
  peerReviews: peerReviewOperations,
};

// 初始化内存数据库
export const initMemoryDB = (): void => {
  console.log('📦 初始化内存数据库...');
  
  // 清空现有数据
  memoryStore.employees.clear();
  memoryStore.performanceRecords.clear();
  memoryStore.peerReviews.clear();
  memoryStore.departments.clear();
  memoryStore.positions.clear();
  memoryStore.assessmentCycles.clear();
  memoryStore.holidays.clear();
  memoryStore.performanceMetrics.clear();
  memoryStore.metricTemplates.clear();
  
  console.log('✅ 内存数据库已初始化');
};

// 清空所有数据（用于测试）
export const clearMemoryDB = (): void => {
  memoryStore.employees.clear();
  memoryStore.performanceRecords.clear();
  memoryStore.peerReviews.clear();
  memoryStore.departments.clear();
  memoryStore.positions.clear();
  memoryStore.assessmentCycles.clear();
  memoryStore.holidays.clear();
  memoryStore.performanceMetrics.clear();
  memoryStore.metricTemplates.clear();
};

// 获取统计信息
export const getMemoryDBStats = (): { 
  employees: number; 
  performanceRecords: number; 
  peerReviews: number;
  departments: number;
  positions: number;
  assessmentCycles: number;
  holidays: number;
  performanceMetrics: number;
  metricTemplates: number;
} => {
  return {
    employees: memoryStore.employees.size,
    performanceRecords: memoryStore.performanceRecords.size,
    peerReviews: memoryStore.peerReviews.size,
    departments: memoryStore.departments.size,
    positions: memoryStore.positions.size,
    assessmentCycles: memoryStore.assessmentCycles.size,
    holidays: memoryStore.holidays.size,
    performanceMetrics: memoryStore.performanceMetrics.size,
    metricTemplates: memoryStore.metricTemplates.size,
  };
};
