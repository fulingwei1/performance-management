import { AssessmentTemplate, AssessmentTemplateModel } from '../models/assessmentTemplate.model';
import {
  getConfiguredTemplateId,
  getOrgUnitKey,
  type PerformanceRankingConfigV1,
} from './performanceRankingConfig.service';

export type TaskTemplateSource = 'employee_override' | 'unit_config' | 'auto_match';

export type ResolvedTaskTemplate = {
  id: string;
  name: string;
  departmentType: AssessmentTemplate['departmentType'];
  source: TaskTemplateSource;
};

function isActiveTemplate(template: AssessmentTemplate | null | undefined): template is AssessmentTemplate {
  return Boolean(template && template.status === 'active');
}

function getExactConfiguredTemplateId(
  assignmentKey: string,
  config: Pick<PerformanceRankingConfigV1, 'templateAssignments'>
): string | null {
  const normalizedAssignmentKey = String(assignmentKey || '').trim();
  if (!normalizedAssignmentKey) return null;

  for (const [configuredKey, templateId] of Object.entries(config.templateAssignments || {})) {
    const normalizedConfiguredKey = String(configuredKey || '').trim();
    const normalizedTemplateId = String(templateId || '').trim();
    if (normalizedConfiguredKey === normalizedAssignmentKey && normalizedTemplateId) {
      return normalizedTemplateId;
    }
  }

  return null;
}

function getEmployeeTemplateAssignmentKey(employeeId?: string): string | null {
  const id = String(employeeId || '').trim();
  return id ? `employee:${id}` : null;
}

async function toResolvedTemplate(
  templateId: string | null | undefined,
  source: TaskTemplateSource
): Promise<ResolvedTaskTemplate | null> {
  if (!templateId) return null;

  const template = await AssessmentTemplateModel.findById(templateId, false);
  if (!isActiveTemplate(template)) return null;

  return {
    id: template.id,
    name: template.name,
    departmentType: template.departmentType,
    source,
  };
}

/**
 * 生成月度绩效任务前解析员工考核模板。
 *
 * 顺序：
 * 1. HR/Admin 给具体员工设置的个人模板；
 * 2. 按岗位/部门类型自动匹配更细颗粒度的岗位模板；
 * 3. 历史组织单元模板仅作为兜底继承模板，避免一个部门下不同岗位被锁成同一模板。
 *
 * 返回 null 表示没有可用模板，调用方应阻止或跳过生成，避免生成“无模板任务”。
 */
export async function resolveTaskTemplateForEmployee(
  employee: {
    id?: string;
    role?: string;
    level?: string;
    position?: string;
    department?: string;
    subDepartment?: string;
  },
  rankingConfig: PerformanceRankingConfigV1
): Promise<ResolvedTaskTemplate | null> {
  const unitKey = getOrgUnitKey(employee);
  const employeeAssignmentKey = getEmployeeTemplateAssignmentKey(employee.id);
  const employeeConfigured = await toResolvedTemplate(
    employeeAssignmentKey ? getExactConfiguredTemplateId(employeeAssignmentKey, rankingConfig) : null,
    'employee_override'
  );
  if (employeeConfigured) return employeeConfigured;

  const matched = await AssessmentTemplateModel.findMatchingTemplate({
    role: employee.role || '',
    // 绩效任务生成只看上下级关系；员工级别仅作档案展示，不参与模板自动匹配。
    level: '',
    position: employee.position || employee.subDepartment || employee.department || '',
    department: employee.department || '',
    subDepartment: employee.subDepartment || '',
  });

  if (isActiveTemplate(matched) && !matched.isDefault) {
    return {
      id: matched.id,
      name: matched.name,
      departmentType: matched.departmentType,
      source: 'auto_match',
    };
  }

  const inheritedConfigured = await toResolvedTemplate(getConfiguredTemplateId(unitKey, rankingConfig), 'unit_config');
  if (inheritedConfigured) return inheritedConfigured;

  if (!isActiveTemplate(matched)) return null;

  return {
    id: matched.id,
    name: matched.name,
    departmentType: matched.departmentType,
    source: 'auto_match',
  };
}
