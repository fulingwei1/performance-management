/**
 * 内存数据库实现 - 用于开发和演示模式
 * 提供完整的CRUD操作模拟
 */

import { Employee, PerformanceRecord, Department } from '../types';
import { Notification } from '../models/notification.model';
import logger from './logger';

// 内存数据存储
interface MemoryStore {
  employees: Map<string, Employee>;
  performanceRecords: Map<string, PerformanceRecord>;
  departments: Map<string, Department>;
  notifications?: Map<string, Notification>;
  todos?: Map<string, any>;
  assessmentTemplates?: Map<string, any>;
  templateMetrics?: Map<string, any>;
  metricScoringCriteria?: Map<string, any>;
  departmentTemplates?: Map<string, any>;
  systemSettings?: Map<string, any>;
  monthlyAssessments?: Map<string, any>;
  performanceArchives?: Map<string, any>;
  monthlyReportSummaries?: Map<string, any>;
  automationLogs?: Map<string, any>;
  loginLogs?: Map<string, any>;
}

export const memoryStore: MemoryStore = {
  employees: new Map(),
  performanceRecords: new Map(),
  departments: new Map(),
  notifications: new Map(),

  assessmentTemplates: new Map(),
  templateMetrics: new Map(),
  metricScoringCriteria: new Map(),
  departmentTemplates: new Map(),
  systemSettings: new Map(),
  monthlyAssessments: new Map(),
  performanceArchives: new Map(),
  monthlyReportSummaries: new Map(),
  automationLogs: new Map(),
  loginLogs: new Map(),
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

// 内存数据库接口
export const memoryDB = {
  employees: employeeOperations,
  performanceRecords: performanceRecordOperations,
};

// 初始化内存数据库
export const memoryQuery = async (sql: string, params?: any[]): Promise<any[]> => {
  logger.info(`📦 Memory DB query: ${sql} ${params}`);
  
  if (sql.includes('SELECT') && sql.includes('performance_records')) {
    const records = Array.from(memoryStore.performanceRecords.values()) as any[];

    if (sql.includes('JOIN employees')) {
      const [startDate, endDate] = params || [];
      return records
        .filter(record => record.frozen === false)
        .filter(record => ['draft'].includes(record.status))
        .filter(record => !startDate || record.deadline >= startDate)
        .filter(record => !endDate || record.deadline <= endDate)
        .map(record => {
          const employeeId = record.employee_id || record.employeeId;
          const employee = memoryStore.employees.get(employeeId);
          return {
            id: record.id,
            employee_id: employeeId,
            month: record.month,
            deadline: record.deadline,
            status: record.status,
            employee_name: employee?.name || record.employee_name,
          };
        });
    }

    return records;
  }

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
  memoryStore.departments.clear();
  // 初始化默认部门
  const defaultDepts: Department[] = [
    { id: 'dept-1', name: '总公司', code: 'HQ', sortOrder: 0, status: 'active' },
    { id: 'dept-2', name: '技术部', code: 'TECH', parentId: 'dept-1', sortOrder: 1, status: 'active' },
    { id: 'dept-3', name: '市场部', code: 'MKT', parentId: 'dept-1', sortOrder: 2, status: 'active' },
    { id: 'dept-4', name: '人力资源部', code: 'HR', parentId: 'dept-1', sortOrder: 3, status: 'active' },
    { id: 'dept-5', name: '财务部', code: 'FIN', parentId: 'dept-1', sortOrder: 4, status: 'active' },
  ];
  defaultDepts.forEach(d => memoryStore.departments.set(d.id, d));

  logger.info('✅ 内存数据库已初始化');
};

// 清空所有数据（用于测试）
export const clearMemoryDB = (): void => {
  memoryStore.employees.clear();
  memoryStore.performanceRecords.clear();
  memoryStore.departments.clear();
};

// 获取统计信息
export const getMemoryDBStats = (): { 
  employees: number; 
  performanceRecords: number; 
  departments: number;
} => {
  return {
    employees: memoryStore.employees.size,
    performanceRecords: memoryStore.performanceRecords.size,
    departments: memoryStore.departments.size,
  };
};
