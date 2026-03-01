/**
 * 初始化默认考核模板数据
 * 在系统启动时加载到 Memory DB
 */

import { memoryStore } from './database';
import logger from './logger';

export function initializeDefaultTemplates() {
  logger.info('📦 初始化默认考核模板...');
  
  // 清空现有数据
  memoryStore.assessmentTemplates?.clear();
  memoryStore.templateMetrics?.clear();
  memoryStore.metricScoringCriteria?.clear();
  
  // ============================================
  // 1. 销售部门模板
  // ============================================
  
  const salesTemplate = {
    id: 'template-sales-001',
    name: '销售部门标准模板',
    description: '适用于销售岗位的考核模板：业绩导向，70%量化指标+30%行为指标',
    department_type: 'sales',
    is_default: true,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  memoryStore.assessmentTemplates?.set(salesTemplate.id, salesTemplate);
  
  const salesMetrics = [
    { id: 'metric-sales-001', template_id: 'template-sales-001', metric_name: '销售额完成率', metric_code: 'SALES_COMPLETION', category: 'performance', weight: 30.00, description: '实际销售额/目标销售额', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sales-002', template_id: 'template-sales-001', metric_name: '回款率', metric_code: 'PAYMENT_RATE', category: 'performance', weight: 20.00, description: '实际回款/应收款项', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sales-003', template_id: 'template-sales-001', metric_name: '新客户开发', metric_code: 'NEW_CLIENTS', category: 'performance', weight: 10.00, description: '新增有效客户数量', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-sales-004', template_id: 'template-sales-001', metric_name: '客户满意度', metric_code: 'CLIENT_SATISFACTION', category: 'performance', weight: 10.00, description: '客户满意度调查得分', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-sales-005', template_id: 'template-sales-001', metric_name: '客户关系维护', metric_code: 'CLIENT_RELATIONSHIP', category: 'behavior', weight: 10.00, description: '客户拜访频率、关系维护质量', evaluation_type: 'qualitative', sort_order: 5 },
    { id: 'metric-sales-006', template_id: 'template-sales-001', metric_name: '团队协作', metric_code: 'TEAMWORK', category: 'collaboration', weight: 10.00, description: '跨部门协作、信息共享', evaluation_type: 'qualitative', sort_order: 6 },
    { id: 'metric-sales-007', template_id: 'template-sales-001', metric_name: '专业能力提升', metric_code: 'SKILL_DEVELOPMENT', category: 'behavior', weight: 10.00, description: '产品知识、销售技巧提升', evaluation_type: 'qualitative', sort_order: 7 }
  ];
  
  salesMetrics.forEach(metric => {
    memoryStore.templateMetrics?.set(metric.id, metric);
  });
  
  // ============================================
  // 2. 工程技术部门模板
  // ============================================
  
  const engineeringTemplate = {
    id: 'template-engineering-001',
    name: '工程技术部门标准模板',
    description: '适用于工程技术岗位：项目交付50%+技术能力30%+协作成长20%',
    department_type: 'engineering',
    is_default: true,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  memoryStore.assessmentTemplates?.set(engineeringTemplate.id, engineeringTemplate);
  
  const engineeringMetrics = [
    { id: 'metric-eng-001', template_id: 'template-engineering-001', metric_name: '项目按时完成率', metric_code: 'PROJECT_ONTIME_RATE', category: 'performance', weight: 20.00, description: '按时交付项目数/总项目数', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-eng-002', template_id: 'template-engineering-001', metric_name: '一次验收通过率', metric_code: 'FIRST_PASS_RATE', category: 'performance', weight: 15.00, description: '一次验收通过数/总验收数', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-eng-003', template_id: 'template-engineering-001', metric_name: '技术方案合理性', metric_code: 'SOLUTION_QUALITY', category: 'performance', weight: 15.00, description: '方案设计质量、可行性评估', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-eng-004', template_id: 'template-engineering-001', metric_name: '技术难题解决能力', metric_code: 'PROBLEM_SOLVING', category: 'innovation', weight: 15.00, description: '攻克技术难题的能力', evaluation_type: 'qualitative', sort_order: 4 },
    { id: 'metric-eng-005', template_id: 'template-engineering-001', metric_name: '创新贡献', metric_code: 'INNOVATION', category: 'innovation', weight: 10.00, description: '专利、技术改进提案', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-eng-006', template_id: 'template-engineering-001', metric_name: '技术文档完整性', metric_code: 'DOCUMENTATION', category: 'performance', weight: 5.00, description: '技术文档的完整性和规范性', evaluation_type: 'qualitative', sort_order: 6 },
    { id: 'metric-eng-007', template_id: 'template-engineering-001', metric_name: '跨部门协作', metric_code: 'CROSS_TEAM_COLLABORATION', category: 'collaboration', weight: 10.00, description: '与其他部门的协作配合', evaluation_type: 'qualitative', sort_order: 7 },
    { id: 'metric-eng-008', template_id: 'template-engineering-001', metric_name: '技术分享与培训', metric_code: 'KNOWLEDGE_SHARING', category: 'collaboration', weight: 10.00, description: '技术分享次数和质量', evaluation_type: 'quantitative', sort_order: 8 }
  ];
  
  engineeringMetrics.forEach(metric => {
    memoryStore.templateMetrics?.set(metric.id, metric);
  });
  
  // ============================================
  // 3. 生产制造部门模板
  // ============================================
  
  const manufacturingTemplate = {
    id: 'template-manufacturing-001',
    name: '生产制造部门标准模板',
    description: '适用于生产制造岗位：效率40%+质量安全40%+现场管理20%',
    department_type: 'manufacturing',
    is_default: true,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  memoryStore.assessmentTemplates?.set(manufacturingTemplate.id, manufacturingTemplate);
  
  const manufacturingMetrics = [
    { id: 'metric-mfg-001', template_id: 'template-manufacturing-001', metric_name: '产量完成率', metric_code: 'OUTPUT_COMPLETION', category: 'performance', weight: 20.00, description: '实际产量/目标产量', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-mfg-002', template_id: 'template-manufacturing-001', metric_name: '生产效率', metric_code: 'PRODUCTION_EFFICIENCY', category: 'performance', weight: 10.00, description: '单位时间产出', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-mfg-003', template_id: 'template-manufacturing-001', metric_name: '设备利用率', metric_code: 'EQUIPMENT_UTILIZATION', category: 'performance', weight: 10.00, description: '设备有效运转时间占比', evaluation_type: 'quantitative', sort_order: 3 },
    { id: 'metric-mfg-004', template_id: 'template-manufacturing-001', metric_name: '产品合格率', metric_code: 'QUALITY_RATE', category: 'performance', weight: 20.00, description: '合格产品数/总产品数', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-mfg-005', template_id: 'template-manufacturing-001', metric_name: '安全事故率', metric_code: 'SAFETY_INCIDENT_RATE', category: 'performance', weight: 15.00, description: '安全事故次数（零事故=满分）', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-mfg-006', template_id: 'template-manufacturing-001', metric_name: '物料损耗率', metric_code: 'MATERIAL_LOSS_RATE', category: 'performance', weight: 5.00, description: '物料浪费比例', evaluation_type: 'quantitative', sort_order: 6 },
    { id: 'metric-mfg-007', template_id: 'template-manufacturing-001', metric_name: '5S现场管理', metric_code: '5S_MANAGEMENT', category: 'behavior', weight: 10.00, description: '现场整理整顿清扫清洁素养', evaluation_type: 'qualitative', sort_order: 7 },
    { id: 'metric-mfg-008', template_id: 'template-manufacturing-001', metric_name: '团队协作', metric_code: 'TEAMWORK', category: 'collaboration', weight: 10.00, description: '班组协作、互帮互助', evaluation_type: 'qualitative', sort_order: 8 }
  ];
  
  manufacturingMetrics.forEach(metric => {
    memoryStore.templateMetrics?.set(metric.id, metric);
  });
  
  // ============================================
  // 4. 支持部门模板
  // ============================================
  
  const supportTemplate = {
    id: 'template-support-001',
    name: '支持部门标准模板',
    description: '适用于财务、人事、行政、采购等支持岗位：质量50%+服务30%+能力20%',
    department_type: 'support',
    is_default: true,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  memoryStore.assessmentTemplates?.set(supportTemplate.id, supportTemplate);
  
  const supportMetrics = [
    { id: 'metric-sup-001', template_id: 'template-support-001', metric_name: '工作准确率', metric_code: 'ACCURACY_RATE', category: 'performance', weight: 25.00, description: '工作无差错率', evaluation_type: 'quantitative', sort_order: 1 },
    { id: 'metric-sup-002', template_id: 'template-support-001', metric_name: '工作及时性', metric_code: 'TIMELINESS', category: 'performance', weight: 15.00, description: '按时完成率', evaluation_type: 'quantitative', sort_order: 2 },
    { id: 'metric-sup-003', template_id: 'template-support-001', metric_name: '合规性', metric_code: 'COMPLIANCE', category: 'performance', weight: 10.00, description: '制度执行、无违规', evaluation_type: 'qualitative', sort_order: 3 },
    { id: 'metric-sup-004', template_id: 'template-support-001', metric_name: '内部客户满意度', metric_code: 'INTERNAL_SATISFACTION', category: 'performance', weight: 15.00, description: '内部客户评价得分', evaluation_type: 'quantitative', sort_order: 4 },
    { id: 'metric-sup-005', template_id: 'template-support-001', metric_name: '响应速度', metric_code: 'RESPONSE_SPEED', category: 'behavior', weight: 10.00, description: '问题响应时效', evaluation_type: 'quantitative', sort_order: 5 },
    { id: 'metric-sup-006', template_id: 'template-support-001', metric_name: '主动服务意识', metric_code: 'PROACTIVE_SERVICE', category: 'behavior', weight: 5.00, description: '主动发现问题、提供支持', evaluation_type: 'qualitative', sort_order: 6 },
    { id: 'metric-sup-007', template_id: 'template-support-001', metric_name: '专业知识运用', metric_code: 'PROFESSIONAL_SKILL', category: 'performance', weight: 10.00, description: '专业能力应用', evaluation_type: 'qualitative', sort_order: 7 },
    { id: 'metric-sup-008', template_id: 'template-support-001', metric_name: '流程优化建议', metric_code: 'PROCESS_IMPROVEMENT', category: 'innovation', weight: 5.00, description: '改进提案数量和质量', evaluation_type: 'quantitative', sort_order: 8 },
    { id: 'metric-sup-009', template_id: 'template-support-001', metric_name: '跨部门协作', metric_code: 'CROSS_DEPT_COLLABORATION', category: 'collaboration', weight: 5.00, description: '跨部门配合', evaluation_type: 'qualitative', sort_order: 9 }
  ];
  
  supportMetrics.forEach(metric => {
    memoryStore.templateMetrics?.set(metric.id, metric);
  });
  
  // 统计
  const templateCount = memoryStore.assessmentTemplates?.size || 0;
  const metricCount = memoryStore.templateMetrics?.size || 0;
  
  logger.info(`✅ 已加载 ${templateCount} 个默认模板，${metricCount} 个考核指标`);
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
