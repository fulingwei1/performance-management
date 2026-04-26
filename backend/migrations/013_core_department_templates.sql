-- 核心部门、核心岗位、不同级别考核模板初始化脚本
-- 适用于绩效管理系统

-- ============================================
-- 1. 核心部门数据
-- ============================================
INSERT INTO departments (id, name, code, parent_id, sort_order, status, department_type)
VALUES 
  -- 工程技术中心（核心部门）及其子部门
  ('dept-engineering', '工程技术中心', 'ENG', NULL, 1, 'active', 'engineering'),
  ('dept-testing', '测试部', 'TEST', 'dept-engineering', 1, 'active', 'engineering'),
  ('dept-rd', '研发部', 'RD', 'dept-engineering', 2, 'active', 'engineering'),
  ('dept-frontend', '前端开发部', 'FRONTEND', 'dept-engineering', 3, 'active', 'engineering'),
  ('dept-backend', '后端开发部', 'BACKEND', 'dept-engineering', 4, 'active', 'engineering'),
  ('dept-architecture', '架构部', 'ARCH', 'dept-engineering', 5, 'active', 'engineering'),
  ('dept-devops', '运维开发部', 'DEVOPS', 'dept-engineering', 6, 'active', 'engineering'),
  ('dept-security', '安全部', 'SECURITY', 'dept-engineering', 7, 'active', 'engineering'),
  
  -- 其他核心部门
  ('dept-hr', '人力资源部', 'HR', NULL, 2, 'active', 'support'),
  ('dept-sales', '销售部', 'SALES', NULL, 3, 'active', 'sales'),
  ('dept-production', '生产部', 'PROD', NULL, 4, 'active', 'manufacturing'),
  ('dept-finance', '财务部', 'FIN', NULL, 5, 'active', 'support'),
  ('dept-quality', '质量部', 'QA', NULL, 6, 'active', 'support')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  department_type = EXCLUDED.department_type,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 2. 核心岗位数据（需要先创建 positions 表）
-- ============================================
-- 假设 positions 表已存在，如果没有则需要先创建
CREATE TABLE IF NOT EXISTS positions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id VARCHAR(36) REFERENCES departments(id),
  level VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO positions (id, name, department_id, level, description)
VALUES 
  -- 工程技术中心
  ('pos-eng-director', '工程技术总监', 'dept-engineering', 'director', '负责工程技术中心整体管理'),
  ('pos-eng-manager', '技术经理', 'dept-engineering', 'senior', '负责技术团队管理和项目交付'),
  ('pos-senior-engineer', '高级工程师', 'dept-engineering', 'senior', '负责核心技术开发和架构设计'),
  ('pos-mid-engineer', '中级工程师', 'dept-engineering', 'intermediate', '负责模块开发和功能实现'),
  ('pos-junior-engineer', '初级工程师', 'dept-engineering', 'junior', '负责基础开发和学习成长'),
  
  -- 前端开发部
  ('pos-frontend-lead', '前端开发主管', 'dept-frontend', 'senior', '负责前端技术架构和团队管理'),
  ('pos-senior-frontend', '高级前端工程师', 'dept-frontend', 'senior', '负责前端核心模块开发'),
  ('pos-mid-frontend', '中级前端工程师', 'dept-frontend', 'intermediate', '负责前端功能开发'),
  ('pos-junior-frontend', '初级前端工程师', 'dept-frontend', 'junior', '负责前端基础开发'),
  
  -- 后端开发部
  ('pos-backend-lead', '后端开发主管', 'dept-backend', 'senior', '负责后端架构和团队管理'),
  ('pos-senior-backend', '高级后端工程师', 'dept-backend', 'senior', '负责后端核心服务开发'),
  ('pos-mid-backend', '中级后端工程师', 'dept-backend', 'intermediate', '负责后端功能开发'),
  ('pos-junior-backend', '初级后端工程师', 'dept-backend', 'junior', '负责后端基础开发'),
  
  -- 架构部
  ('pos-architect', '架构师', 'dept-architecture', 'senior', '负责系统架构设计和技术选型'),
  ('pos-senior-architect', '高级架构师', 'dept-architecture', 'senior', '负责复杂系统架构设计'),
  
  -- 运维开发部
  ('pos-devops-lead', '运维开发主管', 'dept-devops', 'senior', '负责 CI/CD 和基础设施管理'),
  ('pos-senior-devops', '高级运维工程师', 'dept-devops', 'senior', '负责自动化运维和监控'),
  
  -- 安全部
  ('pos-security-lead', '安全主管', 'dept-security', 'senior', '负责安全策略和漏洞管理'),
  ('pos-security-engineer', '安全工程师', 'dept-security', 'intermediate', '负责安全测试和审计'),
  
  -- 测试部
  ('pos-test-manager', '测试经理', 'dept-testing', 'senior', '负责测试团队管理和质量保障'),
  ('pos-senior-tester', '高级测试工程师', 'dept-testing', 'senior', '负责复杂测试和自动化测试'),
  ('pos-mid-tester', '中级测试工程师', 'dept-testing', 'intermediate', '负责功能测试和用例执行'),
  ('pos-junior-tester', '初级测试工程师', 'dept-testing', 'junior', '负责基础测试和学习成长'),
  
  -- 人力资源部
  ('pos-hr-director', '人力资源总监', 'dept-hr', 'director', '负责人力资源战略规划'),
  ('pos-hr-manager', 'HR 经理', 'dept-hr', 'senior', '负责 HR 团队管理和制度建设'),
  ('pos-hr-specialist', 'HR 专员', 'dept-hr', 'intermediate', '负责招聘、培训、绩效等模块'),
  
  -- 销售部
  ('pos-sales-director', '销售总监', 'dept-sales', 'director', '负责销售战略和团队管理'),
  ('pos-sales-manager', '销售经理', 'dept-sales', 'senior', '负责销售团队管理和客户开发'),
  ('pos-sales-rep', '销售代表', 'dept-sales', 'intermediate', '负责客户维护和订单跟进'),
  
  -- 生产部
  ('pos-production-manager', '生产经理', 'dept-production', 'senior', '负责生产计划和质量控制'),
  ('pos-production-supervisor', '生产主管', 'dept-production', 'intermediate', '负责生产线管理'),
  ('pos-production-worker', '生产工人', 'dept-production', 'junior', '负责产品制造和装配'),
  
  -- 质量部
  ('pos-qa-manager', '质量经理', 'dept-quality', 'senior', '负责质量体系建设'),
  ('pos-qa-engineer', '质量工程师', 'dept-quality', 'intermediate', '负责质量检验和改进'),
  
  -- 财务部
  ('pos-finance-manager', '财务经理', 'dept-finance', 'senior', '负责财务管理和报表'),
  ('pos-accountant', '会计', 'dept-finance', 'intermediate', '负责日常账务处理')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 3. 通用考核指标（按类别）
-- ============================================

-- 业绩类指标
INSERT INTO performance_metrics (id, name, code, category, type, description, weight, formula, unit, target_value, min_value, max_value, data_source, status)
VALUES
  -- 通用业绩指标
  ('metric-task-completion', '任务完成率', 'TASK_COMPLETION', 'performance', 'quantitative', '按时完成分配的任务比例', 30, '完成任务数/总任务数*100', '%', 90, 0, 100, '系统统计', 'active'),
  ('metric-quality-rate', '工作质量', 'QUALITY_RATE', 'performance', 'quantitative', '工作成果的质量达标率', 25, '合格产出/总产出*100', '%', 95, 0, 100, '质量检验', 'active'),
  ('metric-efficiency', '工作效率', 'EFFICIENCY', 'performance', 'quantitative', '单位时间内的产出效率', 20, '实际产出/标准产出*100', '%', 100, 0, 150, '系统统计', 'active'),
  ('metric-deadline-compliance', ' deadline 遵守率', 'DEADLINE_COMPLIANCE', 'performance', 'quantitative', '按时交付的比例', 15, '按时交付数/总交付数*100', '%', 95, 0, 100, '项目管理', 'active'),
  ('metric-cost-control', '成本控制', 'COST_CONTROL', 'performance', 'quantitative', '预算执行情况', 10, '预算金额/实际支出*100', '%', 100, 0, 120, '财务系统', 'active'),
  
  -- 销售类指标
  ('metric-sales-completion', '销售额完成率', 'SALES_COMPLETION', 'performance', 'quantitative', '销售目标完成情况', 35, '实际销售额/目标销售额*100', '%', 100, 0, 150, 'CRM 系统', 'active'),
  ('metric-customer-acquisition', '新客户开发', 'NEW_CUSTOMERS', 'performance', 'quantitative', '新客户开发数量', 15, '新客户数', '个', 5, 0, 20, 'CRM 系统', 'active'),
  ('metric-payment-rate', '回款率', 'PAYMENT_RATE', 'performance', 'quantitative', '应收账款回收比例', 20, '实际回款/应收回款*100', '%', 90, 0, 100, '财务系统', 'active'),
  ('metric-customer-satisfaction', '客户满意度', 'CUSTOMER_SATISFACTION', 'performance', 'qualitative', '客户对服务的满意度评价', 15, '客户评分', '分', 4.5, 1, 5, '客户调查', 'active'),
  
  -- 技术类指标
  ('metric-code-quality', '代码质量', 'CODE_QUALITY', 'performance', 'quantitative', '代码缺陷率和规范性', 25, '1-(缺陷数/代码行数*1000)', '%', 95, 0, 100, '代码审查', 'active'),
  ('metric-bug-fix-rate', 'Bug 修复率', 'BUG_FIX_RATE', 'performance', 'quantitative', 'Bug 修复及时性和质量', 20, '按时修复 Bug 数/总 Bug 数*100', '%', 90, 0, 100, '缺陷管理', 'active'),
  ('metric-innovation', '技术创新', 'INNOVATION', 'performance', 'qualitative', '技术创新和改进贡献', 15, '创新提案采纳数', '个', 2, 0, 10, '技术委员会', 'active'),
  ('metric-documentation', '文档完整性', 'DOCUMENTATION', 'performance', 'qualitative', '技术文档的完整性和质量', 10, '文档完整度评分', '分', 4.0, 1, 5, '文档审查', 'active'),
  
  -- 生产类指标
  ('metric-output-completion', '产量完成率', 'OUTPUT_COMPLETION', 'performance', 'quantitative', '生产计划完成情况', 30, '实际产量/计划产量*100', '%', 100, 0, 120, '生产系统', 'active'),
  ('metric-safety-incidents', '安全事故次数', 'SAFETY_INCIDENTS', 'performance', 'quantitative', '安全事故发生次数', 25, '事故次数', '次', 0, 0, 5, '安全记录', 'active'),
  ('metric-equipment-utilization', '设备利用率', 'EQUIPMENT_UTILIZATION', 'performance', 'quantitative', '设备使用效率', 20, '实际运行时间/计划运行时间*100', '%', 85, 0, 100, '设备管理', 'active'),
  
  -- 管理类指标
  ('metric-team-performance', '团队绩效', 'TEAM_PERFORMANCE', 'performance', 'quantitative', '团队整体绩效达成情况', 30, '团队平均绩效得分', '分', 4.0, 1, 5, '绩效系统', 'active'),
  ('metric-project-delivery', '项目交付', 'PROJECT_DELIVERY', 'performance', 'quantitative', '项目按时按质交付情况', 25, '按时交付项目数/总项目数*100', '%', 90, 0, 100, '项目管理', 'active'),
  ('metric-strategic-execution', '战略执行', 'STRATEGIC_EXECUTION', 'performance', 'qualitative', '公司战略执行情况', 20, '战略目标达成率', '%', 80, 0, 100, '管理层评估', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  weight = EXCLUDED.weight,
  updated_at = CURRENT_TIMESTAMP;

-- 能力类指标
INSERT INTO performance_metrics (id, name, code, category, type, description, weight, formula, unit, target_value, min_value, max_value, data_source, status)
VALUES
  ('metric-professional-skills', '专业技能', 'PROFESSIONAL_SKILLS', 'ability', 'qualitative', '岗位专业技能的掌握程度', 25, '技能评估评分', '分', 4.0, 1, 5, '技能评估', 'active'),
  ('metric-learning-ability', '学习能力', 'LEARNING_ABILITY', 'ability', 'qualitative', '新知识新技能的学习速度', 20, '学习成果评估', '分', 4.0, 1, 5, '培训评估', 'active'),
  ('metric-problem-solving', '问题解决', 'PROBLEM_SOLVING', 'ability', 'qualitative', '分析和解决问题的能力', 25, '问题解决效果评估', '分', 4.0, 1, 5, '主管评估', 'active'),
  ('metric-communication', '沟通能力', 'COMMUNICATION', 'ability', 'qualitative', '内外部沟通协调能力', 15, '沟通效果评估', '分', 4.0, 1, 5, '360 评估', 'active'),
  ('metric-leadership', '领导力', 'LEADERSHIP', 'ability', 'qualitative', '团队领导和影响力', 15, '领导力评估', '分', 4.0, 1, 5, '360 评估', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  weight = EXCLUDED.weight,
  updated_at = CURRENT_TIMESTAMP;

-- 态度类指标
INSERT INTO performance_metrics (id, name, code, category, type, description, weight, formula, unit, target_value, min_value, max_value, data_source, status)
VALUES
  ('metric-responsibility', '责任心', 'RESPONSIBILITY', 'attitude', 'qualitative', '工作责任心和担当精神', 30, '责任心评估', '分', 4.5, 1, 5, '主管评估', 'active'),
  ('metric-teamwork', '团队协作', 'TEAMWORK', 'attitude', 'qualitative', '团队合作精神和配合度', 25, '团队协作评估', '分', 4.5, 1, 5, '360 评估', 'active'),
  ('metric-initiative', '主动性', 'INITIATIVE', 'attitude', 'qualitative', '工作主动性和积极性', 25, '主动性评估', '分', 4.0, 1, 5, '主管评估', 'active'),
  ('metric-attendance', '出勤率', 'ATTENDANCE', 'attitude', 'quantitative', '出勤情况', 20, '实际出勤天数/应出勤天数*100', '%', 100, 0, 100, '考勤系统', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  weight = EXCLUDED.weight,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 4. 评分标准（L1-L5 五级评分）
-- ============================================
INSERT INTO scoring_criteria (id, metric_id, level, score, description)
SELECT 
  md5(random()::text)::uuid,
  id,
  level,
  score,
  description
FROM (
  VALUES
    ('metric-task-completion', 'L1', 0.5, '严重不达标，完成率<60%'),
    ('metric-task-completion', 'L2', 0.8, '部分达标，完成率 60-79%'),
    ('metric-task-completion', 'L3', 1.0, '基本达标，完成率 80-94%'),
    ('metric-task-completion', 'L4', 1.2, '优秀达标，完成率 95-109%'),
    ('metric-task-completion', 'L5', 1.5, '卓越达标，完成率≥110%'),
    
    ('metric-quality-rate', 'L1', 0.5, '质量严重不达标，合格率<80%'),
    ('metric-quality-rate', 'L2', 0.8, '质量部分达标，合格率 80-89%'),
    ('metric-quality-rate', 'L3', 1.0, '质量基本达标，合格率 90-94%'),
    ('metric-quality-rate', 'L4', 1.2, '质量优秀，合格率 95-98%'),
    ('metric-quality-rate', 'L5', 1.5, '质量卓越，合格率≥99%'),
    
    ('metric-efficiency', 'L1', 0.5, '效率严重不足，<70%'),
    ('metric-efficiency', 'L2', 0.8, '效率部分达标，70-89%'),
    ('metric-efficiency', 'L3', 1.0, '效率基本达标，90-109%'),
    ('metric-efficiency', 'L4', 1.2, '效率优秀，110-129%'),
    ('metric-efficiency', 'L5', 1.5, '效率卓越，≥130%'),
    
    ('metric-deadline-compliance', 'L1', 0.5, '严重超时，遵守率<70%'),
    ('metric-deadline-compliance', 'L2', 0.8, '部分超时，遵守率 70-84%'),
    ('metric-deadline-compliance', 'L3', 1.0, '基本按时，遵守率 85-94%'),
    ('metric-deadline-compliance', 'L4', 1.2, '优秀按时，遵守率 95-99%'),
    ('metric-deadline-compliance', 'L5', 1.5, '卓越按时，遵守率 100%'),
    
    ('metric-professional-skills', 'L1', 0.5, '专业技能严重不足'),
    ('metric-professional-skills', 'L2', 0.8, '专业技能部分掌握'),
    ('metric-professional-skills', 'L3', 1.0, '专业技能基本达标'),
    ('metric-professional-skills', 'L4', 1.2, '专业技能优秀'),
    ('metric-professional-skills', 'L5', 1.5, '专业技能卓越'),
    
    ('metric-responsibility', 'L1', 0.5, '责任心严重不足'),
    ('metric-responsibility', 'L2', 0.8, '责任心部分体现'),
    ('metric-responsibility', 'L3', 1.0, '责任心基本达标'),
    ('metric-responsibility', 'L4', 1.2, '责任心强'),
    ('metric-responsibility', 'L5', 1.5, '责任心卓越，主动担当'),
    
    ('metric-teamwork', 'L1', 0.5, '团队协作差'),
    ('metric-teamwork', 'L2', 0.8, '团队协作部分配合'),
    ('metric-teamwork', 'L3', 1.0, '团队协作基本达标'),
    ('metric-teamwork', 'L4', 1.2, '团队协作良好'),
    ('metric-teamwork', 'L5', 1.5, '团队协作卓越，促进团队凝聚'),
    
    ('metric-initiative', 'L1', 0.5, '缺乏主动性'),
    ('metric-initiative', 'L2', 0.8, '主动性一般'),
    ('metric-initiative', 'L3', 1.0, '主动性基本达标'),
    ('metric-initiative', 'L4', 1.2, '主动性强'),
    ('metric-initiative', 'L5', 1.5, '主动性卓越，持续创新')
) AS scoring_data(metric_id, level, score, description)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. 考核模板（按部门 + 岗位 + 级别）
-- ============================================

-- 工程技术中心 - 高级工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-eng-senior', '工程技术中心 - 高级工程师考核模板', '适用于高级工程师的绩效考核', 'pos-senior-engineer', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 工程技术中心 - 中级工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-eng-mid', '工程技术中心 - 中级工程师考核模板', '适用于中级工程师的绩效考核', 'pos-mid-engineer', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 工程技术中心 - 初级工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-eng-junior', '工程技术中心 - 初级工程师考核模板', '适用于初级工程师的绩效考核', 'pos-junior-engineer', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 前端开发部 - 前端开发主管模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-frontend-lead', '前端开发部 - 前端开发主管考核模板', '适用于前端开发主管的绩效考核', 'pos-frontend-lead', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 前端开发部 - 高级前端工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-frontend-senior', '前端开发部 - 高级前端工程师考核模板', '适用于高级前端工程师的绩效考核', 'pos-senior-frontend', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 前端开发部 - 中级前端工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-frontend-mid', '前端开发部 - 中级前端工程师考核模板', '适用于中级前端工程师的绩效考核', 'pos-mid-frontend', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 后端开发部 - 后端开发主管模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-backend-lead', '后端开发部 - 后端开发主管考核模板', '适用于后端开发主管的绩效考核', 'pos-backend-lead', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 后端开发部 - 高级后端工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-backend-senior', '后端开发部 - 高级后端工程师考核模板', '适用于高级后端工程师的绩效考核', 'pos-senior-backend', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 后端开发部 - 中级后端工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-backend-mid', '后端开发部 - 中级后端工程师考核模板', '适用于中级后端工程师的绩效考核', 'pos-mid-backend', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 架构部 - 架构师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-architect', '架构部 - 架构师考核模板', '适用于架构师的绩效考核', 'pos-architect', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 架构部 - 高级架构师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-senior-architect', '架构部 - 高级架构师考核模板', '适用于高级架构师的绩效考核', 'pos-senior-architect', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 运维开发部 - 运维开发主管模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-devops-lead', '运维开发部 - 运维开发主管考核模板', '适用于运维开发主管的绩效考核', 'pos-devops-lead', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 运维开发部 - 高级运维工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-devops-senior', '运维开发部 - 高级运维工程师考核模板', '适用于高级运维工程师的绩效考核', 'pos-senior-devops', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 安全部 - 安全主管模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-security-lead', '安全部 - 安全主管考核模板', '适用于安全主管的绩效考核', 'pos-security-lead', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 安全部 - 安全工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-security-engineer', '安全部 - 安全工程师考核模板', '适用于安全工程师的绩效考核', 'pos-security-engineer', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 测试部 - 高级测试工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-test-senior', '测试部 - 高级测试工程师考核模板', '适用于高级测试工程师的绩效考核', 'pos-senior-tester', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 测试部 - 中级测试工程师模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-test-mid', '测试部 - 中级测试工程师考核模板', '适用于中级测试工程师的绩效考核', 'pos-mid-tester', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 销售部 - 销售经理模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-sales-manager', '销售部 - 销售经理考核模板', '适用于销售经理的绩效考核', 'pos-sales-manager', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 销售部 - 销售代表模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-sales-rep', '销售部 - 销售代表考核模板', '适用于销售代表的绩效考核', 'pos-sales-rep', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 生产部 - 生产经理模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-prod-manager', '生产部 - 生产经理考核模板', '适用于生产经理的绩效考核', 'pos-production-manager', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 生产部 - 生产工人模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-prod-worker', '生产部 - 生产工人考核模板', '适用于生产工人的绩效考核', 'pos-production-worker', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 人力资源部 - HR 经理模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-hr-manager', '人力资源部 - HR 经理考核模板', '适用于 HR 经理的绩效考核', 'pos-hr-manager', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 质量部 - 质量经理模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-qa-manager', '质量部 - 质量经理考核模板', '适用于质量经理的绩效考核', 'pos-qa-manager', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 财务部 - 财务经理模板
INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES ('template-finance-manager', '财务部 - 财务经理考核模板', '适用于财务经理的绩效考核', 'pos-finance-manager', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- 6. 模板 - 指标关联（配置权重）
-- ============================================

-- 高级工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-eng-senior', 'metric-task-completion', 25, true),
  ('template-eng-senior', 'metric-code-quality', 20, true),
  ('template-eng-senior', 'metric-bug-fix-rate', 15, true),
  ('template-eng-senior', 'metric-innovation', 15, true),
  ('template-eng-senior', 'metric-documentation', 10, true),
  ('template-eng-senior', 'metric-professional-skills', 10, true),
  ('template-eng-senior', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 中级工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-eng-mid', 'metric-task-completion', 30, true),
  ('template-eng-mid', 'metric-code-quality', 20, true),
  ('template-eng-mid', 'metric-bug-fix-rate', 15, true),
  ('template-eng-mid', 'metric-documentation', 10, true),
  ('template-eng-mid', 'metric-professional-skills', 10, true),
  ('template-eng-mid', 'metric-learning-ability', 10, true),
  ('template-eng-mid', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 初级工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-eng-junior', 'metric-task-completion', 35, true),
  ('template-eng-junior', 'metric-quality-rate', 20, true),
  ('template-eng-junior', 'metric-learning-ability', 20, true),
  ('template-eng-junior', 'metric-professional-skills', 10, true),
  ('template-eng-junior', 'metric-initiative', 10, true),
  ('template-eng-junior', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 前端开发主管模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-frontend-lead', 'metric-task-completion', 20, true),
  ('template-frontend-lead', 'metric-code-quality', 15, true),
  ('template-frontend-lead', 'metric-project-delivery', 20, true),
  ('template-frontend-lead', 'metric-leadership', 15, true),
  ('template-frontend-lead', 'metric-professional-skills', 10, true),
  ('template-frontend-lead', 'metric-teamwork', 10, true),
  ('template-frontend-lead', 'metric-innovation', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级前端工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-frontend-senior', 'metric-task-completion', 25, true),
  ('template-frontend-senior', 'metric-code-quality', 20, true),
  ('template-frontend-senior', 'metric-bug-fix-rate', 15, true),
  ('template-frontend-senior', 'metric-innovation', 15, true),
  ('template-frontend-senior', 'metric-documentation', 10, true),
  ('template-frontend-senior', 'metric-professional-skills', 10, true),
  ('template-frontend-senior', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 中级前端工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-frontend-mid', 'metric-task-completion', 30, true),
  ('template-frontend-mid', 'metric-code-quality', 20, true),
  ('template-frontend-mid', 'metric-bug-fix-rate', 15, true),
  ('template-frontend-mid', 'metric-documentation', 10, true),
  ('template-frontend-mid', 'metric-professional-skills', 10, true),
  ('template-frontend-mid', 'metric-learning-ability', 10, true),
  ('template-frontend-mid', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 后端开发主管模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-backend-lead', 'metric-task-completion', 20, true),
  ('template-backend-lead', 'metric-code-quality', 15, true),
  ('template-backend-lead', 'metric-project-delivery', 20, true),
  ('template-backend-lead', 'metric-leadership', 15, true),
  ('template-backend-lead', 'metric-professional-skills', 10, true),
  ('template-backend-lead', 'metric-teamwork', 10, true),
  ('template-backend-lead', 'metric-innovation', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级后端工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-backend-senior', 'metric-task-completion', 25, true),
  ('template-backend-senior', 'metric-code-quality', 20, true),
  ('template-backend-senior', 'metric-bug-fix-rate', 15, true),
  ('template-backend-senior', 'metric-innovation', 15, true),
  ('template-backend-senior', 'metric-documentation', 10, true),
  ('template-backend-senior', 'metric-professional-skills', 10, true),
  ('template-backend-senior', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 中级后端工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-backend-mid', 'metric-task-completion', 30, true),
  ('template-backend-mid', 'metric-code-quality', 20, true),
  ('template-backend-mid', 'metric-bug-fix-rate', 15, true),
  ('template-backend-mid', 'metric-documentation', 10, true),
  ('template-backend-mid', 'metric-professional-skills', 10, true),
  ('template-backend-mid', 'metric-learning-ability', 10, true),
  ('template-backend-mid', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 架构师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-architect', 'metric-task-completion', 20, true),
  ('template-architect', 'metric-innovation', 25, true),
  ('template-architect', 'metric-problem-solving', 20, true),
  ('template-architect', 'metric-documentation', 15, true),
  ('template-architect', 'metric-professional-skills', 10, true),
  ('template-architect', 'metric-leadership', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级架构师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-senior-architect', 'metric-task-completion', 15, true),
  ('template-senior-architect', 'metric-innovation', 30, true),
  ('template-senior-architect', 'metric-problem-solving', 25, true),
  ('template-senior-architect', 'metric-documentation', 15, true),
  ('template-senior-architect', 'metric-leadership', 15, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 运维开发主管模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-devops-lead', 'metric-task-completion', 20, true),
  ('template-devops-lead', 'metric-efficiency', 20, true),
  ('template-devops-lead', 'metric-leadership', 15, true),
  ('template-devops-lead', 'metric-innovation', 15, true),
  ('template-devops-lead', 'metric-documentation', 10, true),
  ('template-devops-lead', 'metric-teamwork', 10, true),
  ('template-devops-lead', 'metric-problem-solving', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级运维工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-devops-senior', 'metric-task-completion', 25, true),
  ('template-devops-senior', 'metric-efficiency', 20, true),
  ('template-devops-senior', 'metric-innovation', 15, true),
  ('template-devops-senior', 'metric-problem-solving', 15, true),
  ('template-devops-senior', 'metric-documentation', 10, true),
  ('template-devops-senior', 'metric-professional-skills', 10, true),
  ('template-devops-senior', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 安全主管模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-security-lead', 'metric-task-completion', 20, true),
  ('template-security-lead', 'metric-problem-solving', 25, true),
  ('template-security-lead', 'metric-leadership', 15, true),
  ('template-security-lead', 'metric-documentation', 15, true),
  ('template-security-lead', 'metric-innovation', 10, true),
  ('template-security-lead', 'metric-teamwork', 10, true),
  ('template-security-lead', 'metric-professional-skills', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 安全工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-security-engineer', 'metric-task-completion', 25, true),
  ('template-security-engineer', 'metric-problem-solving', 20, true),
  ('template-security-engineer', 'metric-documentation', 20, true),
  ('template-security-engineer', 'metric-professional-skills', 15, true),
  ('template-security-engineer', 'metric-learning-ability', 10, true),
  ('template-security-engineer', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级测试工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-test-senior', 'metric-task-completion', 25, true),
  ('template-test-senior', 'metric-quality-rate', 20, true),
  ('template-test-senior', 'metric-bug-fix-rate', 15, true),
  ('template-test-senior', 'metric-innovation', 15, true),
  ('template-test-senior', 'metric-documentation', 10, true),
  ('template-test-senior', 'metric-professional-skills', 10, true),
  ('template-test-senior', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 中级测试工程师模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-test-mid', 'metric-task-completion', 30, true),
  ('template-test-mid', 'metric-quality-rate', 25, true),
  ('template-test-mid', 'metric-efficiency', 15, true),
  ('template-test-mid', 'metric-documentation', 10, true),
  ('template-test-mid', 'metric-professional-skills', 10, true),
  ('template-test-mid', 'metric-learning-ability', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 销售经理模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-sales-manager', 'metric-sales-completion', 30, true),
  ('template-sales-manager', 'metric-payment-rate', 20, true),
  ('template-sales-manager', 'metric-team-performance', 20, true),
  ('template-sales-manager', 'metric-customer-satisfaction', 15, true),
  ('template-sales-manager', 'metric-leadership', 10, true),
  ('template-sales-manager', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 销售代表模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-sales-rep', 'metric-sales-completion', 35, true),
  ('template-sales-rep', 'metric-customer-acquisition', 20, true),
  ('template-sales-rep', 'metric-payment-rate', 15, true),
  ('template-sales-rep', 'metric-customer-satisfaction', 15, true),
  ('template-sales-rep', 'metric-initiative', 10, true),
  ('template-sales-rep', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 生产经理模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-prod-manager', 'metric-output-completion', 25, true),
  ('template-prod-manager', 'metric-quality-rate', 20, true),
  ('template-prod-manager', 'metric-safety-incidents', 20, true),
  ('template-prod-manager', 'metric-equipment-utilization', 15, true),
  ('template-prod-manager', 'metric-team-performance', 10, true),
  ('template-prod-manager', 'metric-leadership', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 生产工人模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-prod-worker', 'metric-output-completion', 35, true),
  ('template-prod-worker', 'metric-quality-rate', 25, true),
  ('template-prod-worker', 'metric-safety-incidents', 20, true),
  ('template-prod-worker', 'metric-attendance', 10, true),
  ('template-prod-worker', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- HR 经理模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-hr-manager', 'metric-task-completion', 25, true),
  ('template-hr-manager', 'metric-team-performance', 20, true),
  ('template-hr-manager', 'metric-strategic-execution', 20, true),
  ('template-hr-manager', 'metric-leadership', 15, true),
  ('template-hr-manager', 'metric-communication', 10, true),
  ('template-hr-manager', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 质量经理模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-qa-manager', 'metric-quality-rate', 30, true),
  ('template-qa-manager', 'metric-task-completion', 20, true),
  ('template-qa-manager', 'metric-problem-solving', 20, true),
  ('template-qa-manager', 'metric-documentation', 15, true),
  ('template-qa-manager', 'metric-communication', 10, true),
  ('template-qa-manager', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 财务经理模板指标配置
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('template-finance-manager', 'metric-task-completion', 25, true),
  ('template-finance-manager', 'metric-cost-control', 25, true),
  ('template-finance-manager', 'metric-quality-rate', 20, true),
  ('template-finance-manager', 'metric-documentation', 15, true),
  ('template-finance-manager', 'metric-communication', 10, true),
  ('template-finance-manager', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- ============================================
-- 7. 指标 - 部门关联
-- ============================================
INSERT INTO metric_departments (metric_id, department_id)
SELECT m.id, d.id
FROM performance_metrics m, departments d
WHERE m.code IN ('TASK_COMPLETION', 'QUALITY_RATE', 'EFFICIENCY', 'DEADLINE_COMPLIANCE', 'PROFESSIONAL_SKILLS', 'TEAMWORK', 'INITIATIVE')
ON CONFLICT (metric_id, department_id) DO NOTHING;

-- ============================================
-- 8. 指标 - 级别关联
-- ============================================
INSERT INTO metric_levels (metric_id, level)
SELECT m.id, l.level
FROM performance_metrics m, (VALUES ('junior'), ('intermediate'), ('senior'), ('director')) l(level)
ON CONFLICT (metric_id, level) DO NOTHING;

-- ============================================
-- 完成提示
-- ============================================
SELECT '✅ 核心部门、岗位、考核模板初始化完成！' AS result;
