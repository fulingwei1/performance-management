/**
 * 内存数据库实现 - 用于开发和演示模式
 * 提供完整的CRUD操作模拟
 */
import { Employee, PerformanceRecord, PeerReview, Department, Position, AssessmentCycle, Holiday, PerformanceMetric, MetricTemplate } from '../types';
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
export declare const memoryStore: MemoryStore;
export declare const memoryDB: {
    employees: {
        findById: (id: string) => Employee | undefined;
        findByName: (name: string) => Employee | undefined;
        findAll: () => Employee[];
        findByRole: (role: string) => Employee[];
        findByManagerId: (managerId: string) => Employee[];
        findByDepartment: (department: string) => Employee[];
        create: (employee: Employee) => Employee;
        update: (id: string, updates: Partial<Employee>) => Employee | undefined;
        delete: (id: string) => boolean;
        batchInsert: (employees: Employee[]) => void;
    };
    performanceRecords: {
        findById: (id: string) => PerformanceRecord | undefined;
        findByEmployeeId: (employeeId: string) => PerformanceRecord[];
        findByMonth: (month: string) => PerformanceRecord[];
        findAll: () => PerformanceRecord[];
        create: (record: PerformanceRecord) => PerformanceRecord;
        update: (id: string, updates: Partial<PerformanceRecord>) => PerformanceRecord | undefined;
        delete: (id: string) => boolean;
    };
    peerReviews: {
        findById: (id: string) => PeerReview | undefined;
        findByReviewerId: (reviewerId: string) => PeerReview[];
        findByRevieweeId: (revieweeId: string) => PeerReview[];
        findByRecordId: (recordId: string) => PeerReview[];
        create: (review: PeerReview) => PeerReview;
        update: (id: string, updates: Partial<PeerReview>) => PeerReview | undefined;
        delete: (id: string) => boolean;
    };
};
export declare const initMemoryDB: () => void;
export declare const clearMemoryDB: () => void;
export declare const getMemoryDBStats: () => {
    employees: number;
    performanceRecords: number;
    peerReviews: number;
    departments: number;
    positions: number;
    assessmentCycles: number;
    holidays: number;
    performanceMetrics: number;
    metricTemplates: number;
};
export {};
//# sourceMappingURL=memory-db.d.ts.map