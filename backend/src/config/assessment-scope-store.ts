/**
 * 考核范围设置（参与考核部门）- 由人力资源部设置，内存存储
 */

export interface AssessmentScopeConfig {
  /** 整部门参与考核的一级部门 */
  rootDepts: string[];
  /** 按一级部门列出的参与考核的二级部门 */
  subDeptsByRoot: Record<string, string[]>;
}

const defaultScope: AssessmentScopeConfig = {
  rootDepts: [],
  subDeptsByRoot: {}
};

let scope: AssessmentScopeConfig = { ...defaultScope };

export function getAssessmentScope(): AssessmentScopeConfig {
  return { ...scope };
}

export function setAssessmentScope(config: AssessmentScopeConfig): AssessmentScopeConfig {
  scope = {
    rootDepts: Array.isArray(config.rootDepts) ? [...config.rootDepts] : [],
    subDeptsByRoot: config.subDeptsByRoot && typeof config.subDeptsByRoot === 'object'
      ? { ...config.subDeptsByRoot }
      : {}
  };
  return getAssessmentScope();
}

export function isInAssessmentScope(
  emp: { department?: string; subDepartment?: string },
  config: AssessmentScopeConfig = scope
): boolean {
  const dept = (emp.department ?? '').trim();
  const sub = (emp.subDepartment ?? '').trim();
  if (config.rootDepts.includes(dept)) return true;
  const subs = config.subDeptsByRoot[dept];
  if (subs && subs.includes(sub)) return true;
  return false;
}
