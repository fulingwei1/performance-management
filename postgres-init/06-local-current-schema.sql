-- Local PostgreSQL hardening for the current performance-management app.
-- This file is intentionally idempotent so it can be used both by Docker init
-- and by backend/run-migrations-pg.js on an existing local database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE performance_records
  ADD COLUMN IF NOT EXISTS evaluation_keywords JSONB DEFAULT '[]'::jsonb;

ALTER TABLE performance_records
  ADD COLUMN IF NOT EXISTS issue_type_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS highlight_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_type_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS improvement_action_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS issue_attribution_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS workload_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS manager_suggestion_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS score_evidence TEXT,
  ADD COLUMN IF NOT EXISTS monthly_star_recommended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_star_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS monthly_star_reason TEXT,
  ADD COLUMN IF NOT EXISTS monthly_star_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS interview_form_attachment JSONB,
  ADD COLUMN IF NOT EXISTS employee_issue_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resource_need_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS improvement_suggestion TEXT,
  ADD COLUMN IF NOT EXISTS suggestion_anonymous BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS template_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metric_scores JSONB;

CREATE INDEX IF NOT EXISTS idx_performance_records_template ON performance_records(template_id);

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS id_card_last6_hash TEXT,
  ADD COLUMN IF NOT EXISTS wecom_user_id VARCHAR(128);

CREATE TABLE IF NOT EXISTS employee_quarterly_summaries (
  id VARCHAR(100) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  month_records JSONB,
  avg_score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  min_score NUMERIC(5,2),
  trend VARCHAR(10) CHECK (trend IN ('up', 'down', 'flat')),
  best_level VARCHAR(2),
  monthly_summaries TEXT,
  monthly_plans TEXT,
  record_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, year, quarter)
);

CREATE INDEX IF NOT EXISTS idx_eqs_employee ON employee_quarterly_summaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_eqs_year_quarter ON employee_quarterly_summaries(year, quarter);
CREATE INDEX IF NOT EXISTS idx_eqs_avg_score ON employee_quarterly_summaries(year, quarter, avg_score DESC);

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  parent_id VARCHAR(36) REFERENCES departments(id),
  manager_id VARCHAR(50),
  manager_name VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  department_type VARCHAR(20) DEFAULT 'support',
  use_custom_kpi BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS department_type VARCHAR(20) DEFAULT 'support',
  ADD COLUMN IF NOT EXISTS use_custom_kpi BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_type ON departments(department_type);

CREATE TABLE IF NOT EXISTS positions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  department_id VARCHAR(36) REFERENCES departments(id),
  level VARCHAR(50) DEFAULT 'junior',
  category VARCHAR(20) DEFAULT 'support',
  description TEXT,
  requirements TEXT,
  status VARCHAR(20) DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);

CREATE TABLE IF NOT EXISTS assessment_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  department_type VARCHAR(20) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_dept_type ON assessment_templates(department_type);
CREATE INDEX IF NOT EXISTS idx_templates_status ON assessment_templates(status);

ALTER TABLE assessment_templates
  ADD COLUMN IF NOT EXISTS applicable_roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_levels TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_positions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS template_metrics (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  metric_name VARCHAR(100),
  metric_code VARCHAR(50),
  category VARCHAR(50),
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  evaluation_type VARCHAR(20),
  target_value DECIMAL(10,2),
  measurement_unit VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT template_metrics_weight_range CHECK (weight >= 0 AND weight <= 100)
);

ALTER TABLE template_metrics
  ADD COLUMN IF NOT EXISTS metric_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS metric_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS target_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS measurement_unit VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_template_metrics_template ON template_metrics(template_id);
CREATE INDEX IF NOT EXISTS idx_template_metrics_code ON template_metrics(metric_code);

CREATE TABLE IF NOT EXISTS metric_scoring_criteria (
  id VARCHAR(36) PRIMARY KEY,
  metric_id VARCHAR(36) NOT NULL REFERENCES template_metrics(id) ON DELETE CASCADE,
  level VARCHAR(10) NOT NULL,
  score DECIMAL(3,2) NOT NULL,
  description TEXT NOT NULL,
  min_value DECIMAL(10,2),
  max_value DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT metric_scoring_score_range CHECK (score >= 0.5 AND score <= 1.5)
);

CREATE INDEX IF NOT EXISTS idx_scoring_criteria_metric ON metric_scoring_criteria(metric_id);

CREATE TABLE IF NOT EXISTS department_templates (
  id VARCHAR(36) PRIMARY KEY,
  department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  template_id VARCHAR(36) NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(department_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_templates_dept ON department_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_templates_template ON department_templates(template_id);

CREATE TABLE IF NOT EXISTS level_template_rules (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  department_type VARCHAR(50) NOT NULL,
  level VARCHAR(50) NOT NULL,
  template_id VARCHAR(36) NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  set_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(department_type, level)
);

CREATE INDEX IF NOT EXISTS idx_level_template_rules_dept_type ON level_template_rules(department_type);
CREATE INDEX IF NOT EXISTS idx_level_template_rules_template ON level_template_rules(template_id);

INSERT INTO assessment_templates (id, name, description, department_type, is_default, status)
VALUES
  ('template-sales-001', '销售部门标准模板', '适用于销售岗位的考核模板：业绩导向，70%量化指标+30%行为指标', 'sales', true, 'archived'),
  ('template-engineering-001', '工程技术部门标准模板', '适用于工程技术岗位：任务交付25%+质量验收20%+技术方案25%+文档沉淀15%+协作改进15%', 'engineering', true, 'archived'),
  ('template-manufacturing-001', '生产制造部门标准模板', '适用于生产制造岗位：任务交付25%+作业质量30%+工艺规范20%+现场管理15%+团队协作10%', 'manufacturing', true, 'archived'),
  ('template-support-001', '支持部门标准模板', '适用于财务、人事、行政、采购等支持岗位：质量50%+服务30%+能力20%', 'support', true, 'archived')
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_metrics (id, template_id, metric_name, metric_code, category, weight, description, evaluation_type, sort_order)
VALUES
  ('metric-sales-001', 'template-sales-001', '销售额完成率', 'SALES_COMPLETION', 'performance', 30.00, '实际销售额/目标销售额', 'quantitative', 1),
  ('metric-sales-002', 'template-sales-001', '回款率', 'PAYMENT_RATE', 'performance', 20.00, '实际回款/应收款项', 'quantitative', 2),
  ('metric-sales-003', 'template-sales-001', '新客户开发', 'NEW_CLIENTS', 'performance', 10.00, '新增有效客户数量', 'quantitative', 3),
  ('metric-sales-004', 'template-sales-001', '客户满意度', 'CLIENT_SATISFACTION', 'performance', 10.00, '客户满意度调查得分', 'quantitative', 4),
  ('metric-sales-005', 'template-sales-001', '客户关系维护', 'CLIENT_RELATIONSHIP', 'behavior', 10.00, '客户拜访频率、关系维护质量', 'qualitative', 5),
  ('metric-sales-006', 'template-sales-001', '团队协作', 'TEAMWORK', 'collaboration', 10.00, '跨部门协作、信息共享', 'qualitative', 6),
  ('metric-sales-007', 'template-sales-001', '专业能力提升', 'SKILL_DEVELOPMENT', 'behavior', 10.00, '产品知识、销售技巧提升', 'qualitative', 7),
  ('metric-eng-001', 'template-engineering-001', '任务交付与进度', 'TASK_DELIVERY_PROGRESS', 'performance', 25.00, '按项目计划、任务安排完成交付，关注进度响应和闭环', 'qualitative', 1),
  ('metric-eng-002', 'template-engineering-001', '质量验收与问题控制', 'QUALITY_ACCEPTANCE_CONTROL', 'performance', 20.00, '交付成果质量、验收通过情况、问题和返工控制', 'qualitative', 2),
  ('metric-eng-003', 'template-engineering-001', '技术方案与问题解决', 'SOLUTION_AND_PROBLEM_SOLVING', 'innovation', 25.00, '方案合理性、技术难点处理、异常定位和改进能力', 'qualitative', 3),
  ('metric-eng-004', 'template-engineering-001', '文档规范与知识沉淀', 'DOCUMENTATION_KNOWLEDGE', 'performance', 15.00, '图纸、代码、测试记录、技术文档和经验沉淀的完整规范性', 'qualitative', 4),
  ('metric-eng-005', 'template-engineering-001', '协作沟通与主动改进', 'COLLABORATION_IMPROVEMENT', 'collaboration', 15.00, '跨部门协作、沟通反馈、主动改进和技术分享', 'qualitative', 5),
  ('metric-mfg-001', 'template-manufacturing-001', '任务完成与交付', 'TASK_DELIVERY', 'performance', 25.00, '按派工/计划要求完成本月任务，不按产量硬指标考核', 'qualitative', 1),
  ('metric-mfg-002', 'template-manufacturing-001', '作业质量与返工控制', 'WORK_QUALITY_REWORK_CONTROL', 'performance', 30.00, '装配、接线、机加等作业质量，以及错漏、返工和异常控制', 'qualitative', 2),
  ('metric-mfg-003', 'template-manufacturing-001', '工艺规范执行', 'PROCESS_COMPLIANCE', 'behavior', 20.00, '按图纸、工艺、检验要求规范作业，减少随意操作', 'qualitative', 3),
  ('metric-mfg-004', 'template-manufacturing-001', '物料管理与现场5S', 'MATERIAL_AND_5S', 'behavior', 15.00, '物料领用、标识、保管、节约意识和现场5S执行', 'qualitative', 4),
  ('metric-mfg-005', 'template-manufacturing-001', '团队协作与问题反馈', 'TEAMWORK_AND_FEEDBACK', 'collaboration', 10.00, '班组协作、异常及时反馈、跨岗位配合和改善建议', 'qualitative', 5),
  ('metric-sup-001', 'template-support-001', '工作准确率', 'ACCURACY_RATE', 'performance', 25.00, '工作无差错率', 'quantitative', 1),
  ('metric-sup-002', 'template-support-001', '工作及时性', 'TIMELINESS', 'performance', 15.00, '按时完成率', 'quantitative', 2),
  ('metric-sup-003', 'template-support-001', '合规性', 'COMPLIANCE', 'performance', 10.00, '制度执行、无违规', 'qualitative', 3),
  ('metric-sup-004', 'template-support-001', '内部客户满意度', 'INTERNAL_SATISFACTION', 'performance', 15.00, '内部客户评价得分', 'quantitative', 4),
  ('metric-sup-005', 'template-support-001', '响应速度', 'RESPONSE_SPEED', 'behavior', 10.00, '问题响应时效', 'quantitative', 5),
  ('metric-sup-006', 'template-support-001', '主动服务意识', 'PROACTIVE_SERVICE', 'behavior', 5.00, '主动发现问题、提供支持', 'qualitative', 6),
  ('metric-sup-007', 'template-support-001', '专业知识运用', 'PROFESSIONAL_SKILL', 'performance', 10.00, '专业能力应用', 'qualitative', 7),
  ('metric-sup-008', 'template-support-001', '流程优化建议', 'PROCESS_IMPROVEMENT', 'innovation', 5.00, '改进提案数量和质量', 'quantitative', 8),
  ('metric-sup-009', 'template-support-001', '跨部门协作', 'CROSS_DEPT_COLLABORATION', 'collaboration', 5.00, '跨部门配合', 'qualitative', 9)
ON CONFLICT (id) DO NOTHING;


-- Metric library tables used by /api/metrics endpoints.
-- Keep these separate from assessment_templates/template_metrics above.
CREATE TABLE IF NOT EXISTS performance_metrics (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  formula TEXT,
  unit VARCHAR(50),
  target_value DECIMAL(12,2),
  min_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_value DECIMAL(12,2) NOT NULL DEFAULT 100,
  data_source VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_category ON performance_metrics(category);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_status ON performance_metrics(status);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_code ON performance_metrics(code);

CREATE TABLE IF NOT EXISTS metric_departments (
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (metric_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_metric_departments_metric ON metric_departments(metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_departments_department ON metric_departments(department_id);

CREATE TABLE IF NOT EXISTS metric_positions (
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  position_id VARCHAR(36) NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  PRIMARY KEY (metric_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_metric_positions_metric ON metric_positions(metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_positions_position ON metric_positions(position_id);

CREATE TABLE IF NOT EXISTS metric_levels (
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  level VARCHAR(50) NOT NULL,
  PRIMARY KEY (metric_id, level)
);

CREATE INDEX IF NOT EXISTS idx_metric_levels_metric ON metric_levels(metric_id);

CREATE TABLE IF NOT EXISTS scoring_criteria (
  id VARCHAR(100) PRIMARY KEY,
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  level VARCHAR(10) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scoring_criteria_performance_metric ON scoring_criteria(metric_id);

CREATE TABLE IF NOT EXISTS metric_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  position_id VARCHAR(36) REFERENCES positions(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metric_templates_position ON metric_templates(position_id);
CREATE INDEX IF NOT EXISTS idx_metric_templates_status ON metric_templates(status);

CREATE TABLE IF NOT EXISTS metric_template_metrics (
  template_id VARCHAR(36) NOT NULL REFERENCES metric_templates(id) ON DELETE CASCADE,
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (template_id, metric_id)
);

CREATE INDEX IF NOT EXISTS idx_metric_template_metrics_template ON metric_template_metrics(template_id);
CREATE INDEX IF NOT EXISTS idx_metric_template_metrics_metric ON metric_template_metrics(metric_id);

CREATE TABLE IF NOT EXISTS monthly_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) NOT NULL,
  month VARCHAR(7) NOT NULL,
  template_id VARCHAR(36) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  department_type VARCHAR(50) NOT NULL,
  scores JSONB NOT NULL,
  total_score DECIMAL(5,2) NOT NULL,
  evaluator_id VARCHAR(50) NOT NULL,
  evaluator_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT monthly_assessments_employee_month_unique UNIQUE (employee_id, month)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'monthly_assessments'
      AND column_name = 'template_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE monthly_assessments
      ALTER COLUMN template_id TYPE VARCHAR(36)
      USING template_id::text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_monthly_assessments_employee ON monthly_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_month ON monthly_assessments(month);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_dept_type ON monthly_assessments(department_type);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_template ON monthly_assessments(template_id);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_evaluator ON monthly_assessments(evaluator_id);

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string',
  category VARCHAR(50),
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public)
VALUES
  ('company_name', 'ATE Technology', 'string', 'general', '公司名称', true),
  ('score_scale', 'L1-L5', 'string', 'performance', '评分制度', true),
  ('assessment_publication_enabled', 'true', 'boolean', 'performance', '启用考核结果发布功能', false),
  ('performance_ranking_config', '{"version":1,"participation":{"enabledUnitKeys":[]},"groupRank":{"defaultStrategy":{"type":"by_high_low"},"perUnit":{}},"mergeRankGroups":[]}', 'json', 'performance', '绩效参与范围与排名规则配置', false)
ON CONFLICT (setting_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
