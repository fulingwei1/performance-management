import { EmployeeLevel } from '../types';
export declare const groupConfig: {
    highLevels: EmployeeLevel[];
    lowLevels: EmployeeLevel[];
};
export declare const getGroupType: (level: EmployeeLevel) => "high" | "low";
export declare const getCurrentMonth: () => string;
export declare const getCurrentQuarter: () => string;
export declare const generateId: (prefix: string) => string;
export declare const calculateTotalScore: (taskCompletion: number, initiative: number, projectFeedback: number, qualityImprovement: number) => number;
export declare const scoreToLevel: (score: number) => "L1" | "L2" | "L3" | "L4" | "L5";
export declare const levelToScore: (level: string) => number;
export declare const levelLabels: Record<string, string>;
export declare const roleLabels: Record<string, string>;
//# sourceMappingURL=helpers.d.ts.map