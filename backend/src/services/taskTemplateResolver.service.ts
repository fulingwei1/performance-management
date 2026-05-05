import { AssessmentTemplate, AssessmentTemplateModel } from '../models/assessmentTemplate.model';
import {
  getConfiguredTemplateId,
  getOrgUnitKey,
  type PerformanceRankingConfigV1,
} from './performanceRankingConfig.service';

export type TaskTemplateSource = 'unit_config' | 'auto_match';

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
  unitKey: string,
  config: Pick<PerformanceRankingConfigV1, 'templateAssignments'>
): string | null {
  const normalizedUnitKey = String(unitKey || '').trim();
  if (!normalizedUnitKey) return null;

  for (const [configuredKey, templateId] of Object.entries(config.templateAssignments || {})) {
    const normalizedConfiguredKey = String(configuredKey || '').trim();
    const normalizedTemplateId = String(templateId || '').trim();
    if (normalizedConfiguredKey === normalizedUnitKey && normalizedTemplateId) {
      return normalizedTemplateId;
    }
  }

  return null;
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
 * 1. HR 在“考核范围/模板配置”里给当前组织单元精确选择的模板；
 * 2. 按岗位/级别/部门类型自动匹配更细颗粒度的任职资格模板；
 * 3. HR 给上级组织单元选择的模板作为兜底继承模板。
 *
 * 返回 null 表示没有可用模板，调用方应阻止或跳过生成，避免生成“无模板任务”。
 */
export async function resolveTaskTemplateForEmployee(
  employee: {
    role?: string;
    level?: string;
    position?: string;
    department?: string;
    subDepartment?: string;
  },
  rankingConfig: PerformanceRankingConfigV1
): Promise<ResolvedTaskTemplate | null> {
  const unitKey = getOrgUnitKey(employee);
  const exactConfigured = await toResolvedTemplate(
    getExactConfiguredTemplateId(unitKey, rankingConfig),
    'unit_config'
  );
  if (exactConfigured) return exactConfigured;

  const matched = await AssessmentTemplateModel.findMatchingTemplate({
    role: employee.role || '',
    level: employee.level || '',
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
