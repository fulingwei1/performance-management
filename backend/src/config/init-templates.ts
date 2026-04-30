/**
 * 金凯博自动化 — 非标自动化行业考核模板体系
 * 
 * 行业特点：项目制定制、多专业协同（机械/电气/软件）、长交付周期、
 *           技术攻关密集、跨部门协作多、售后成本高
 * 
 * 模板体系：10大岗位 × 多层级 = 30+ 模板
 * - 每个岗位有兜底模板（isDefault=true, priority=0）
 * - 每个岗位×层级组合有专用模板（priority=30~50）
 * - 匹配规则：岗位精确匹配(50) > 层级匹配(30) > 部门兜底(0)
 */

import { memoryStore, query, USE_MEMORY_DB } from './database';
import logger from './logger';

// ============================================
// 模板注册辅助函数
// ============================================

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  department_type: string;
  is_default: boolean;
  status: string;
  applicableRoles?: string[];
  applicableLevels?: string[];
  applicablePositions?: string[];
  priority: number;
}

interface MetricDef {
  id: string;
  template_id: string;
  metric_name: string;
  metric_code: string;
  category: string;
  weight: number;
  description: string;
  evaluation_type: string;
  sort_order: number;
}

function registerTemplate(t: TemplateDef) {
  memoryStore.assessmentTemplates?.set(t.id, {
    id: t.id, name: t.name, description: t.description,
    department_type: t.department_type, is_default: t.is_default, status: t.status,
    applicable_roles: t.applicableRoles || [], applicable_levels: t.applicableLevels || [],
    applicable_positions: t.applicablePositions || [], priority: t.priority,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });
}

function registerMetrics(metrics: MetricDef[]) {
  metrics.forEach(m => memoryStore.templateMetrics?.set(m.id, m));
}

async function syncTemplatesToDatabase() {
  if (USE_MEMORY_DB) return;

  const templates = Array.from(memoryStore.assessmentTemplates?.values() || []);
  const metrics = Array.from(memoryStore.templateMetrics?.values() || []);

  if (templates.length === 0) return;

  await query(`
    ALTER TABLE assessment_templates
      ADD COLUMN IF NOT EXISTS applicable_roles TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS applicable_levels TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS applicable_positions TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0
  `);

  const arrayColumnTypes = await query(`
    SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_name = 'assessment_templates'
      AND column_name IN ('applicable_roles', 'applicable_levels', 'applicable_positions')
  `);
  const columnTypeMap = new Map(arrayColumnTypes.map((row: any) => [row.column_name, row.udt_name]));
  const castFor = (columnName: string) => columnTypeMap.get(columnName) === 'jsonb' ? '::jsonb' : '::text[]';
  const valueFor = (columnName: string, value: string[]) => (
    columnTypeMap.get(columnName) === 'jsonb' ? JSON.stringify(value || []) : (value || [])
  );

  for (const t of templates) {
    await query(
      `INSERT INTO assessment_templates (
        id, name, description, department_type, is_default, status,
        applicable_roles, applicable_levels, applicable_positions, priority,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7${castFor('applicable_roles')}, $8${castFor('applicable_levels')}, $9${castFor('applicable_positions')}, $10,
        COALESCE($11::timestamp, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        department_type = EXCLUDED.department_type,
        is_default = EXCLUDED.is_default,
        status = EXCLUDED.status,
        applicable_roles = EXCLUDED.applicable_roles,
        applicable_levels = EXCLUDED.applicable_levels,
        applicable_positions = EXCLUDED.applicable_positions,
        priority = EXCLUDED.priority,
        updated_at = CURRENT_TIMESTAMP`,
      [
        t.id,
        t.name,
        t.description,
        t.department_type,
        t.is_default,
        t.status || 'active',
        valueFor('applicable_roles', t.applicable_roles || []),
        valueFor('applicable_levels', t.applicable_levels || []),
        valueFor('applicable_positions', t.applicable_positions || []),
        t.priority || 0,
        t.created_at || null,
      ]
    );
  }

  for (const m of metrics) {
    await query(
      `INSERT INTO template_metrics (
        id, template_id, metric_name, metric_code, category, weight,
        description, evaluation_type, sort_order, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        template_id = EXCLUDED.template_id,
        metric_name = EXCLUDED.metric_name,
        metric_code = EXCLUDED.metric_code,
        category = EXCLUDED.category,
        weight = EXCLUDED.weight,
        description = EXCLUDED.description,
        evaluation_type = EXCLUDED.evaluation_type,
        sort_order = EXCLUDED.sort_order`,
      [
        m.id,
        m.template_id,
        m.metric_name,
        m.metric_code,
        m.category,
        m.weight,
        m.description,
        m.evaluation_type,
        m.sort_order,
      ]
    );
  }

  logger.info(`✅ 已同步 ${templates.length} 个行业考核模板、${metrics.length} 个指标到本地 PostgreSQL`);
}

// ============================================
// 主初始化函数
// ============================================

export async function initializeDefaultTemplates() {
  logger.info('📦 初始化金凯博自动化考核模板（非标自动化行业专用）...');
  memoryStore.assessmentTemplates?.clear();
  memoryStore.templateMetrics?.clear();
  memoryStore.metricScoringCriteria?.clear();

  // ============================================
  // 1. 机械设计工程师（非标自动化核心）
  // ============================================

  // 1.1 机械设计 - 兜底模板
  registerTemplate({
    id: 'template-mech-default', name: '机械设计部门标准模板',
    description: '适用于机械设计岗位：3D设计40%+出图质量30%+BOM与标准件15%+协作15%',
    department_type: 'engineering', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-mech-def-01', template_id: 'template-mech-default', metric_name: '3D建模与设计质量', metric_code: '3D_DESIGN_QUALITY', category: 'performance', weight: 20.00, description: '3D模型准确性、设计合理性、可制造性', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-mech-def-02', template_id: 'template-mech-default', metric_name: '2D出图质量', metric_code: '2D_DRAWING_QUALITY', category: 'performance', weight: 15.00, description: '工程图完整性、标注准确性、公差合理性', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-mech-def-03', template_id: 'template-mech-default', metric_name: 'BOM准确性', metric_code: 'BOM_ACCURACY', category: 'performance', weight: 15.00, description: 'BOM清单准确率、无遗漏', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-mech-def-04', template_id: 'template-mech-default', metric_name: '设计变更率', metric_code: 'DESIGN_CHANGE_RATE', category: 'performance', weight: 15.00, description: '设计变更次数/项目数，反映设计一次通过率', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-mech-def-05', template_id: 'template-mech-default', metric_name: '标准件复用率', metric_code: 'STD_PART_REUSE', category: 'innovation', weight: 10.00, description: '标准件和成熟模块复用程度', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-mech-def-06', template_id: 'template-mech-default', metric_name: '设计按期交付', metric_code: 'DESIGN_ON_TIME', category: 'performance', weight: 15.00, description: '设计任务按时完成率', evaluation_type: 'quantitative', sort_order: 6 },
    { id: 'metric-mech-def-07', template_id: 'template-mech-default', metric_name: '跨部门协作', metric_code: 'CROSS_TEAM_COLLAB', category: 'collaboration', weight: 10.00, description: '与电气/软件/采购/装配的配合', evaluation_type: 'qualitative', sort_order: 7 },
  ]);

  // 1.2 机械设计 - 高级/专家工程师
  registerTemplate({
    id: 'template-mech-senior-001', name: '机械设计高级工程师考核模板',
    description: '高级/专家机械工程师：技术攻坚40%+方案设计30%+标准建设15%+指导15%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['senior'],
    applicablePositions: ['高级机械工程师', '机械专家', '首席机械工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-mech-snr-01', template_id: 'template-mech-senior-001', metric_name: '核心技术攻坚', metric_code: 'CORE_TECH_BREAKTHROUGH', category: 'performance', weight: 25.00, description: '复杂机构设计、关键技术方案攻关', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-mech-snr-02', template_id: 'template-mech-senior-001', metric_name: '方案设计能力', metric_code: 'CONCEPT_DESIGN', category: 'performance', weight: 20.00, description: '方案可行性、创新性、成本意识', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-mech-snr-03', template_id: 'template-mech-senior-001', metric_name: '设计评审质量', metric_code: 'DESIGN_REVIEW', category: 'performance', weight: 15.00, description: '评审问题发现率、方案优化建议', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-mech-snr-04', template_id: 'template-mech-senior-001', metric_name: '标准化建设', metric_code: 'STANDARDIZATION', category: 'innovation', weight: 15.00, description: '标准模块库建设、设计规范制定', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-mech-snr-05', template_id: 'template-mech-senior-001', metric_name: '技术指导', metric_code: 'TECH_MENTORING', category: 'collaboration', weight: 15.00, description: '指导中初级工程师、技术分享', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-mech-snr-06', template_id: 'template-mech-senior-001', metric_name: '专利与技术成果', metric_code: 'PATENT_INNOVATION', category: 'innovation', weight: 10.00, description: '专利提案、技术论文', evaluation_type: 'quantitative', sort_order: 6 },
  ]);

  // 1.3 机械设计 - 中级工程师
  registerTemplate({
    id: 'template-mech-inter-001', name: '机械设计中级工程师考核模板',
    description: '中级机械工程师：独立设计50%+出图质量20%+BOM15%+协作15%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['intermediate'],
    applicablePositions: ['机械工程师', '机械设计工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-mech-int-01', template_id: 'template-mech-inter-001', metric_name: '独立设计能力', metric_code: 'INDEPENDENT_DESIGN', category: 'performance', weight: 25.00, description: '独立完成子模块设计的能力和效率', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-mech-int-02', template_id: 'template-mech-inter-001', metric_name: '3D建模质量', metric_code: '3D_MODEL_QUALITY', category: 'performance', weight: 20.00, description: '模型准确性、干涉检查通过率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-mech-int-03', template_id: 'template-mech-inter-001', metric_name: '2D出图质量', metric_code: '2D_DRAWING_QUALITY', category: 'performance', weight: 15.00, description: '工程图完整准确、符合国标', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-mech-int-04', template_id: 'template-mech-inter-001', metric_name: 'BOM准确率', metric_code: 'BOM_ACCURACY', category: 'performance', weight: 15.00, description: 'BOM无遗漏、物料规格正确', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-mech-int-05', template_id: 'template-mech-inter-001', metric_name: '设计按期交付', metric_code: 'DESIGN_ON_TIME', category: 'performance', weight: 15.00, description: '按时完成设计任务', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-mech-int-06', template_id: 'template-mech-inter-001', metric_name: '跨部门协作', metric_code: 'COLLABORATION', category: 'collaboration', weight: 10.00, description: '与电气/装配/采购的配合', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 1.4 机械设计 - 初级工程师
  registerTemplate({
    id: 'template-mech-junior-001', name: '机械设计初级工程师考核模板',
    description: '初级机械工程师：学习成长30%+辅助设计40%+基础出图20%+态度10%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['junior'],
    applicablePositions: ['助理机械工程师', '见习机械工程师', '初级机械工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-mech-jnr-01', template_id: 'template-mech-junior-001', metric_name: '辅助设计贡献', metric_code: 'ASSIST_DESIGN', category: 'performance', weight: 25.00, description: '辅助完成设计任务的完成情况', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-mech-jnr-02', template_id: 'template-mech-junior-001', metric_name: '3D建模学习', metric_code: '3D_LEARNING', category: 'performance', weight: 15.00, description: 'SolidWorks等工具掌握程度', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-mech-jnr-03', template_id: 'template-mech-junior-001', metric_name: '出图规范性', metric_code: 'DRAWING_STANDARD', category: 'performance', weight: 15.00, description: '出图符合规范、标注准确', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-mech-jnr-04', template_id: 'template-mech-junior-001', metric_name: '学习成长', metric_code: 'LEARNING_GROWTH', category: 'behavior', weight: 30.00, description: '技术学习进度、培训参与度', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-mech-jnr-05', template_id: 'template-mech-junior-001', metric_name: '工作态度', metric_code: 'WORK_ATTITUDE', category: 'behavior', weight: 15.00, description: '主动性、责任心、执行力', evaluation_type: 'qualitative', sort_order: 5 },
  ]);

  // ============================================
  // 2. 电气工程师（PLC/伺服/现场总线）
  // ============================================

  // 2.1 电气 - 兜底模板
  registerTemplate({
    id: 'template-elec-default', name: '电气部门标准模板',
    description: '适用于电气岗位：PLC编程35%+电气设计25%+调试30%+安全10%',
    department_type: 'engineering', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-elec-def-01', template_id: 'template-elec-default', metric_name: 'PLC编程质量', metric_code: 'PLC_PROGRAM_QUALITY', category: 'performance', weight: 25.00, description: '程序逻辑正确性、可读性、异常处理', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-elec-def-02', template_id: 'template-elec-default', metric_name: '电气设计质量', metric_code: 'ELEC_DESIGN_QUALITY', category: 'performance', weight: 20.00, description: '电气原理图、接线图、选型合理性', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-elec-def-03', template_id: 'template-elec-default', metric_name: '调试一次通过率', metric_code: 'DEBUG_FIRST_PASS', category: 'performance', weight: 20.00, description: '电气调试一次验收通过率', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-elec-def-04', template_id: 'template-elec-default', metric_name: '按期交付', metric_code: 'ON_TIME_DELIVERY', category: 'performance', weight: 15.00, description: '电气部分按期完成', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-elec-def-05', template_id: 'template-elec-default', metric_name: '安全规范遵守', metric_code: 'SAFETY_COMPLIANCE', category: 'performance', weight: 10.00, description: '电气安全标准、接地、防护', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-elec-def-06', template_id: 'template-elec-default', metric_name: '文档完整性', metric_code: 'DOCUMENTATION', category: 'performance', weight: 10.00, description: '程序注释、操作说明、接线文档', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 2.2 电气 - 高级工程师
  registerTemplate({
    id: 'template-elec-senior-001', name: '电气高级工程师考核模板',
    description: '高级电气工程师：技术攻坚40%+架构设计25%+调试20%+标准建设15%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['senior'],
    applicablePositions: ['高级电气工程师', '电气专家', '首席电气工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-elec-snr-01', template_id: 'template-elec-senior-001', metric_name: '技术攻坚', metric_code: 'TECH_BREAKTHROUGH', category: 'performance', weight: 25.00, description: '复杂运动控制、总线通讯、安全PLC攻关', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-elec-snr-02', template_id: 'template-elec-senior-001', metric_name: '架构设计', metric_code: 'ARCH_DESIGN', category: 'performance', weight: 20.00, description: '电气架构方案、选型、成本控制', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-elec-snr-03', template_id: 'template-elec-senior-001', metric_name: '调试效率', metric_code: 'DEBUG_EFFICIENCY', category: 'performance', weight: 20.00, description: '调试周期缩短、问题快速定位', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-elec-snr-04', template_id: 'template-elec-senior-001', metric_name: '标准化建设', metric_code: 'STANDARDIZATION', category: 'innovation', weight: 15.00, description: '标准程序库、功能块封装', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-elec-snr-05', template_id: 'template-elec-senior-001', metric_name: '技术指导', metric_code: 'MENTORING', category: 'collaboration', weight: 10.00, description: '指导中初级工程师', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-elec-snr-06', template_id: 'template-elec-senior-001', metric_name: '技术创新', metric_code: 'TECH_INNOVATION', category: 'innovation', weight: 10.00, description: '新技术应用、工艺改进', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 2.3 电气 - 中级工程师
  registerTemplate({
    id: 'template-elec-inter-001', name: '电气中级工程师考核模板',
    description: '中级电气工程师：独立编程40%+电气设计25%+调试25%+协作10%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['intermediate'],
    applicablePositions: ['电气工程师', 'PLC工程师', '自动化工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-elec-int-01', template_id: 'template-elec-inter-001', metric_name: 'PLC编程能力', metric_code: 'PLC_SKILL', category: 'performance', weight: 25.00, description: '独立完成PLC程序编写', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-elec-int-02', template_id: 'template-elec-inter-001', metric_name: '电气设计', metric_code: 'ELEC_DESIGN', category: 'performance', weight: 20.00, description: '原理图、接线图设计质量', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-elec-int-03', template_id: 'template-elec-inter-001', metric_name: '调试能力', metric_code: 'DEBUG_SKILL', category: 'performance', weight: 20.00, description: '现场调试、问题排查', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-elec-int-04', template_id: 'template-elec-inter-001', metric_name: '按期交付', metric_code: 'ON_TIME', category: 'performance', weight: 15.00, description: '按期完成电气任务', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-elec-int-05', template_id: 'template-elec-inter-001', metric_name: '机械协作', metric_code: 'MECH_COLLAB', category: 'collaboration', weight: 10.00, description: '与机械设计的配合', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-elec-int-06', template_id: 'template-elec-inter-001', metric_name: '文档规范', metric_code: 'DOC_STANDARD', category: 'performance', weight: 10.00, description: '程序注释、文档完整', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 2.4 电气 - 初级工程师
  registerTemplate({
    id: 'template-elec-junior-001', name: '电气初级工程师考核模板',
    description: '初级电气工程师：学习30%+辅助编程35%+接线图15%+态度20%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['junior'],
    applicablePositions: ['助理电气工程师', '见习电气工程师', '初级电气工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-elec-jnr-01', template_id: 'template-elec-junior-001', metric_name: '辅助编程', metric_code: 'ASSIST_PROGRAM', category: 'performance', weight: 25.00, description: '辅助完成PLC程序编写和测试', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-elec-jnr-02', template_id: 'template-elec-junior-001', metric_name: '接线图绘制', metric_code: 'WIRING_DRAWING', category: 'performance', weight: 15.00, description: '电气接线图绘制质量', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-elec-jnr-03', template_id: 'template-elec-junior-001', metric_name: '调试辅助', metric_code: 'ASSIST_DEBUG', category: 'performance', weight: 10.00, description: '辅助现场调试', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-elec-jnr-04', template_id: 'template-elec-junior-001', metric_name: '学习成长', metric_code: 'LEARNING', category: 'behavior', weight: 30.00, description: 'PLC/电气知识学习进度', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-elec-jnr-05', template_id: 'template-elec-junior-001', metric_name: '工作态度', metric_code: 'ATTITUDE', category: 'behavior', weight: 20.00, description: '主动性、责任心', evaluation_type: 'qualitative', sort_order: 5 },
  ]);

  // ============================================
  // 3. 软件工程师（视觉/上位机/ MES）
  // ============================================

  registerTemplate({
    id: 'template-sw-default', name: '软件部门标准模板',
    description: '适用于软件岗位：开发质量40%+效率25%+稳定性20%+协作15%',
    department_type: 'engineering', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-sw-def-01', template_id: 'template-sw-default', metric_name: '代码质量', metric_code: 'CODE_QUALITY', category: 'performance', weight: 20.00, description: '代码规范、可读性、架构合理性', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-sw-def-02', template_id: 'template-sw-default', metric_name: 'Bug率', metric_code: 'BUG_RATE', category: 'performance', weight: 15.00, description: '千行代码Bug数、严重Bug数', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sw-def-03', template_id: 'template-sw-default', metric_name: '系统稳定性', metric_code: 'STABILITY', category: 'performance', weight: 20.00, description: '系统运行稳定性、崩溃率', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-sw-def-04', template_id: 'template-sw-default', metric_name: '按期交付', metric_code: 'ON_TIME', category: 'performance', weight: 15.00, description: '开发任务按期完成', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-sw-def-05', template_id: 'template-sw-default', metric_name: '视觉算法能力', metric_code: 'VISION_ALGO', category: 'performance', weight: 15.00, description: '视觉识别准确率、算法优化', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-sw-def-06', template_id: 'template-sw-default', metric_name: '设备联调', metric_code: 'EQUIPMENT_INTEGRATION', category: 'collaboration', weight: 15.00, description: '与PLC/硬件的通讯联调', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 3.2 软件 - 高级工程师
  registerTemplate({
    id: 'template-sw-senior-001', name: '软件高级工程师考核模板',
    description: '高级软件工程师：架构设计30%+技术攻坚25%+稳定性20%+指导15%+创新10%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['senior'],
    applicablePositions: ['高级软件工程师', '视觉算法工程师', '上位机专家'], priority: 50
  });
  registerMetrics([
    { id: 'metric-sw-snr-01', template_id: 'template-sw-senior-001', metric_name: '架构设计', metric_code: 'ARCH_DESIGN', category: 'performance', weight: 25.00, description: '系统架构设计、框架选型', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-sw-snr-02', template_id: 'template-sw-senior-001', metric_name: '技术攻坚', metric_code: 'TECH_BREAKTHROUGH', category: 'performance', weight: 20.00, description: '视觉算法攻关、性能优化', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-sw-snr-03', template_id: 'template-sw-senior-001', metric_name: '系统稳定性', metric_code: 'STABILITY', category: 'performance', weight: 20.00, description: '系统长时间运行稳定性', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-sw-snr-04', template_id: 'template-sw-senior-001', metric_name: '标准化建设', metric_code: 'STANDARDIZATION', category: 'innovation', weight: 15.00, description: '框架封装、通用组件', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-sw-snr-05', template_id: 'template-sw-senior-001', metric_name: '技术指导', metric_code: 'MENTORING', category: 'collaboration', weight: 10.00, description: '代码Review、技术分享', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-sw-snr-06', template_id: 'template-sw-senior-001', metric_name: '技术创新', metric_code: 'INNOVATION', category: 'innovation', weight: 10.00, description: '新技术引入、算法优化', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 3.3 软件 - 中级工程师
  registerTemplate({
    id: 'template-sw-inter-001', name: '软件中级工程师考核模板',
    description: '中级软件工程师：独立开发45%+代码质量20%+联调20%+学习15%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['intermediate'],
    applicablePositions: ['软件工程师', '上位机工程师', '视觉工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-sw-int-01', template_id: 'template-sw-inter-001', metric_name: '独立开发', metric_code: 'INDEPENDENT_DEV', category: 'performance', weight: 25.00, description: '独立完成模块开发', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-sw-int-02', template_id: 'template-sw-inter-001', metric_name: '代码质量', metric_code: 'CODE_QUALITY', category: 'performance', weight: 20.00, description: '代码规范、注释完整', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-sw-int-03', template_id: 'template-sw-inter-001', metric_name: 'Bug控制', metric_code: 'BUG_CONTROL', category: 'performance', weight: 15.00, description: '测试阶段Bug数量', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-sw-int-04', template_id: 'template-sw-inter-001', metric_name: '设备联调', metric_code: 'EQUIPMENT_INTEGRATION', category: 'performance', weight: 20.00, description: '与PLC/相机的通讯联调', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-sw-int-05', template_id: 'template-sw-inter-001', metric_name: '按期交付', metric_code: 'ON_TIME', category: 'performance', weight: 10.00, description: '开发任务按期完成', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-sw-int-06', template_id: 'template-sw-inter-001', metric_name: '学习成长', metric_code: 'LEARNING', category: 'behavior', weight: 10.00, description: '技术学习、技能提升', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 3.4 软件 - 初级工程师
  registerTemplate({
    id: 'template-sw-junior-001', name: '软件初级工程师考核模板',
    description: '初级软件工程师：学习35%+辅助开发35%+测试20%+态度10%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['junior'],
    applicablePositions: ['助理软件工程师', '见习软件工程师', '初级软件工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-sw-jnr-01', template_id: 'template-sw-junior-001', metric_name: '辅助开发', metric_code: 'ASSIST_DEV', category: 'performance', weight: 25.00, description: '辅助完成开发任务', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sw-jnr-02', template_id: 'template-sw-junior-001', metric_name: '测试执行', metric_code: 'TEST_EXECUTION', category: 'performance', weight: 15.00, description: '测试用例执行、Bug报告', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sw-jnr-03', template_id: 'template-sw-junior-001', metric_name: '编程基础', metric_code: 'CODING_BASICS', category: 'performance', weight: 15.00, description: 'C#/Python/C++基础', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-sw-jnr-04', template_id: 'template-sw-junior-001', metric_name: '学习成长', metric_code: 'LEARNING', category: 'behavior', weight: 30.00, description: '技术学习进度', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-sw-jnr-05', template_id: 'template-sw-junior-001', metric_name: '工作态度', metric_code: 'ATTITUDE', category: 'behavior', weight: 15.00, description: '主动性、责任心', evaluation_type: 'qualitative', sort_order: 5 },
  ]);

  // ============================================
  // 4. 装配技师（非标自动化核心技能岗）
  // ============================================

  registerTemplate({
    id: 'template-assembly-default', name: '装配部门标准模板',
    description: '适用于装配岗位：装配质量40%+效率25%+安全20%+现场管理15%',
    department_type: 'manufacturing', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-asm-def-01', template_id: 'template-assembly-default', metric_name: '装配质量', metric_code: 'ASSEMBLY_QUALITY', category: 'performance', weight: 25.00, description: '装配精度、工艺执行', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-asm-def-02', template_id: 'template-assembly-default', metric_name: '一次装配合格率', metric_code: 'FIRST_PASS_RATE', category: 'performance', weight: 15.00, description: '一次装配合格无需返工', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-asm-def-03', template_id: 'template-assembly-default', metric_name: '装配效率', metric_code: 'ASSEMBLY_EFFICIENCY', category: 'performance', weight: 15.00, description: '单位工时产出', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-asm-def-04', template_id: 'template-assembly-default', metric_name: '按期交付', metric_code: 'ON_TIME', category: 'performance', weight: 15.00, description: '装配任务按期完成', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-asm-def-05', template_id: 'template-assembly-default', metric_name: '安全生产', metric_code: 'SAFETY', category: 'performance', weight: 15.00, description: '安全操作规范、零事故', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-asm-def-06', template_id: 'template-assembly-default', metric_name: '现场5S', metric_code: '5S', category: 'behavior', weight: 10.00, description: '现场整理整顿', evaluation_type: 'qualitative', sort_order: 6 },
    { id: 'metric-asm-def-07', template_id: 'template-assembly-default', metric_name: '问题反馈', metric_code: 'ISSUE_REPORT', category: 'collaboration', weight: 5.00, description: '设计问题及时反馈', evaluation_type: 'qualitative', sort_order: 7 },
  ]);

  // 4.2 装配 - 高级技师/班组长
  registerTemplate({
    id: 'template-assembly-senior-001', name: '装配高级技师/班组长考核模板',
    description: '高级技师/班组长：技术攻坚30%+团队效率25%+质量把控20%+安全15%+培训10%',
    department_type: 'manufacturing', is_default: false, status: 'active',
    applicableRoles: ['manager', 'employee'], applicableLevels: ['senior'],
    applicablePositions: ['装配班组长', '高级装配技师', '装配主管'], priority: 50
  });
  registerMetrics([
    { id: 'metric-asm-snr-01', template_id: 'template-assembly-senior-001', metric_name: '复杂装配', metric_code: 'COMPLEX_ASSEMBLY', category: 'performance', weight: 20.00, description: '精密机构、复杂设备的装配', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-asm-snr-02', template_id: 'template-assembly-senior-001', metric_name: '团队效率', metric_code: 'TEAM_EFFICIENCY', category: 'performance', weight: 20.00, description: '班组整体装配效率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-asm-snr-03', template_id: 'template-assembly-senior-001', metric_name: '质量把控', metric_code: 'QUALITY_CONTROL', category: 'performance', weight: 20.00, description: '班组装配质量', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-asm-snr-04', template_id: 'template-assembly-senior-001', metric_name: '安全管理', metric_code: 'SAFETY_MGMT', category: 'performance', weight: 15.00, description: '安全培训、隐患排查', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-asm-snr-05', template_id: 'template-assembly-senior-001', metric_name: '工艺改进', metric_code: 'PROCESS_IMPROVE', category: 'innovation', weight: 15.00, description: '装配工艺优化、工装改进', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-asm-snr-06', template_id: 'template-assembly-senior-001', metric_name: '技能培训', metric_code: 'TRAINING', category: 'collaboration', weight: 10.00, description: '指导初级装配工', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 4.3 装配 - 中级技师
  registerTemplate({
    id: 'template-assembly-inter-001', name: '装配中级技师考核模板',
    description: '中级装配技师：独立装配45%+质量20%+效率20%+安全15%',
    department_type: 'manufacturing', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['intermediate'],
    applicablePositions: ['装配技师', '中级装配工', '钳工'], priority: 50
  });
  registerMetrics([
    { id: 'metric-asm-int-01', template_id: 'template-assembly-inter-001', metric_name: '独立装配', metric_code: 'INDEPENDENT_ASSEMBLY', category: 'performance', weight: 25.00, description: '独立完成设备装配', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-asm-int-02', template_id: 'template-assembly-inter-001', metric_name: '装配质量', metric_code: 'ASSEMBLY_QUALITY', category: 'performance', weight: 20.00, description: '装配精度、返工率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-asm-int-03', template_id: 'template-assembly-inter-001', metric_name: '装配效率', metric_code: 'EFFICIENCY', category: 'performance', weight: 20.00, description: '按时完成装配任务', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-asm-int-04', template_id: 'template-assembly-inter-001', metric_name: '安全生产', metric_code: 'SAFETY', category: 'performance', weight: 15.00, description: '安全操作', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-asm-int-05', template_id: 'template-assembly-inter-001', metric_name: '5S执行', metric_code: '5S', category: 'behavior', weight: 10.00, description: '现场5S', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-asm-int-06', template_id: 'template-assembly-inter-001', metric_name: '问题反馈', metric_code: 'ISSUE_REPORT', category: 'collaboration', weight: 10.00, description: '设计/物料问题及时反馈', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 4.4 装配 - 初级/学徒
  registerTemplate({
    id: 'template-assembly-junior-001', name: '装配初级技师考核模板',
    description: '初级装配工：学习30%+辅助装配40%+安全20%+纪律10%',
    department_type: 'manufacturing', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['junior'],
    applicablePositions: ['装配学徒', '初级装配工', '实习装配工'], priority: 50
  });
  registerMetrics([
    { id: 'metric-asm-jnr-01', template_id: 'template-assembly-junior-001', metric_name: '辅助装配', metric_code: 'ASSIST_ASSEMBLY', category: 'performance', weight: 25.00, description: '辅助完成装配任务', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-asm-jnr-02', template_id: 'template-assembly-junior-001', metric_name: '技能学习', metric_code: 'SKILL_LEARNING', category: 'performance', weight: 20.00, description: '装配技能学习进度', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-asm-jnr-03', template_id: 'template-assembly-junior-001', metric_name: '安全规范', metric_code: 'SAFETY', category: 'performance', weight: 25.00, description: '安全操作规范遵守', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-asm-jnr-04', template_id: 'template-assembly-junior-001', metric_name: '劳动纪律', metric_code: 'DISCIPLINE', category: 'behavior', weight: 15.00, description: '出勤、服从安排', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-asm-jnr-05', template_id: 'template-assembly-junior-001', metric_name: '工作态度', metric_code: 'ATTITUDE', category: 'behavior', weight: 15.00, description: '主动性、学习意愿', evaluation_type: 'qualitative', sort_order: 5 },
  ]);

  // ============================================
  // 5. 调试工程师
  // ============================================

  registerTemplate({
    id: 'template-debug-default', name: '调试部门标准模板',
    description: '适用于调试岗位：调试质量35%+效率25%+客户验收20%+安全10%+文档10%',
    department_type: 'engineering', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-dbg-def-01', template_id: 'template-debug-default', metric_name: '调试质量', metric_code: 'DEBUG_QUALITY', category: 'performance', weight: 25.00, description: '设备调试精度、功能完整性', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-dbg-def-02', template_id: 'template-debug-default', metric_name: '调试周期', metric_code: 'DEBUG_CYCLE', category: 'performance', weight: 20.00, description: '调试周期控制在计划内', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-dbg-def-03', template_id: 'template-debug-default', metric_name: '客户验收通过率', metric_code: 'CLIENT_ACCEPTANCE', category: 'performance', weight: 20.00, description: '客户现场验收一次通过率', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-dbg-def-04', template_id: 'template-debug-default', metric_name: '问题定位', metric_code: 'PROBLEM_LOCATE', category: 'performance', weight: 15.00, description: '快速定位和解决问题', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-dbg-def-05', template_id: 'template-debug-default', metric_name: '安全生产', metric_code: 'SAFETY', category: 'performance', weight: 10.00, description: '调试安全操作', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-dbg-def-06', template_id: 'template-debug-default', metric_name: '文档记录', metric_code: 'DOCUMENTATION', category: 'performance', weight: 10.00, description: '调试记录、问题总结', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  registerTemplate({
    id: 'template-debug-senior-001', name: '调试高级工程师考核模板',
    description: '高级调试工程师：技术攻坚35%+客户验收25%+效率20%+标准化10%+指导10%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['senior'],
    applicablePositions: ['高级调试工程师', '调试专家', '现场调试主管'], priority: 50
  });
  registerMetrics([
    { id: 'metric-dbg-snr-01', template_id: 'template-debug-senior-001', metric_name: '技术攻坚', metric_code: 'TECH_BREAKTHROUGH', category: 'performance', weight: 25.00, description: '复杂问题攻关、现场异常处理', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-dbg-snr-02', template_id: 'template-debug-senior-001', metric_name: '客户验收', metric_code: 'CLIENT_ACCEPTANCE', category: 'performance', weight: 25.00, description: '客户满意度、验收通过率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-dbg-snr-03', template_id: 'template-debug-senior-001', metric_name: '调试效率', metric_code: 'EFFICIENCY', category: 'performance', weight: 20.00, description: '调试周期缩短', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-dbg-snr-04', template_id: 'template-debug-senior-001', metric_name: '标准化建设', metric_code: 'STANDARDIZATION', category: 'innovation', weight: 15.00, description: '调试SOP、常见问题库', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-dbg-snr-05', template_id: 'template-debug-senior-001', metric_name: '问题反馈', metric_code: 'ISSUE_FEEDBACK', category: 'collaboration', weight: 10.00, description: '向设计端反馈问题', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-dbg-snr-06', template_id: 'template-debug-senior-001', metric_name: '技术指导', metric_code: 'MENTORING', category: 'collaboration', weight: 5.00, description: '指导初中级调试工程师', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  registerTemplate({
    id: 'template-debug-inter-001', name: '调试中级工程师考核模板',
    description: '中级调试工程师：独立调试40%+客户验收25%+效率20%+文档15%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['intermediate'],
    applicablePositions: ['调试工程师', '现场调试工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-dbg-int-01', template_id: 'template-debug-inter-001', metric_name: '独立调试', metric_code: 'INDEPENDENT_DEBUG', category: 'performance', weight: 25.00, description: '独立完成设备调试', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-dbg-int-02', template_id: 'template-debug-inter-001', metric_name: '调试质量', metric_code: 'DEBUG_QUALITY', category: 'performance', weight: 20.00, description: '调试精度、功能达标', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-dbg-int-03', template_id: 'template-debug-inter-001', metric_name: '客户沟通', metric_code: 'CLIENT_COMM', category: 'collaboration', weight: 15.00, description: '与客户的技术沟通', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-dbg-int-04', template_id: 'template-debug-inter-001', metric_name: '按期交付', metric_code: 'ON_TIME', category: 'performance', weight: 20.00, description: '按期完成调试', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-dbg-int-05', template_id: 'template-debug-inter-001', metric_name: '文档记录', metric_code: 'DOCUMENTATION', category: 'performance', weight: 10.00, description: '调试记录完整', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-dbg-int-06', template_id: 'template-debug-inter-001', metric_name: '安全生产', metric_code: 'SAFETY', category: 'performance', weight: 10.00, description: '安全操作', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // ============================================
  // 6. 项目经理
  // ============================================

  registerTemplate({
    id: 'template-pm-default', name: '项目经理标准模板',
    description: '适用于项目经理：交付率40%+成本控制20%+客户满意度20%+团队10%+风险10%',
    department_type: 'engineering', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-pm-def-01', template_id: 'template-pm-default', metric_name: '项目交付率', metric_code: 'PROJECT_DELIVERY', category: 'performance', weight: 25.00, description: '项目按期交付比例', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-pm-def-02', template_id: 'template-pm-default', metric_name: '成本控制', metric_code: 'COST_CONTROL', category: 'performance', weight: 20.00, description: '项目成本控制在预算内', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-pm-def-03', template_id: 'template-pm-default', metric_name: '客户满意度', metric_code: 'CLIENT_SATISFACTION', category: 'performance', weight: 20.00, description: '客户满意度评分', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-pm-def-04', template_id: 'template-pm-default', metric_name: '风险管理', metric_code: 'RISK_MGMT', category: 'performance', weight: 15.00, description: '风险识别和应对', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-pm-def-05', template_id: 'template-pm-default', metric_name: '团队协调', metric_code: 'TEAM_COORD', category: 'collaboration', weight: 10.00, description: '跨部门协调', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-pm-def-06', template_id: 'template-pm-default', metric_name: '项目文档', metric_code: 'DOC_MGMT', category: 'performance', weight: 10.00, description: '项目文档完整性', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  registerTemplate({
    id: 'template-pm-senior-001', name: '高级项目经理考核模板',
    description: '高级项目经理：大型项目40%+利润贡献20%+客户战略15%+标准化15%+团队10%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['manager'], applicableLevels: ['senior'],
    applicablePositions: ['高级项目经理', '项目总监', '项目主管'], priority: 50
  });
  registerMetrics([
    { id: 'metric-pm-snr-01', template_id: 'template-pm-senior-001', metric_name: '大型项目交付', metric_code: 'LARGE_PROJECT', category: 'performance', weight: 25.00, description: '百万级以上项目交付', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-pm-snr-02', template_id: 'template-pm-senior-001', metric_name: '项目利润', metric_code: 'PROJECT_PROFIT', category: 'performance', weight: 20.00, description: '项目利润率达标', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-pm-snr-03', template_id: 'template-pm-senior-001', metric_name: '客户关系', metric_code: 'CLIENT_RELATION', category: 'performance', weight: 15.00, description: '大客户维护、复购', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-pm-snr-04', template_id: 'template-pm-senior-001', metric_name: '流程优化', metric_code: 'PROCESS_OPT', category: 'innovation', weight: 15.00, description: '项目管理流程优化', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-pm-snr-05', template_id: 'template-pm-senior-001', metric_name: '团队建设', metric_code: 'TEAM_BUILDING', category: 'collaboration', weight: 15.00, description: '项目经理培养', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-pm-snr-06', template_id: 'template-pm-senior-001', metric_name: '知识沉淀', metric_code: 'KNOWLEDGE', category: 'innovation', weight: 10.00, description: '项目经验总结、案例库', evaluation_type: 'quantitative', sort_order: 6 },
  ]);

  registerTemplate({
    id: 'template-pm-inter-001', name: '中级项目经理考核模板',
    description: '中级项目经理：交付率35%+成本控制20%+客户沟通20%+风险15%+文档10%',
    department_type: 'engineering', is_default: false, status: 'active',
    applicableRoles: ['manager'], applicableLevels: ['intermediate'],
    applicablePositions: ['项目经理', '项目工程师'], priority: 50
  });
  registerMetrics([
    { id: 'metric-pm-int-01', template_id: 'template-pm-inter-001', metric_name: '项目交付', metric_code: 'PROJECT_DELIVERY', category: 'performance', weight: 25.00, description: '按期交付', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-pm-int-02', template_id: 'template-pm-inter-001', metric_name: '进度把控', metric_code: 'SCHEDULE_CONTROL', category: 'performance', weight: 20.00, description: '进度节点达成', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-pm-int-03', template_id: 'template-pm-inter-001', metric_name: '成本控制', metric_code: 'COST_CONTROL', category: 'performance', weight: 15.00, description: '预算内完成', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-pm-int-04', template_id: 'template-pm-inter-001', metric_name: '客户沟通', metric_code: 'CLIENT_COMM', category: 'collaboration', weight: 15.00, description: '客户需求管理和沟通', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-pm-int-05', template_id: 'template-pm-inter-001', metric_name: '风险管理', metric_code: 'RISK_MGMT', category: 'performance', weight: 15.00, description: '风险预警和应对', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-pm-int-06', template_id: 'template-pm-inter-001', metric_name: '项目文档', metric_code: 'DOCUMENTATION', category: 'performance', weight: 10.00, description: '文档完整规范', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // ============================================
  // 7. 采购工程师
  // ============================================

  registerTemplate({
    id: 'template-purch-default', name: '采购部门标准模板',
    description: '适用于采购岗位：交期达成30%+成本节约20%+质量20%+供应商15%+响应15%',
    department_type: 'support', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-purch-def-01', template_id: 'template-purch-default', metric_name: '交期达成率', metric_code: 'DELIVERY_RATE', category: 'performance', weight: 25.00, description: '物料按期到货率', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-purch-def-02', template_id: 'template-purch-default', metric_name: '成本节约', metric_code: 'COST_SAVING', category: 'performance', weight: 20.00, description: '采购成本降低', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-purch-def-03', template_id: 'template-purch-default', metric_name: '来料合格率', metric_code: 'INCOMING_QUALITY', category: 'performance', weight: 20.00, description: '采购物料合格率', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-purch-def-04', template_id: 'template-purch-default', metric_name: '供应商管理', metric_code: 'SUPPLIER_MGMT', category: 'performance', weight: 15.00, description: '供应商评估、开发', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-purch-def-05', template_id: 'template-purch-default', metric_name: '急单响应', metric_code: 'URGENT_RESPONSE', category: 'performance', weight: 10.00, description: '紧急采购响应速度', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-purch-def-06', template_id: 'template-purch-default', metric_name: '合规性', metric_code: 'COMPLIANCE', category: 'performance', weight: 10.00, description: '采购流程合规', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  registerTemplate({
    id: 'template-purch-senior-001', name: '高级采购工程师考核模板',
    description: '高级采购：战略采购30%+成本25%+供应商20%+急单15%+流程优化10%',
    department_type: 'support', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['senior'],
    applicablePositions: ['高级采购工程师', '采购主管', '采购经理'], priority: 50
  });
  registerMetrics([
    { id: 'metric-purch-snr-01', template_id: 'template-purch-senior-001', metric_name: '战略采购', metric_code: 'STRATEGIC_PURCH', category: 'performance', weight: 25.00, description: '关键物料供应商战略', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-purch-snr-02', template_id: 'template-purch-senior-001', metric_name: '成本节约', metric_code: 'COST_SAVING', category: 'performance', weight: 25.00, description: '年度成本节约目标', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-purch-snr-03', template_id: 'template-purch-senior-001', metric_name: '供应商优化', metric_code: 'SUPPLIER_OPT', category: 'performance', weight: 20.00, description: '供应商评估、淘汰、开发', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-purch-snr-04', template_id: 'template-purch-senior-001', metric_name: '供应链风险', metric_code: 'SUPPLY_RISK', category: 'performance', weight: 15.00, description: '供应链风险管理', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-purch-snr-05', template_id: 'template-purch-senior-001', metric_name: '流程优化', metric_code: 'PROCESS_OPT', category: 'innovation', weight: 10.00, description: '采购流程改进', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-purch-snr-06', template_id: 'template-purch-senior-001', metric_name: '库存优化', metric_code: 'INVENTORY_OPT', category: 'performance', weight: 5.00, description: '库存周转率优化', evaluation_type: 'quantitative', sort_order: 6 },
  ]);

  // ============================================
  // 8. 质量工程师（IQC/IPQC/OQC）
  // ============================================

  registerTemplate({
    id: 'template-qa-default', name: '质量部门标准模板',
    description: '适用于质量岗位：检验质量35%+制程控制25%+客诉处理20%+体系15%+改进5%',
    department_type: 'support', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-qa-def-01', template_id: 'template-qa-default', metric_name: '检验准确率', metric_code: 'INSPECTION_ACCURACY', category: 'performance', weight: 25.00, description: '检验无漏检、误检', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-qa-def-02', template_id: 'template-qa-default', metric_name: '制程不良率', metric_code: 'PROCESS_DEFECT_RATE', category: 'performance', weight: 20.00, description: '制程不良率控制', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-qa-def-03', template_id: 'template-qa-default', metric_name: '客诉处理', metric_code: 'COMPLAINT_HANDLE', category: 'performance', weight: 20.00, description: '客诉响应和处理时效', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-qa-def-04', template_id: 'template-qa-default', metric_name: '体系审核', metric_code: 'SYSTEM_AUDIT', category: 'performance', weight: 15.00, description: 'ISO体系审核通过', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-qa-def-05', template_id: 'template-qa-default', metric_name: '检验按期', metric_code: 'INSPECTION_ON_TIME', category: 'performance', weight: 10.00, description: '检验按时完成', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-qa-def-06', template_id: 'template-qa-default', metric_name: '改进建议', metric_code: 'IMPROVEMENT', category: 'innovation', weight: 10.00, description: '质量改进提案', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  registerTemplate({
    id: 'template-qa-senior-001', name: '高级质量工程师考核模板',
    description: '高级质量工程师：体系建设30%+质量分析25%+供应商质量20%+客诉15%+改进10%',
    department_type: 'support', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['senior'],
    applicablePositions: ['高级质量工程师', '质量主管', '质量经理'], priority: 50
  });
  registerMetrics([
    { id: 'metric-qa-snr-01', template_id: 'template-qa-senior-001', metric_name: '体系建设', metric_code: 'SYSTEM_BUILD', category: 'performance', weight: 25.00, description: '质量体系建立和维护', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-qa-snr-02', template_id: 'template-qa-senior-001', metric_name: '质量分析', metric_code: 'QUALITY_ANALYSIS', category: 'performance', weight: 20.00, description: '质量数据分析、趋势预判', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-qa-snr-03', template_id: 'template-qa-senior-001', metric_name: '供应商质量', metric_code: 'SUPPLIER_QUALITY', category: 'performance', weight: 20.00, description: '供应商质量管控', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-qa-snr-04', template_id: 'template-qa-senior-001', metric_name: '客诉管理', metric_code: 'COMPLAINT_MGMT', category: 'performance', weight: 15.00, description: '客诉闭环、8D报告', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-qa-snr-05', template_id: 'template-qa-senior-001', metric_name: '流程优化', metric_code: 'PROCESS_OPT', category: 'innovation', weight: 10.00, description: '质量流程优化', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-qa-snr-06', template_id: 'template-qa-senior-001', metric_name: '质量培训', metric_code: 'QUALITY_TRAINING', category: 'collaboration', weight: 10.00, description: '质量意识培训', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // ============================================
  // 9. 售后工程师
  // ============================================

  registerTemplate({
    id: 'template-service-default', name: '售后服务标准模板',
    description: '适用于售后岗位：响应时效25%+一次解决率30%+客户满意度25%+反馈15%+安全5%',
    department_type: 'support', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-svc-def-01', template_id: 'template-service-default', metric_name: '响应时效', metric_code: 'RESPONSE_TIME', category: 'performance', weight: 20.00, description: '客户报修响应速度', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-svc-def-02', template_id: 'template-service-default', metric_name: '一次解决率', metric_code: 'FIRST_FIX_RATE', category: 'performance', weight: 25.00, description: '一次上门解决问题', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-svc-def-03', template_id: 'template-service-default', metric_name: '客户满意度', metric_code: 'CLIENT_SATISFACTION', category: 'performance', weight: 25.00, description: '客户满意度评分', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-svc-def-04', template_id: 'template-service-default', metric_name: '问题反馈', metric_code: 'ISSUE_FEEDBACK', category: 'collaboration', weight: 15.00, description: '向设计端反馈问题', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-svc-def-05', template_id: 'template-service-default', metric_name: '服务报告', metric_code: 'SERVICE_REPORT', category: 'performance', weight: 10.00, description: '服务报告完整及时', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-svc-def-06', template_id: 'template-service-default', metric_name: '安全生产', metric_code: 'SAFETY', category: 'performance', weight: 5.00, description: '现场安全操作', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  registerTemplate({
    id: 'template-service-senior-001', name: '高级售后工程师考核模板',
    description: '高级售后工程师：疑难问题30%+客户管理25%+效率20%+标准化15%+培训10%',
    department_type: 'support', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['senior'],
    applicablePositions: ['高级售后工程师', '售后主管', '售后服务经理'], priority: 50
  });
  registerMetrics([
    { id: 'metric-svc-snr-01', template_id: 'template-service-senior-001', metric_name: '疑难问题攻关', metric_code: 'COMPLEX_ISSUE', category: 'performance', weight: 25.00, description: '复杂故障处理', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-svc-snr-02', template_id: 'template-service-senior-001', metric_name: '客户关系', metric_code: 'CLIENT_RELATION', category: 'performance', weight: 20.00, description: '客户关系维护', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-svc-snr-03', template_id: 'template-service-senior-001', metric_name: '服务效率', metric_code: 'SERVICE_EFFICIENCY', category: 'performance', weight: 20.00, description: '服务时效', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-svc-snr-04', template_id: 'template-service-senior-001', metric_name: '知识库建设', metric_code: 'KNOWLEDGE_BASE', category: 'innovation', weight: 15.00, description: '故障案例库、SOP', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-svc-snr-05', template_id: 'template-service-senior-001', metric_name: '培训', metric_code: 'TRAINING', category: 'collaboration', weight: 10.00, description: '客户培训', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-svc-snr-06', template_id: 'template-service-senior-001', metric_name: '改进建议', metric_code: 'IMPROVEMENT', category: 'innovation', weight: 10.00, description: '设计改进建议', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // ============================================
  // 10. 销售工程师（非标自动化行业销售）
  // ============================================

  registerTemplate({
    id: 'template-sales-default', name: '销售部门标准模板',
    description: '适用于销售岗位：业绩60%+客户20%+协作10%+学习10%',
    department_type: 'sales', is_default: true, status: 'active', priority: 0
  });
  registerMetrics([
    { id: 'metric-sales-def-01', template_id: 'template-sales-default', metric_name: '销售额完成率', metric_code: 'SALES_COMPLETION', category: 'performance', weight: 30.00, description: '实际销售额/目标销售额', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sales-def-02', template_id: 'template-sales-default', metric_name: '回款率', metric_code: 'PAYMENT_RATE', category: 'performance', weight: 20.00, description: '回款比例', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sales-def-03', template_id: 'template-sales-default', metric_name: '新客户开发', metric_code: 'NEW_CLIENT', category: 'performance', weight: 10.00, description: '新增有效客户', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-sales-def-04', template_id: 'template-sales-default', metric_name: '客户满意度', metric_code: 'CLIENT_SATISFACTION', category: 'performance', weight: 15.00, description: '客户满意度', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-sales-def-05', template_id: 'template-sales-default', metric_name: '技术协作', metric_code: 'TECH_COLLAB', category: 'collaboration', weight: 10.00, description: '与技术团队配合', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-sales-def-06', template_id: 'template-sales-default', metric_name: '市场信息', metric_code: 'MARKET_INFO', category: 'innovation', weight: 10.00, description: '市场信息收集', evaluation_type: 'qualitative', sort_order: 6 },
    { id: 'metric-sales-def-07', template_id: 'template-sales-default', metric_name: '产品知识', metric_code: 'PRODUCT_KNOWLEDGE', category: 'behavior', weight: 5.00, description: '产品技术知识', evaluation_type: 'qualitative', sort_order: 7 },
  ]);

  registerTemplate({
    id: 'template-sales-senior-001', name: '高级销售工程师考核模板',
    description: '高级销售：业绩50%+大客户20%+策略15%+协作10%+指导5%',
    department_type: 'sales', is_default: false, status: 'active',
    applicableRoles: ['employee'], applicableLevels: ['senior'],
    applicablePositions: ['高级销售工程师', '销售主管', '销售经理'], priority: 50
  });
  registerMetrics([
    { id: 'metric-sales-snr-01', template_id: 'template-sales-senior-001', metric_name: '个人业绩', metric_code: 'PERSONAL_SALES', category: 'performance', weight: 30.00, description: '个人销售额', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sales-snr-02', template_id: 'template-sales-senior-001', metric_name: '回款率', metric_code: 'PAYMENT_RATE', category: 'performance', weight: 20.00, description: '回款比例', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sales-snr-03', template_id: 'template-sales-senior-001', metric_name: '大客户维护', metric_code: 'KEY_ACCOUNT', category: 'performance', weight: 15.00, description: '重点客户关系', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-sales-snr-04', template_id: 'template-sales-senior-001', metric_name: '市场策略', metric_code: 'MARKET_STRATEGY', category: 'innovation', weight: 15.00, description: '市场开拓策略', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-sales-snr-05', template_id: 'template-sales-senior-001', metric_name: '技术协作', metric_code: 'TECH_COLLAB', category: 'collaboration', weight: 10.00, description: '与技术方案团队配合', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-sales-snr-06', template_id: 'template-sales-senior-001', metric_name: '经验分享', metric_code: 'SHARING', category: 'collaboration', weight: 10.00, description: '销售经验分享', evaluation_type: 'qualitative', sort_order: 6 },
  ]);

  // 统计
  const templateCount = memoryStore.assessmentTemplates?.size || 0;
  const metricCount = memoryStore.templateMetrics?.size || 0;
  logger.info(`✅ 已加载 ${templateCount} 个非标自动化行业考核模板（10大岗位×多层级），${metricCount} 个考核指标`);
  await syncTemplatesToDatabase();
}

export function updateDepartmentTypes() {
  // departmentTypes not used - templates use department_type string directly
  return;
}
