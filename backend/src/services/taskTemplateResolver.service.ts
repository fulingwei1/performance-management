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

/**
 * 生成月度绩效任务前解析员工考核模板。
 *
 * 顺序：
 * 1. HR 在“考核范围/模板配置”里给部门选的模板；
 * 2. 未配置或配置模板已停用时，按岗位/级别/部门类型自动匹配。
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
  const configuredTemplateId = getConfiguredTemplateId(getOrgUnitKey(employee), rankingConfig);
  if (configuredTemplateId) {
    const configuredTemplate = await AssessmentTemplateModel.findById(configuredTemplateId, false);
    if (isActiveTemplate(configuredTemplate)) {
      return {
        id: configuredTemplate.id,
        name: configuredTemplate.name,
        departmentType: configuredTemplate.departmentType,
        source: 'unit_config',
      };
    }
  }

  const matched = await AssessmentTemplateModel.findMatchingTemplate({
    role: employee.role || '',
    level: employee.level || '',
    position: employee.position || employee.subDepartment || employee.department || '',
    department: employee.department || '',
  });

  if (!isActiveTemplate(matched)) return null;

  return {
    id: matched.id,
    name: matched.name,
    departmentType: matched.departmentType,
    source: 'auto_match',
  };
}
