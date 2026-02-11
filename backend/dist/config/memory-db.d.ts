/**
 * 内存数据库实现 - 用于开发和演示模式
 * 提供完整的CRUD操作模拟
 */
import { Employee, PerformanceRecord, PeerReview, Department, Position, AssessmentCycle, Holiday, PerformanceMetric, MetricTemplate, PromotionRequest, QuarterlySummary, StrategicObjective, Objective, KeyResult, KpiAssignment, PerformanceContract, MonthlyReport, PerformanceInterview, OkrAssignment, Attachment, PeerReviewCycle, PeerReviewTask, BonusConfig, BonusResult, GoalProgress } from '../types';
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
    quarterlySummaries: {
        findById: (id: string) => QuarterlySummary | undefined;
        findByManagerId: (managerId: string) => QuarterlySummary[];
        findAll: () => QuarterlySummary[];
        create: (summary: QuarterlySummary) => QuarterlySummary;
        update: (id: string, updates: Partial<QuarterlySummary>) => QuarterlySummary | undefined;
        delete: (id: string) => boolean;
    };
    promotionRequests: {
        findById: (id: string) => PromotionRequest | undefined;
        findByEmployeeId: (employeeId: string) => PromotionRequest[];
        findByRequesterId: (requesterId: string) => PromotionRequest[];
        findAll: () => PromotionRequest[];
        create: (request: PromotionRequest) => PromotionRequest;
        update: (id: string, updates: Partial<PromotionRequest>) => PromotionRequest | undefined;
        delete: (id: string) => boolean;
    };
};
export declare const memoryQuery: (sql: string, params?: any[]) => Promise<any[]>;
export declare const initMemoryDB: () => void;
export declare const clearMemoryDB: () => void;
export declare const getMemoryDBStats: () => {
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
};
export {};
//# sourceMappingURL=memory-db.d.ts.map