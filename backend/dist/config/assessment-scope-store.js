"use strict";
/**
 * 考核范围设置（参与考核部门）- 由人力资源部设置，内存存储
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssessmentScope = getAssessmentScope;
exports.setAssessmentScope = setAssessmentScope;
exports.isInAssessmentScope = isInAssessmentScope;
const defaultScope = {
    rootDepts: [],
    subDeptsByRoot: {}
};
let scope = { ...defaultScope };
function getAssessmentScope() {
    return { ...scope };
}
function setAssessmentScope(config) {
    scope = {
        rootDepts: Array.isArray(config.rootDepts) ? [...config.rootDepts] : [],
        subDeptsByRoot: config.subDeptsByRoot && typeof config.subDeptsByRoot === 'object'
            ? { ...config.subDeptsByRoot }
            : {}
    };
    return getAssessmentScope();
}
function isInAssessmentScope(emp, config = scope) {
    const dept = (emp.department ?? '').trim();
    const sub = (emp.subDepartment ?? '').trim();
    if (config.rootDepts.includes(dept))
        return true;
    const subs = config.subDeptsByRoot[dept];
    if (subs && subs.includes(sub))
        return true;
    return false;
}
//# sourceMappingURL=assessment-scope-store.js.map