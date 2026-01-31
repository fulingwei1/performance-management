import { Employee, PerformanceRecord } from '../../types';
export declare const mockEmployees: Array<Employee & {
    username: string;
    password: string;
    email: string;
    position: string;
}>;
export declare const mockPerformanceRecords: PerformanceRecord[];
export declare const validLoginData: {
    username: string;
    password: string;
    role: string;
};
export declare const invalidLoginData: {
    username: string;
    password: string;
    role: string;
};
export declare const validEmployeeData: {
    id: string;
    password: string;
    name: string;
    department: string;
    subDepartment: string;
    role: "employee";
    level: "intermediate";
    managerId: string;
};
export declare const validSummaryData: {
    month: string;
    selfSummary: string;
    nextMonthPlan: string;
    taskCompletion: number;
    initiative: number;
    projectFeedback: number;
    qualityImprovement: number;
};
export declare const validScoreData: {
    id: string;
    taskCompletion: number;
    initiative: number;
    projectFeedback: number;
    qualityImprovement: number;
    managerComment: string;
    nextMonthWorkArrangement: string;
};
//# sourceMappingURL=mockData.d.ts.map