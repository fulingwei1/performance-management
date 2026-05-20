import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { AssessmentTemplateModel } from './assessmentTemplate.model';
import { getConfiguredTemplateId, getOrgUnitKey, getPerformanceRankingConfig } from '../services/performanceRankingConfig.service';

export interface LevelTemplateRule {
  id: string;
  departmentType: string;
  level: string;
  templateId: string;
  templateName?: string;
  setBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 部门→部门类型映射（与 local-schema.ts 保持一致）
 */
export function getDepartmentType(department: string): string {
  const d = department?.trim() || '';
  if (/营销|销售/.test(d)) return 'sales';
  if (/项目管理/.test(d)) return 'engineering';
  if (/工程|技术|研发/.test(d)) return 'engineering';
  if (/制造|生产|品质/.test(d)) return 'manufacturing';
  if (/总经|管理|总办/.test(d)) return 'management';
  return 'support'; // 人力、财务、采购、项目管理、教育装备等
}

function getTemplateLevelCandidates(employee: { role?: string; level?: string }): string[] {
  const normalizedRole = (employee.role || '').trim();
  const normalizedLevel = (employee.level || 'junior').trim() || 'junior';
  const candidates: string[] = [];

  if (normalizedRole === 'manager') candidates.push('manager');
  if (normalizedRole === 'gm') candidates.push('manager', 'senior');

  candidates.push(normalizedLevel);

  if (normalizedLevel === 'assistant') candidates.push('junior');
  if (normalizedLevel === 'intermediate') candidates.push('junior');

  return Array.from(new Set(candidates.filter(Boolean)));
}

function getExactConfiguredTemplateId(unitKey: string, templateAssignments: Record<string, string>): string | null {
  const normalizedUnitKey = String(unitKey || '').trim();
  if (!normalizedUnitKey) return null;

  for (const [configuredKey, templateId] of Object.entries(templateAssignments || {})) {
    const normalizedConfiguredKey = String(configuredKey || '').trim();
    const normalizedTemplateId = String(templateId || '').trim();
    if (normalizedConfiguredKey === normalizedUnitKey && normalizedTemplateId) {
      return normalizedTemplateId;
    }
  }

  return null;
}

export class LevelTemplateRuleModel {
  /**
   * 创建或更新规则（UPSERT by department_type + level）
   */
  static async upsert(data: {
    departmentType: string;
    level: string;
    templateId: string;
    setBy: string;
  }): Promise<LevelTemplateRule> {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO level_template_rules (id, department_type, level, template_id, set_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (department_type, level)
       DO UPDATE SET template_id = $4, set_by = $5, updated_at = NOW()
       RETURNING *`,
      [id, data.departmentType, data.level, data.templateId, data.setBy]
    );
    return result[0];
  }

  /**
   * 批量设置规则
   */
  static async batchUpsert(
    rules: Array<{ departmentType: string; level: string; templateId: string }>,
    setBy: string
  ): Promise<LevelTemplateRule[]> {
    const results: LevelTemplateRule[] = [];
    for (const rule of rules) {
      const r = await this.upsert({ ...rule, setBy });
      results.push(r);
    }
    return results;
  }

  /**
   * 获取所有规则
   */
  static async getAll(): Promise<any[]> {
    const result = await query(
      `SELECT r.*, t.name as template_name
       FROM level_template_rules r
       LEFT JOIN assessment_templates t ON r.template_id = t.id
       ORDER BY r.department_type, r.level`
    );
    return result;
  }

  /**
   * 获取某部门类型的规则
   */
  static async getByDepartmentType(departmentType: string): Promise<any[]> {
    const result = await query(
      `SELECT r.*, t.name as template_name
       FROM level_template_rules r
       LEFT JOIN assessment_templates t ON r.template_id = t.id
       WHERE r.department_type = $1
       ORDER BY r.level`,
      [departmentType]
    );
    return result;
  }

  /**
   * 删除规则
   */
  static async delete(departmentType: string, level: string): Promise<void> {
    await query(
      'DELETE FROM level_template_rules WHERE department_type = $1 AND level = $2',
      [departmentType, level]
    );
  }

  /**
   * ★ 核心：解析员工的最终模板
   * 优先级：精确组织单元覆盖 > 部门×层级规则 > 自动匹配 > 上级组织单元覆盖兜底 > 默认兜底
   *
   * 注意：考核范围里勾选“工程技术中心/制造中心”只是确定谁参与考核，不应把整个中心都锁死到一个模板。
   * 只有精确选到员工所在组织单元的模板才算强覆盖；父级覆盖只在没有岗位/层级模板可匹配时兜底。
   */
  static async resolveTemplate(employeeId: string): Promise<{
    templateId: string;
    templateName: string;
    source: 'unit_config' | 'level_rule' | 'auto_match' | 'default';
    departmentType: string;
    level: string;
  }> {
    // 1. 获取员工信息
    const empResult = await query('SELECT * FROM employees WHERE id = $1', [employeeId]);
    if (empResult.length === 0) {
      throw new Error('员工不存在');
    }
    const employee = empResult[0];
    const departmentType = getDepartmentType(employee.department);
    const levelCandidates = getTemplateLevelCandidates(employee);
    const level = levelCandidates[0] || 'junior';
    const unitKey = getOrgUnitKey({
      department: employee.department,
      subDepartment: employee.sub_department || employee.subDepartment,
    });

    // 2. 查精确组织单元指定模板（不继承父级，避免把整个中心锁成一个模板）
    const rankingConfig = await getPerformanceRankingConfig();
    const exactConfiguredTemplateId = getExactConfiguredTemplateId(unitKey, rankingConfig.templateAssignments || {});
    if (exactConfiguredTemplateId) {
      const exactConfiguredTemplateResult = await query(
        `SELECT id, name FROM assessment_templates WHERE id = $1 AND status = 'active'`,
        [exactConfiguredTemplateId]
      );
      if (exactConfiguredTemplateResult.length > 0) {
        return {
          templateId: exactConfiguredTemplateResult[0].id,
          templateName: exactConfiguredTemplateResult[0].name,
          source: 'unit_config',
          departmentType,
          level
        };
      }
    }

    // 3. 查部门×层级规则
    const ruleResult = await query(
      `SELECT r.*, t.name as template_name
       FROM level_template_rules r
       JOIN assessment_templates t ON r.template_id = t.id
       WHERE r.department_type = $1
         AND r.level = ANY($2::text[])
         AND t.status = 'active'
       ORDER BY array_position($2::text[], r.level)
       LIMIT 1`,
      [departmentType, levelCandidates]
    );
    if (ruleResult.length > 0) {
      return {
        templateId: ruleResult[0].template_id,
        templateName: ruleResult[0].template_name,
        source: 'level_rule',
        departmentType,
        level: ruleResult[0].level
      };
    }

    // 5. 自动匹配（优先使用模板适用岗位/任职等级；岗位泛化为“工程师”时结合二/三级部门识别）
    const matchedTemplate = await AssessmentTemplateModel.findMatchingTemplate({
      role: employee.role || '',
      level: employee.level || '',
      position: employee.position || employee.sub_department || employee.subDepartment || employee.department || '',
      department: employee.department || '',
      subDepartment: employee.sub_department || employee.subDepartment || '',
    });
    if (matchedTemplate && matchedTemplate.status === 'active' && !matchedTemplate.isDefault) {
      return {
        templateId: matchedTemplate.id,
        templateName: matchedTemplate.name,
        source: 'auto_match',
        departmentType: matchedTemplate.departmentType || departmentType,
        level
      };
    }

    // 6. 查继承的参与部门指定模板：只作为自动匹配失败后的兜底
    const inheritedConfiguredTemplateId = getConfiguredTemplateId(unitKey, rankingConfig);
    if (inheritedConfiguredTemplateId) {
      const inheritedConfiguredTemplateResult = await query(
        `SELECT id, name FROM assessment_templates WHERE id = $1 AND status = 'active'`,
        [inheritedConfiguredTemplateId]
      );
      if (inheritedConfiguredTemplateResult.length > 0) {
        return {
          templateId: inheritedConfiguredTemplateResult[0].id,
          templateName: inheritedConfiguredTemplateResult[0].name,
          source: 'unit_config',
          departmentType,
          level
        };
      }
    }

    // 7. 兼容旧模板：模板名含层级关键词
    const autoResult = await query(
      `SELECT id, name FROM assessment_templates
       WHERE department_type = $1
       AND status = 'active'
       AND (
         ('manager' = ANY($2::text[]) AND (name LIKE '%经理%' OR name LIKE '%主管%' OR name LIKE '%总监%' OR name LIKE '%高管%'))
         OR ('senior' = ANY($2::text[]) AND (name LIKE '%高级%' OR name LIKE '%主管%'))
         OR ('intermediate' = ANY($2::text[]) AND (name LIKE '%中级%' OR name LIKE '%普通%' OR name LIKE '%标准%'))
         OR ('junior' = ANY($2::text[]) AND (name LIKE '%初级%' OR name LIKE '%普通%' OR name LIKE '%标准%'))
       )
       ORDER BY
         CASE
           WHEN 'manager' = ANY($2::text[]) AND (name LIKE '%经理%' OR name LIKE '%主管%' OR name LIKE '%总监%' OR name LIKE '%高管%') THEN 0
           WHEN 'senior' = ANY($2::text[]) AND name LIKE '%高级%' THEN 1
           WHEN 'intermediate' = ANY($2::text[]) AND name LIKE '%中级%' THEN 2
           WHEN 'junior' = ANY($2::text[]) AND name LIKE '%初级%' THEN 3
           ELSE 4
         END
       LIMIT 1`,
      [departmentType, levelCandidates]
    );
    if (autoResult.length > 0) {
      return {
        templateId: autoResult[0].id,
        templateName: autoResult[0].name,
        source: 'auto_match',
        departmentType,
        level
      };
    }

    if (matchedTemplate && matchedTemplate.status === 'active') {
      return {
        templateId: matchedTemplate.id,
        templateName: matchedTemplate.name,
        source: 'default',
        departmentType: matchedTemplate.departmentType || departmentType,
        level
      };
    }

    // 8. 兜底：取部门类型的 default 模板
    const defaultResult = await query(
      `SELECT id, name FROM assessment_templates
       WHERE department_type = $1
         AND status = 'active'
         AND (name LIKE '%标准%' OR name LIKE '%default%')
       ORDER BY is_default DESC, priority DESC, updated_at DESC
       LIMIT 1`,
      [departmentType]
    );
    if (defaultResult.length > 0) {
      return {
        templateId: defaultResult[0].id,
        templateName: defaultResult[0].name,
        source: 'default',
        departmentType,
        level
      };
    }

    // 7. 最终兜底
    const anyResult = await query(
      `SELECT id, name FROM assessment_templates
       WHERE status = 'active'
       ORDER BY is_default DESC, priority DESC, updated_at DESC
       LIMIT 1`
    );
    if (anyResult.length > 0) {
      return {
        templateId: anyResult[0].id,
        templateName: anyResult[0].name,
        source: 'default',
        departmentType,
        level
      };
    }

    throw new Error('没有可用的考核模板');
  }

  /**
   * 获取部门×层级规则覆盖统计
   */
  static async getCoverageStats(): Promise<any> {
    // 获取所有规则
    const rules = await query(
      `SELECT department_type, level FROM level_template_rules`
    );
    // 获取所有活跃员工
    const employees = await query(
      `SELECT department, level FROM employees WHERE status = 'active' AND role NOT IN ('admin')`
    );
    // 按部门类型+层级统计
    const stats: Record<string, any> = {};
    for (const emp of employees) {
      const deptType = getDepartmentType(emp.department);
      const lvl = emp.level || 'junior';
      const key = `${deptType}:${lvl}`;
      if (!stats[key]) {
        const hasRule = rules.some((r: any) => r.department_type === deptType && r.level === lvl);
        stats[key] = { department: emp.department, departmentType: deptType, level: lvl, employeeCount: 0, hasRule };
      }
      stats[key].employeeCount++;
    }
    return Object.values(stats);
  }
}
