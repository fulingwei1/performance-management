/**
 * 初始化默认考核模板数据
 * 在系统启动时加载到 Memory DB
 * 
 * 模板体系：按岗位×层级细分的多模板体系
 * - 每个部门有一个兜底模板（isDefault=true, priority=0）
 * - 每个岗位×层级组合有专用模板（priority=30~50）
 * - 匹配规则：岗位精确匹配(50) > 层级匹配(30) > 角色匹配(10) > 部门兜底(0)
 */

import { memoryStore } from './database';
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
    id: t.id,
    name: t.name,
    description: t.description,
    department_type: t.department_type,
    is_default: t.is_default,
    status: t.status,
    applicable_roles: t.applicableRoles || [],
    applicable_levels: t.applicableLevels || [],
    applicable_positions: t.applicablePositions || [],
    priority: t.priority,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

function registerMetrics(metrics: MetricDef[]) {
  metrics.forEach(m => {
    memoryStore.templateMetrics?.set(m.id, m);
  });
}

// ============================================
// 主初始化函数
// ============================================

export function initializeDefaultTemplates() {
  logger.info('📦 初始化默认考核模板（岗位×层级细分体系）...');
  
  // 清空现有数据
  memoryStore.assessmentTemplates?.clear();
  memoryStore.templateMetrics?.clear();
  memoryStore.metricScoringCriteria?.clear();
  
  // ============================================
  // 1. 工程技术部门模板
  // ============================================
  
  // 1.1 工程技术部门 - 兜底模板
  registerTemplate({
    id: 'template-eng-default',
    name: '工程技术部门标准模板',
    description: '适用于工程技术岗位的通用考核模板：项目交付50%+技术能力30%+协作成长20%',
    department_type: 'engineering',
    is_default: true,
    status: 'active',
    priority: 0
  });
  registerMetrics([
    { id: 'metric-eng-def-01', template_id: 'template-eng-default', metric_name: '项目按时完成率', metric_code: 'PROJECT_ONTIME_RATE', category: 'performance', weight: 20.00, description: '按时交付项目数/总项目数', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-eng-def-02', template_id: 'template-eng-default', metric_name: '一次验收通过率', metric_code: 'FIRST_PASS_RATE', category: 'performance', weight: 15.00, description: '一次验收通过数/总验收数', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-eng-def-03', template_id: 'template-eng-default', metric_name: '技术方案合理性', metric_code: 'SOLUTION_QUALITY', category: 'performance', weight: 15.00, description: '方案设计质量、可行性评估', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-eng-def-04', template_id: 'template-eng-default', metric_name: '技术难题解决能力', metric_code: 'PROBLEM_SOLVING', category: 'innovation', weight: 15.00, description: '攻克技术难题的能力', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-eng-def-05', template_id: 'template-eng-default', metric_name: '创新贡献', metric_code: 'INNOVATION', category: 'innovation', weight: 10.00, description: '专利、技术改进提案', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-eng-def-06', template_id: 'template-eng-default', metric_name: '技术文档完整性', metric_code: 'DOCUMENTATION', category: 'performance', weight: 5.00, description: '技术文档的完整性和规范性', evaluation_type: 'qualitative', sort_order: 6 },
    { id: 'metric-eng-def-07', template_id: 'template-eng-default', metric_name: '跨部门协作', metric_code: 'CROSS_TEAM_COLLABORATION', category: 'collaboration', weight: 10.00, description: '与其他部门的协作配合', evaluation_type: 'qualitative', sort_order: 7 },
    { id: 'metric-eng-def-08', template_id: 'template-eng-default', metric_name: '技术分享与培训', metric_code: 'KNOWLEDGE_SHARING', category: 'collaboration', weight: 10.00, description: '技术分享次数和质量', evaluation_type: 'quantitative', sort_order: 8 }
  ]);
  
  // 1.2 工程技术部门 - 高级工程师
  registerTemplate({
    id: 'template-eng-senior-001',
    name: '工程技术高级工程师考核模板',
    description: '适用于高级工程师：技术攻坚40%+项目管理30%+创新15%+协作15%',
    department_type: 'engineering',
    is_default: false,
    status: 'active',
    applicableRoles: ['employee'],
    applicableLevels: ['senior'],
    applicablePositions: ['高级工程师'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-eng-snr-01', template_id: 'template-eng-senior-001', metric_name: '技术攻坚能力', metric_code: 'TECH_BREAKTHROUGH', category: 'performance', weight: 25.00, description: '解决核心技术难题、技术攻关贡献', evaluation_type: 'qualitative', sort_order: 1 },
    { id: 'metric-eng-snr-02', template_id: 'template-eng-senior-001', metric_name: '技术方案设计', metric_code: 'SOLUTION_DESIGN', category: 'performance', weight: 15.00, description: '架构设计、技术方案评审质量', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-eng-snr-03', template_id: 'template-eng-senior-001', metric_name: '项目管理', metric_code: 'PROJECT_MGMT', category: 'performance', weight: 20.00, description: '项目进度把控、风险识别与管理', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-eng-snr-04', template_id: 'template-eng-senior-001', metric_name: '技术创新', metric_code: 'TECH_INNOVATION', category: 'innovation', weight: 15.00, description: '技术创新、专利提案、技术改进', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-eng-snr-05', template_id: 'template-eng-senior-001', metric_name: '技术 mentoring', metric_code: 'TECH_MENTORING', category: 'collaboration', weight: 15.00, description: '指导初中级工程师、技术分享', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-eng-snr-06', template_id: 'template-eng-senior-001', metric_name: '质量把控', metric_code: 'QUALITY_CONTROL', category: 'performance', weight: 10.00, description: '代码/方案评审、质量把关', evaluation_type: 'qualitative', sort_order: 6 }
  ]);
  
  // 1.3 工程技术部门 - 中级工程师
  registerTemplate({
    id: 'template-eng-inter-001',
    name: '工程技术中级工程师考核模板',
    description: '适用于中级工程师：项目交付40%+技术能力30%+学习成长15%+协作15%',
    department_type: 'engineering',
    is_default: false,
    status: 'active',
    applicableRoles: ['employee'],
    applicableLevels: ['intermediate'],
    applicablePositions: ['中级工程师'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-eng-int-01', template_id: 'template-eng-inter-001', metric_name: '项目交付质量', metric_code: 'PROJECT_DELIVERY', category: 'performance', weight: 25.00, description: '项目按时按质交付情况', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-eng-int-02', template_id: 'template-eng-inter-001', metric_name: '任务完成率', metric_code: 'TASK_COMPLETION', category: 'performance', weight: 15.00, description: '分配任务按时完成率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-eng-int-03', template_id: 'template-eng-inter-001', metric_name: '技术能力', metric_code: 'TECH_SKILL', category: 'performance', weight: 20.00, description: '技术栈掌握、独立解决问题能力', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-eng-int-04', template_id: 'template-eng-inter-001', metric_name: '代码/文档质量', metric_code: 'CODE_DOC_QUALITY', category: 'performance', weight: 10.00, description: '代码规范、文档完整性', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-eng-int-05', template_id: 'template-eng-inter-001', metric_name: '学习成长', metric_code: 'LEARNING_GROWTH', category: 'behavior', weight: 15.00, description: '新技术学习、能力提升', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-eng-int-06', template_id: 'template-eng-inter-001', metric_name: '团队协作', metric_code: 'TEAMWORK', category: 'collaboration', weight: 15.00, description: '团队配合、沟通协作', evaluation_type: 'qualitative', sort_order: 6 }
  ]);
  
  // 1.4 工程技术部门 - 初级工程师
  registerTemplate({
    id: 'template-eng-junior-001',
    name: '工程技术初级工程师考核模板',
    description: '适用于初级工程师：学习成长30%+项目协助40%+技术基础20%+态度10%',
    department_type: 'engineering',
    is_default: false,
    status: 'active',
    applicableRoles: ['employee'],
    applicableLevels: ['junior'],
    applicablePositions: ['初级工程师'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-eng-jnr-01', template_id: 'template-eng-junior-001', metric_name: '项目协助贡献', metric_code: 'PROJECT_ASSIST', category: 'performance', weight: 25.00, description: '参与项目任务的完成情况', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-eng-jnr-02', template_id: 'template-eng-junior-001', metric_name: '任务执行力', metric_code: 'TASK_EXECUTION', category: 'performance', weight: 15.00, description: '分配任务的执行质量和效率', evaluation_type: 'qualitative', sort_order: 2 },
    { id: 'metric-eng-jnr-03', template_id: 'template-eng-junior-001', metric_name: '学习成长', metric_code: 'LEARNING_GROWTH', category: 'behavior', weight: 30.00, description: '技术学习进度、培训参与度', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-eng-jnr-04', template_id: 'template-eng-junior-001', metric_name: '技术基础', metric_code: 'TECH_FOUNDATION', category: 'performance', weight: 20.00, description: '基础知识掌握、工具使用熟练度', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-eng-jnr-05', template_id: 'template-eng-junior-001', metric_name: '工作态度', metric_code: 'WORK_ATTITUDE', category: 'behavior', weight: 10.00, description: '主动性、责任心、出勤情况', evaluation_type: 'qualitative', sort_order: 5 }
  ]);
  
  // 1.5 工程技术部门 - 项目经理
  registerTemplate({
    id: 'template-eng-mgr-001',
    name: '工程技术项目经理考核模板',
    description: '适用于项目经理：项目管理50%+团队管理30%+质量把控10%+沟通10%',
    department_type: 'engineering',
    is_default: false,
    status: 'active',
    applicableRoles: ['manager'],
    applicableLevels: ['senior', 'intermediate'],
    applicablePositions: ['项目经理'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-eng-mgr-01', template_id: 'template-eng-mgr-001', metric_name: '项目交付率', metric_code: 'PROJECT_DELIVERY_RATE', category: 'performance', weight: 25.00, description: '项目按时交付比例', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-eng-mgr-02', template_id: 'template-eng-mgr-001', metric_name: '项目预算控制', metric_code: 'BUDGET_CONTROL', category: 'performance', weight: 15.00, description: '项目成本控制在预算范围内', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-eng-mgr-03', template_id: 'template-eng-mgr-001', metric_name: '风险管理', metric_code: 'RISK_MGMT', category: 'performance', weight: 10.00, description: '风险识别、预防和应对', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-eng-mgr-04', template_id: 'template-eng-mgr-001', metric_name: '团队建设', metric_code: 'TEAM_BUILDING', category: 'collaboration', weight: 15.00, description: '团队培养、凝聚力建设', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-eng-mgr-05', template_id: 'template-eng-mgr-001', metric_name: '资源协调', metric_code: 'RESOURCE_COORDINATION', category: 'collaboration', weight: 15.00, description: '跨部门资源协调、冲突解决', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-eng-mgr-06', template_id: 'template-eng-mgr-001', metric_name: '质量把控', metric_code: 'QUALITY_OVERSIGHT', category: 'performance', weight: 10.00, description: '项目质量标准和把控', evaluation_type: 'qualitative', sort_order: 6 },
    { id: 'metric-eng-mgr-07', template_id: 'template-eng-mgr-001', metric_name: '沟通汇报', metric_code: 'COMMUNICATION_REPORTING', category: 'behavior', weight: 10.00, description: '向上汇报、跨部门沟通', evaluation_type: 'qualitative', sort_order: 7 }
  ]);
  
  // ============================================
  // 2. 销售部门模板
  // ============================================
  
  // 2.1 销售部门 - 兜底模板
  registerTemplate({
    id: 'template-sales-default',
    name: '销售部门标准模板',
    description: '适用于销售岗位的通用考核模板：业绩导向，70%量化指标+30%行为指标',
    department_type: 'sales',
    is_default: true,
    status: 'active',
    priority: 0
  });
  registerMetrics([
    { id: 'metric-sales-def-01', template_id: 'template-sales-default', metric_name: '销售额完成率', metric_code: 'SALES_COMPLETION', category: 'performance', weight: 30.00, description: '实际销售额/目标销售额', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sales-def-02', template_id: 'template-sales-default', metric_name: '回款率', metric_code: 'PAYMENT_RATE', category: 'performance', weight: 20.00, description: '实际回款/应收款项', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sales-def-03', template_id: 'template-sales-default', metric_name: '新客户开发', metric_code: 'NEW_CLIENTS', category: 'performance', weight: 10.00, description: '新增有效客户数量', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-sales-def-04', template_id: 'template-sales-default', metric_name: '客户满意度', metric_code: 'CLIENT_SATISFACTION', category: 'performance', weight: 10.00, description: '客户满意度调查得分', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-sales-def-05', template_id: 'template-sales-default', metric_name: '客户关系维护', metric_code: 'CLIENT_RELATIONSHIP', category: 'behavior', weight: 10.00, description: '客户拜访频率、关系维护质量', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-sales-def-06', template_id: 'template-sales-default', metric_name: '团队协作', metric_code: 'TEAMWORK', category: 'collaboration', weight: 10.00, description: '跨部门协作、信息共享', evaluation_type: 'qualitative', sort_order: 6 },
    { id: 'metric-sales-def-07', template_id: 'template-sales-default', metric_name: '专业能力提升', metric_code: 'SKILL_DEVELOPMENT', category: 'behavior', weight: 10.00, description: '产品知识、销售技巧提升', evaluation_type: 'qualitative', sort_order: 7 }
  ]);
  
  // 2.2 销售部门 - 销售经理
  registerTemplate({
    id: 'template-sales-mgr-001',
    name: '销售部门销售经理考核模板',
    description: '适用于销售经理：团队业绩40%+个人业绩30%+团队管理15%+战略规划15%',
    department_type: 'sales',
    is_default: false,
    status: 'active',
    applicableRoles: ['manager'],
    applicableLevels: ['senior'],
    applicablePositions: ['销售经理'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-sales-mgr-01', template_id: 'template-sales-mgr-001', metric_name: '团队业绩完成率', metric_code: 'TEAM_SALES_RATE', category: 'performance', weight: 25.00, description: '团队整体销售目标达成情况', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sales-mgr-02', template_id: 'template-sales-mgr-001', metric_name: '团队回款率', metric_code: 'TEAM_PAYMENT_RATE', category: 'performance', weight: 15.00, description: '团队整体回款比例', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sales-mgr-03', template_id: 'template-sales-mgr-001', metric_name: '个人业绩贡献', metric_code: 'PERSONAL_SALES', category: 'performance', weight: 20.00, description: '个人直接销售业绩', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-sales-mgr-04', template_id: 'template-sales-mgr-001', metric_name: '团队管理', metric_code: 'TEAM_MGMT', category: 'collaboration', weight: 15.00, description: '团队培养、激励、绩效管理', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-sales-mgr-05', template_id: 'template-sales-mgr-001', metric_name: '客户资源管理', metric_code: 'CLIENT_RESOURCE_MGMT', category: 'performance', weight: 10.00, description: '大客户维护、客户分配公平性', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-sales-mgr-06', template_id: 'template-sales-mgr-001', metric_name: '市场策略规划', metric_code: 'MARKET_STRATEGY', category: 'innovation', weight: 15.00, description: '销售策略制定、市场开拓规划', evaluation_type: 'qualitative', sort_order: 6 }
  ]);
  
  // 2.3 销售部门 - 高级销售
  registerTemplate({
    id: 'template-sales-senior-001',
    name: '销售部门高级销售考核模板',
    description: '适用于高级销售：个人业绩60%+客户维护20%+市场开拓10%+专业成长10%',
    department_type: 'sales',
    is_default: false,
    status: 'active',
    applicableRoles: ['employee'],
    applicableLevels: ['senior'],
    applicablePositions: ['高级销售'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-sales-snr-01', template_id: 'template-sales-senior-001', metric_name: '个人销售额', metric_code: 'PERSONAL_SALES_AMT', category: 'performance', weight: 35.00, description: '个人实际销售额', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sales-snr-02', template_id: 'template-sales-senior-001', metric_name: '个人回款率', metric_code: 'PERSONAL_PAYMENT_RATE', category: 'performance', weight: 25.00, description: '个人订单回款比例', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sales-snr-03', template_id: 'template-sales-senior-001', metric_name: '大客户维护', metric_code: 'KEY_ACCOUNT_MGMT', category: 'performance', weight: 20.00, description: '重点客户关系维护、复购率', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-sales-snr-04', template_id: 'template-sales-senior-001', metric_name: '市场开拓', metric_code: 'MARKET_DEVELOPMENT', category: 'performance', weight: 10.00, description: '新市场、新渠道开拓', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-sales-snr-05', template_id: 'template-sales-senior-001', metric_name: '专业能力提升', metric_code: 'PROFESSIONAL_GROWTH', category: 'behavior', weight: 10.00, description: '产品知识深度、谈判技巧', evaluation_type: 'qualitative', sort_order: 5 }
  ]);
  
  // 2.4 销售部门 - 普通销售
  registerTemplate({
    id: 'template-sales-junior-001',
    name: '销售部门普通销售考核模板',
    description: '适用于普通销售：个人业绩50%+客户维护15%+学习成长20%+新客户开发15%',
    department_type: 'sales',
    is_default: false,
    status: 'active',
    applicableRoles: ['employee'],
    applicableLevels: ['intermediate', 'junior'],
    applicablePositions: ['普通销售'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-sales-jnr-01', template_id: 'template-sales-junior-001', metric_name: '个人销售额', metric_code: 'PERSONAL_SALES_AMT', category: 'performance', weight: 30.00, description: '个人实际销售额', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sales-jnr-02', template_id: 'template-sales-junior-001', metric_name: '销售目标完成率', metric_code: 'SALES_TARGET_RATE', category: 'performance', weight: 20.00, description: '实际销售额/目标销售额', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sales-jnr-03', template_id: 'template-sales-junior-001', metric_name: '客户维护', metric_code: 'CLIENT_MAINTENANCE', category: 'performance', weight: 15.00, description: '客户回访、关系维护', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-sales-jnr-04', template_id: 'template-sales-junior-001', metric_name: '新客户开发', metric_code: 'NEW_CLIENT_DEV', category: 'performance', weight: 15.00, description: '新客户获取数量和转化', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-sales-jnr-05', template_id: 'template-sales-junior-001', metric_name: '学习成长', metric_code: 'LEARNING_GROWTH', category: 'behavior', weight: 10.00, description: '产品培训、销售技巧学习', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-sales-jnr-06', template_id: 'template-sales-junior-001', metric_name: '工作态度', metric_code: 'WORK_ATTITUDE', category: 'behavior', weight: 10.00, description: '积极性、执行力、出勤', evaluation_type: 'qualitative', sort_order: 6 }
  ]);
  
  // ============================================
  // 3. 生产制造部门模板
  // ============================================
  
  // 3.1 生产制造部门 - 兜底模板
  registerTemplate({
    id: 'template-mfg-default',
    name: '生产制造部门标准模板',
    description: '适用于生产制造岗位的通用考核模板：效率40%+质量安全40%+现场管理20%',
    department_type: 'manufacturing',
    is_default: true,
    status: 'active',
    priority: 0
  });
  registerMetrics([
    { id: 'metric-mfg-def-01', template_id: 'template-mfg-default', metric_name: '产量完成率', metric_code: 'OUTPUT_COMPLETION', category: 'performance', weight: 20.00, description: '实际产量/目标产量', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-mfg-def-02', template_id: 'template-mfg-default', metric_name: '生产效率', metric_code: 'PRODUCTION_EFFICIENCY', category: 'performance', weight: 10.00, description: '单位时间产出', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-mfg-def-03', template_id: 'template-mfg-default', metric_name: '设备利用率', metric_code: 'EQUIPMENT_UTILIZATION', category: 'performance', weight: 10.00, description: '设备有效运转时间占比', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-mfg-def-04', template_id: 'template-mfg-default', metric_name: '产品合格率', metric_code: 'QUALITY_RATE', category: 'performance', weight: 20.00, description: '合格产品数/总产品数', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-mfg-def-05', template_id: 'template-mfg-default', metric_name: '安全事故率', metric_code: 'SAFETY_INCIDENT_RATE', category: 'performance', weight: 15.00, description: '安全事故次数（零事故=满分）', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-mfg-def-06', template_id: 'template-mfg-default', metric_name: '物料损耗率', metric_code: 'MATERIAL_LOSS_RATE', category: 'performance', weight: 5.00, description: '物料浪费比例', evaluation_type: 'quantitative', sort_order: 6 },
    { id: 'metric-mfg-def-07', template_id: 'template-mfg-default', metric_name: '5S现场管理', metric_code: '5S_MANAGEMENT', category: 'behavior', weight: 10.00, description: '现场整理整顿清扫清洁素养', evaluation_type: 'qualitative', sort_order: 7 },
    { id: 'metric-mfg-def-08', template_id: 'template-mfg-default', metric_name: '团队协作', metric_code: 'TEAMWORK', category: 'collaboration', weight: 10.00, description: '班组协作、互帮互助', evaluation_type: 'qualitative', sort_order: 8 }
  ]);
  
  // 3.2 生产制造部门 - 生产主管
  registerTemplate({
    id: 'template-mfg-mgr-001',
    name: '生产制造生产主管考核模板',
    description: '适用于生产主管：团队效率40%+安全管理30%+质量控制15%+流程优化15%',
    department_type: 'manufacturing',
    is_default: false,
    status: 'active',
    applicableRoles: ['manager'],
    applicableLevels: ['senior', 'intermediate'],
    applicablePositions: ['生产主管'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-mfg-mgr-01', template_id: 'template-mfg-mgr-001', metric_name: '团队产量达成', metric_code: 'TEAM_OUTPUT_RATE', category: 'performance', weight: 20.00, description: '班组整体产量目标达成率', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-mfg-mgr-02', template_id: 'template-mfg-mgr-001', metric_name: '团队效率提升', metric_code: 'TEAM_EFFICIENCY', category: 'performance', weight: 20.00, description: '单位人效、产线效率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-mfg-mgr-03', template_id: 'template-mfg-mgr-001', metric_name: '安全管理', metric_code: 'SAFETY_MGMT', category: 'performance', weight: 20.00, description: '安全培训、隐患排查、零事故', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-mfg-mgr-04', template_id: 'template-mfg-mgr-001', metric_name: '人员管理', metric_code: 'PERSONNEL_MGMT', category: 'collaboration', weight: 10.00, description: '班组管理、考勤、排班', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-mfg-mgr-05', template_id: 'template-mfg-mgr-001', metric_name: '质量控制', metric_code: 'QUALITY_OVERSIGHT', category: 'performance', weight: 15.00, description: '班组产品合格率把控', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-mfg-mgr-06', template_id: 'template-mfg-mgr-001', metric_name: '流程优化', metric_code: 'PROCESS_OPTIMIZATION', category: 'innovation', weight: 15.00, description: '生产流程改进、降本增效提案', evaluation_type: 'qualitative', sort_order: 6 }
  ]);
  
  // 3.3 生产制造部门 - 高级技工
  registerTemplate({
    id: 'template-mfg-senior-001',
    name: '生产制造高级技工考核模板',
    description: '适用于高级技工：产量30%+质量30%+设备维护20%+安全10%+创新10%',
    department_type: 'manufacturing',
    is_default: false,
    status: 'active',
    applicableRoles: ['employee'],
    applicableLevels: ['senior'],
    applicablePositions: ['高级技工'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-mfg-snr-01', template_id: 'template-mfg-senior-001', metric_name: '个人产量', metric_code: 'PERSONAL_OUTPUT', category: 'performance', weight: 30.00, description: '个人实际产出/目标产量', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-mfg-snr-02', template_id: 'template-mfg-senior-001', metric_name: '产品质量', metric_code: 'PRODUCT_QUALITY', category: 'performance', weight: 30.00, description: '个人产品合格率、返工率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-mfg-snr-03', template_id: 'template-mfg-senior-001', metric_name: '设备维护保养', metric_code: 'EQUIPMENT_MAINTENANCE', category: 'performance', weight: 20.00, description: '设备日常保养、故障排除', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-mfg-snr-04', template_id: 'template-mfg-senior-001', metric_name: '安全生产', metric_code: 'SAFETY_PRODUCTION', category: 'performance', weight: 10.00, description: '安全操作规范遵守', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-mfg-snr-05', template_id: 'template-mfg-senior-001', metric_name: '技术创新', metric_code: 'TECH_INNOVATION', category: 'innovation', weight: 10.00, description: '工艺改进、效率提升建议', evaluation_type: 'qualitative', sort_order: 5 }
  ]);
  
  // 3.4 生产制造部门 - 普通工人
  registerTemplate({
    id: 'template-mfg-junior-001',
    name: '生产制造普通工人考核模板',
    description: '适用于普通工人：产量40%+质量30%+安全20%+纪律10%',
    department_type: 'manufacturing',
    is_default: false,
    status: 'active',
    applicableRoles: ['employee'],
    applicableLevels: ['junior', 'intermediate'],
    applicablePositions: ['普通工人'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-mfg-jnr-01', template_id: 'template-mfg-junior-001', metric_name: '产量达成', metric_code: 'OUTPUT_ACHIEVEMENT', category: 'performance', weight: 40.00, description: '个人产量目标完成情况', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-mfg-jnr-02', template_id: 'template-mfg-junior-001', metric_name: '产品质量', metric_code: 'WORK_QUALITY', category: 'performance', weight: 30.00, description: '操作质量、次品率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-mfg-jnr-03', template_id: 'template-mfg-junior-001', metric_name: '安全规范', metric_code: 'SAFETY_COMPLIANCE', category: 'performance', weight: 20.00, description: '安全操作规程遵守、劳保用品佩戴', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-mfg-jnr-04', template_id: 'template-mfg-junior-001', metric_name: '劳动纪律', metric_code: 'WORK_DISCIPLINE', category: 'behavior', weight: 10.00, description: '出勤、服从安排、5S执行', evaluation_type: 'qualitative', sort_order: 4 }
  ]);
  
  // ============================================
  // 4. 支持部门模板（HR/财务/行政）
  // ============================================
  
  // 4.1 支持部门 - 兜底模板
  registerTemplate({
    id: 'template-sup-default',
    name: '支持部门标准模板',
    description: '适用于财务、人事、行政、采购等支持岗位：质量50%+服务30%+能力20%',
    department_type: 'support',
    is_default: true,
    status: 'active',
    priority: 0
  });
  registerMetrics([
    { id: 'metric-sup-def-01', template_id: 'template-sup-default', metric_name: '工作准确率', metric_code: 'ACCURACY_RATE', category: 'performance', weight: 25.00, description: '工作无差错率', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sup-def-02', template_id: 'template-sup-default', metric_name: '工作及时性', metric_code: 'TIMELINESS', category: 'performance', weight: 15.00, description: '按时完成率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sup-def-03', template_id: 'template-sup-default', metric_name: '合规性', metric_code: 'COMPLIANCE', category: 'performance', weight: 10.00, description: '制度执行、无违规', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-sup-def-04', template_id: 'template-sup-default', metric_name: '内部客户满意度', metric_code: 'INTERNAL_SATISFACTION', category: 'performance', weight: 15.00, description: '内部客户评价得分', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-sup-def-05', template_id: 'template-sup-default', metric_name: '响应速度', metric_code: 'RESPONSE_SPEED', category: 'behavior', weight: 10.00, description: '问题响应时效', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-sup-def-06', template_id: 'template-sup-default', metric_name: '主动服务意识', metric_code: 'PROACTIVE_SERVICE', category: 'behavior', weight: 5.00, description: '主动发现问题、提供支持', evaluation_type: 'qualitative', sort_order: 6 },
    { id: 'metric-sup-def-07', template_id: 'template-sup-default', metric_name: '专业知识运用', metric_code: 'PROFESSIONAL_SKILL', category: 'performance', weight: 10.00, description: '专业能力应用', evaluation_type: 'qualitative', sort_order: 7 },
    { id: 'metric-sup-def-08', template_id: 'template-sup-default', metric_name: '流程优化建议', metric_code: 'PROCESS_IMPROVEMENT', category: 'innovation', weight: 5.00, description: '改进提案数量和质量', evaluation_type: 'quantitative', sort_order: 8 },
    { id: 'metric-sup-def-09', template_id: 'template-sup-default', metric_name: '跨部门协作', metric_code: 'CROSS_DEPT_COLLABORATION', category: 'collaboration', weight: 5.00, description: '跨部门配合', evaluation_type: 'qualitative', sort_order: 9 }
  ]);
  
  // 4.2 支持部门 - 部门主管
  registerTemplate({
    id: 'template-sup-mgr-001',
    name: '支持部门主管考核模板',
    description: '适用于支持部门主管：服务质量40%+流程优化30%+团队管理15%+合规15%',
    department_type: 'support',
    is_default: false,
    status: 'active',
    applicableRoles: ['manager'],
    applicableLevels: ['senior', 'intermediate'],
    applicablePositions: ['部门主管'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-sup-mgr-01', template_id: 'template-sup-mgr-001', metric_name: '部门服务质量', metric_code: 'DEPT_SERVICE_QUALITY', category: 'performance', weight: 20.00, description: '部门整体服务质量、内部客户满意度', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sup-mgr-02', template_id: 'template-sup-mgr-001', metric_name: '服务效率', metric_code: 'SERVICE_EFFICIENCY', category: 'performance', weight: 20.00, description: '部门任务完成时效', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sup-mgr-03', template_id: 'template-sup-mgr-001', metric_name: '流程优化', metric_code: 'PROCESS_OPTIMIZATION', category: 'innovation', weight: 20.00, description: '流程改进、制度完善', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-sup-mgr-04', template_id: 'template-sup-mgr-001', metric_name: '制度建设', metric_code: 'SYSTEM_BUILDING', category: 'innovation', weight: 10.00, description: '制度制定和执行情况', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-sup-mgr-05', template_id: 'template-sup-mgr-001', metric_name: '团队管理', metric_code: 'TEAM_MGMT', category: 'collaboration', weight: 15.00, description: '团队培养、绩效考核', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-sup-mgr-06', template_id: 'template-sup-mgr-001', metric_name: '合规风控', metric_code: 'COMPLIANCE_RISK', category: 'performance', weight: 15.00, description: '合规管理、风险控制', evaluation_type: 'qualitative', sort_order: 6 }
  ]);
  
  // 4.3 支持部门 - 高级专员
  registerTemplate({
    id: 'template-sup-senior-001',
    name: '支持部门高级专员考核模板',
    description: '适用于高级专员：工作质量40%+专业能力30%+服务15%+创新15%',
    department_type: 'support',
    is_default: false,
    status: 'active',
    applicableRoles: ['employee'],
    applicableLevels: ['senior'],
    applicablePositions: ['高级专员'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-sup-snr-01', template_id: 'template-sup-senior-001', metric_name: '工作质量', metric_code: 'WORK_QUALITY', category: 'performance', weight: 25.00, description: '工作准确率、无差错', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sup-snr-02', template_id: 'template-sup-senior-001', metric_name: '任务完成效率', metric_code: 'TASK_EFFICIENCY', category: 'performance', weight: 15.00, description: '按时完成率、处理速度', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sup-snr-03', template_id: 'template-sup-senior-001', metric_name: '专业能力', metric_code: 'PROFESSIONAL_SKILL', category: 'performance', weight: 20.00, description: '专业领域深度、复杂问题处理', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-sup-snr-04', template_id: 'template-sup-senior-001', metric_name: '指导能力', metric_code: 'MENTORING_SKILL', category: 'collaboration', weight: 10.00, description: '指导初级同事、知识传承', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-sup-snr-05', template_id: 'template-sup-senior-001', metric_name: '服务满意度', metric_code: 'SERVICE_SATISFACTION', category: 'performance', weight: 15.00, description: '内部客户评价', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-sup-snr-06', template_id: 'template-sup-senior-001', metric_name: '创新贡献', metric_code: 'INNOVATION', category: 'innovation', weight: 15.00, description: '流程改进、方法创新', evaluation_type: 'qualitative', sort_order: 6 }
  ]);
  
  // 4.4 支持部门 - 普通专员
  registerTemplate({
    id: 'template-sup-junior-001',
    name: '支持部门普通专员考核模板',
    description: '适用于普通专员：工作准确率40%+及时性30%+服务态度20%+学习10%',
    department_type: 'support',
    is_default: false,
    status: 'active',
    applicableRoles: ['employee'],
    applicableLevels: ['junior', 'intermediate'],
    applicablePositions: ['普通专员'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-sup-jnr-01', template_id: 'template-sup-junior-001', metric_name: '工作准确率', metric_code: 'ACCURACY_RATE', category: 'performance', weight: 40.00, description: '工作无差错率、数据准确性', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sup-jnr-02', template_id: 'template-sup-junior-001', metric_name: '工作及时性', metric_code: 'TIMELINESS', category: 'performance', weight: 30.00, description: '任务按时完成率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sup-jnr-03', template_id: 'template-sup-junior-001', metric_name: '服务态度', metric_code: 'SERVICE_ATTITUDE', category: 'behavior', weight: 20.00, description: '服务主动性、沟通礼貌', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-sup-jnr-04', template_id: 'template-sup-junior-001', metric_name: '学习成长', metric_code: 'LEARNING_GROWTH', category: 'behavior', weight: 10.00, description: '业务学习、技能提升', evaluation_type: 'qualitative', sort_order: 4 }
  ]);
  
  // ============================================
  // 5. 高管部门模板
  // ============================================
  
  // 5.1 高管部门 - 兜底模板
  registerTemplate({
    id: 'template-mgmt-default',
    name: '高管部门标准模板',
    description: '适用于高管的通用考核模板：战略目标50%+团队建设30%+决策质量20%',
    department_type: 'management',
    is_default: true,
    status: 'active',
    priority: 0
  });
  registerMetrics([
    { id: 'metric-mgmt-def-01', template_id: 'template-mgmt-default', metric_name: '战略目标达成', metric_code: 'STRATEGIC_GOAL_RATE', category: 'performance', weight: 30.00, description: '公司战略目标完成情况', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-mgmt-def-02', template_id: 'template-mgmt-default', metric_name: '经营指标', metric_code: 'BUSINESS_METRICS', category: 'performance', weight: 20.00, description: '营收、利润等核心经营指标', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-mgmt-def-03', template_id: 'template-mgmt-default', metric_name: '团队建设', metric_code: 'TEAM_BUILDING', category: 'collaboration', weight: 20.00, description: '人才梯队建设、组织能力提升', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-mgmt-def-04', template_id: 'template-mgmt-default', metric_name: '决策质量', metric_code: 'DECISION_QUALITY', category: 'performance', weight: 15.00, description: '决策准确性、前瞻性', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-mgmt-def-05', template_id: 'template-mgmt-default', metric_name: '创新变革', metric_code: 'INNOVATION_CHANGE', category: 'innovation', weight: 15.00, description: '推动变革、创新举措', evaluation_type: 'qualitative', sort_order: 5 }
  ]);
  
  // 5.2 高管部门 - GM/高管
  registerTemplate({
    id: 'template-mgmt-gm-001',
    name: '高管GM考核模板',
    description: '适用于总经理/高管：战略目标50%+团队建设30%+决策质量10%+创新10%',
    department_type: 'management',
    is_default: false,
    status: 'active',
    applicableRoles: ['gm', 'manager'],
    applicableLevels: ['senior'],
    applicablePositions: ['总经理', '副总经理', '高管'],
    priority: 50
  });
  registerMetrics([
    { id: 'metric-mgmt-gm-01', template_id: 'template-mgmt-gm-001', metric_name: '战略目标达成', metric_code: 'STRATEGIC_GOAL_RATE', category: 'performance', weight: 30.00, description: '年度战略目标完成情况', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-mgmt-gm-02', template_id: 'template-mgmt-gm-001', metric_name: '营收利润指标', metric_code: 'REVENUE_PROFIT', category: 'performance', weight: 20.00, description: '公司整体营收和利润目标', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-mgmt-gm-03', template_id: 'template-mgmt-gm-001', metric_name: '团队建设', metric_code: 'TEAM_BUILDING', category: 'collaboration', weight: 20.00, description: '高管团队培养、组织架构优化', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-mgmt-gm-04', template_id: 'template-mgmt-gm-001', metric_name: '企业文化建设', metric_code: 'CORPORATE_CULTURE', category: 'collaboration', weight: 10.00, description: '企业文化塑造、价值观传递', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-mgmt-gm-05', template_id: 'template-mgmt-gm-001', metric_name: '决策质量', metric_code: 'DECISION_QUALITY', category: 'performance', weight: 10.00, description: '重大决策的准确性和效果', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-mgmt-gm-06', template_id: 'template-mgmt-gm-001', metric_name: '创新变革推动', metric_code: 'INNOVATION_CHANGE', category: 'innovation', weight: 10.00, description: '推动公司级变革和创新', evaluation_type: 'qualitative', sort_order: 6 }
  ]);
  
  // 统计
  const templateCount = memoryStore.assessmentTemplates?.size || 0;
  const metricCount = memoryStore.templateMetrics?.size || 0;
  
  logger.info(`✅ 已加载 ${templateCount} 个考核模板（含 ${templateCount - 5} 个岗位×层级细分模板 + 5 个部门兜底模板），${metricCount} 个考核指标`);
}

// 更新部门类型（根据部门名称）
export function updateDepartmentTypes() {
  logger.info('🏢 更新部门类型...');
  
  let updated = 0;
  
  memoryStore.departments.forEach((dept, id) => {
    let type = 'support'; // 默认类型
    
    const name = dept.name || '';
    
    if (name.includes('营销') || name.includes('销售')) {
      type = 'sales';
    } else if (name.includes('工程') || name.includes('技术') || name.includes('研发')) {
      type = 'engineering';
    } else if (name.includes('制造') || name.includes('生产') || name.includes('品质')) {
      type = 'manufacturing';
    } else if (name.includes('财务') || name.includes('人力') || name.includes('行政') || name.includes('采购')) {
      type = 'support';
    } else if (name.includes('总') || name.includes('管理')) {
      type = 'management';
    }
    
    // 更新部门对象（添加 department_type 字段）
    const updatedDept = { ...dept, department_type: type };
    memoryStore.departments.set(id, updatedDept);
    updated++;
  });
  
  logger.info(`✅ 已更新 ${updated} 个部门的类型`);
}
