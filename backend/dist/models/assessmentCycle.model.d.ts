import { AssessmentCycle, AssessmentCycleType, Holiday } from '../types';
export declare class AssessmentCycleModel {
    static findAll(): Promise<AssessmentCycle[]>;
    static findById(id: string): Promise<AssessmentCycle | null>;
    static findActive(): Promise<AssessmentCycle | null>;
    static findByYearAndType(year: number, type: AssessmentCycleType): Promise<AssessmentCycle | null>;
    static create(cycle: Omit<AssessmentCycle, 'createdAt' | 'updatedAt'>): Promise<AssessmentCycle>;
    static update(id: string, updates: Partial<AssessmentCycle>): Promise<AssessmentCycle | null>;
    static delete(id: string): Promise<boolean>;
    static findAllHolidays(year?: number): Promise<Holiday[]>;
    static createHoliday(holiday: Holiday): Promise<Holiday>;
    static deleteHoliday(id: string): Promise<boolean>;
    private static formatCycle;
    static generateMonthlyCycles(year: number): Promise<AssessmentCycle[]>;
}
//# sourceMappingURL=assessmentCycle.model.d.ts.map