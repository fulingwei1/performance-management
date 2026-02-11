import { PerformanceRecord } from '../types';
export declare class PerformanceModel {
    static findById(id: string): Promise<PerformanceRecord | null>;
    static findByEmployeeId(employeeId: string): Promise<PerformanceRecord[]>;
    static findByAssessorId(assessorId: string, month?: string): Promise<PerformanceRecord[]>;
    static findByMonth(month: string): Promise<PerformanceRecord[]>;
    static findAll(): Promise<PerformanceRecord[]>;
    static findByEmployeeIdAndMonth(employeeId: string, month: string): Promise<PerformanceRecord | null>;
    static update(id: string, data: Partial<PerformanceRecord>): Promise<PerformanceRecord | null>;
    static saveSummary(data: {
        id: string;
        employeeId: string;
        assessorId: string;
        month: string;
        selfSummary: string;
        nextMonthPlan: string;
        groupType: 'high' | 'low';
    }): Promise<PerformanceRecord>;
    static submitScore(data: {
        id: string;
        taskCompletion: number;
        initiative: number;
        projectFeedback: number;
        qualityImprovement: number;
        totalScore: number;
        level?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
        managerComment: string;
        nextMonthWorkArrangement: string;
        normalizedScore?: number;
    }): Promise<PerformanceRecord | null>;
    static updateRanks(month: string): Promise<void>;
    static delete(id: string): Promise<boolean>;
    static deleteByMonth(month: string): Promise<number>;
    static deleteAll(): Promise<number>;
    private static enrichRecord;
    private static formatRecord;
}
//# sourceMappingURL=performance.model.d.ts.map