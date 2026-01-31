/**
 * 考核范围设置（参与考核部门）- 由人力资源部设置，内存存储
 */
export interface AssessmentScopeConfig {
    /** 整部门参与考核的一级部门 */
    rootDepts: string[];
    /** 按一级部门列出的参与考核的二级部门 */
    subDeptsByRoot: Record<string, string[]>;
}
export declare function getAssessmentScope(): AssessmentScopeConfig;
export declare function setAssessmentScope(config: AssessmentScopeConfig): AssessmentScopeConfig;
export declare function isInAssessmentScope(emp: {
    department?: string;
    subDepartment?: string;
}, config?: AssessmentScopeConfig): boolean;
//# sourceMappingURL=assessment-scope-store.d.ts.map