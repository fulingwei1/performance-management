-- Local PostgreSQL hardening for the current performance-management app.
-- This file is intentionally idempotent so it can be used both by Docker init
-- and by backend/run-migrations-pg.js on an existing local database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE performance_records
  ADD COLUMN IF NOT EXISTS evaluation_keywords JSONB DEFAULT '[]'::jsonb;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS id_card_last6_hash TEXT;

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
  ('template-sales-001', '销售部门标准模板', '适用于销售岗位的考核模板：业绩导向，70%量化指标+30%行为指标', 'sales', true, 'active'),
  ('template-engineering-001', '工程技术部门标准模板', '适用于工程技术岗位：项目交付50%+技术能力30%+协作成长20%', 'engineering', true, 'active'),
  ('template-manufacturing-001', '生产制造部门标准模板', '适用于生产制造岗位：效率40%+质量安全40%+现场管理20%', 'manufacturing', true, 'active'),
  ('template-support-001', '支持部门标准模板', '适用于财务、人事、行政、采购等支持岗位：质量50%+服务30%+能力20%', 'support', true, 'active')
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
  ('metric-eng-001', 'template-engineering-001', '项目按时完成率', 'PROJECT_ONTIME_RATE', 'performance', 20.00, '按时交付项目数/总项目数', 'quantitative', 1),
  ('metric-eng-002', 'template-engineering-001', '一次验收通过率', 'FIRST_PASS_RATE', 'performance', 15.00, '一次验收通过数/总验收数', 'quantitative', 2),
  ('metric-eng-003', 'template-engineering-001', '技术方案合理性', 'SOLUTION_QUALITY', 'performance', 15.00, '方案设计质量、可行性评估', 'qualitative', 3),
  ('metric-eng-004', 'template-engineering-001', '技术难题解决能力', 'PROBLEM_SOLVING', 'innovation', 15.00, '攻克技术难题的能力', 'qualitative', 4),
  ('metric-eng-005', 'template-engineering-001', '创新贡献', 'INNOVATION', 'innovation', 10.00, '专利、技术改进提案', 'quantitative', 5),
  ('metric-eng-006', 'template-engineering-001', '技术文档完整性', 'DOCUMENTATION', 'performance', 5.00, '技术文档的完整性和规范性', 'qualitative', 6),
  ('metric-eng-007', 'template-engineering-001', '跨部门协作', 'CROSS_TEAM_COLLABORATION', 'collaboration', 10.00, '与其他部门的协作配合', 'qualitative', 7),
  ('metric-eng-008', 'template-engineering-001', '技术分享与培训', 'KNOWLEDGE_SHARING', 'collaboration', 10.00, '技术分享次数和质量', 'quantitative', 8),
  ('metric-mfg-001', 'template-manufacturing-001', '产量完成率', 'OUTPUT_COMPLETION', 'performance', 20.00, '实际产量/目标产量', 'quantitative', 1),
  ('metric-mfg-002', 'template-manufacturing-001', '生产效率', 'PRODUCTION_EFFICIENCY', 'performance', 10.00, '单位时间产出', 'quantitative', 2),
  ('metric-mfg-003', 'template-manufacturing-001', '设备利用率', 'EQUIPMENT_UTILIZATION', 'performance', 10.00, '设备有效运转时间占比', 'quantitative', 3),
  ('metric-mfg-004', 'template-manufacturing-001', '产品合格率', 'QUALITY_RATE', 'performance', 20.00, '合格产品数/总产品数', 'quantitative', 4),
  ('metric-mfg-005', 'template-manufacturing-001', '安全事故率', 'SAFETY_INCIDENT_RATE', 'performance', 15.00, '安全事故次数（零事故=满分）', 'quantitative', 5),
  ('metric-mfg-006', 'template-manufacturing-001', '物料损耗率', 'MATERIAL_LOSS_RATE', 'performance', 5.00, '物料浪费比例', 'quantitative', 6),
  ('metric-mfg-007', 'template-manufacturing-001', '5S现场管理', '5S_MANAGEMENT', 'behavior', 10.00, '现场整理整顿清扫清洁素养', 'qualitative', 7),
  ('metric-mfg-008', 'template-manufacturing-001', '团队协作', 'TEAMWORK', 'collaboration', 10.00, '班组协作、互帮互助', 'qualitative', 8),
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

CREATE TABLE IF NOT EXISTS review_cycles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  review_type VARCHAR(50) NOT NULL DEFAULT 'peer',
  is_anonymous BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_relationships (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL,
  reviewee_id INTEGER NOT NULL,
  relationship_type VARCHAR(50) NOT NULL,
  department_id INTEGER,
  weight DECIMAL(3,2) DEFAULT 1.00,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT review_relationships_unique_pair UNIQUE (cycle_id, reviewer_id, reviewee_id)
);

ALTER TABLE peer_reviews
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS relationship_id INTEGER,
  ADD COLUMN IF NOT EXISTS cycle_id INTEGER,
  ADD COLUMN IF NOT EXISTS teamwork_score DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS communication_score DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS professional_score DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS responsibility_score DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS innovation_score DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS total_score DECIMAL(3,1),
  ADD COLUMN IF NOT EXISTS strengths TEXT,
  ADD COLUMN IF NOT EXISTS improvements TEXT,
  ADD COLUMN IF NOT EXISTS overall_comment TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS review_statistics (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  reviewee_id INTEGER NOT NULL,
  total_reviews INTEGER DEFAULT 0,
  completed_reviews INTEGER DEFAULT 0,
  avg_teamwork DECIMAL(3,2),
  avg_communication DECIMAL(3,2),
  avg_professional DECIMAL(3,2),
  avg_responsibility DECIMAL(3,2),
  avg_innovation DECIMAL(3,2),
  avg_total_score DECIMAL(3,2),
  last_calculated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT review_statistics_unique_reviewee UNIQUE (cycle_id, reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);
CREATE INDEX IF NOT EXISTS idx_review_relationships_cycle ON review_relationships(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_relationships_reviewer ON review_relationships(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_relationships_reviewee ON review_relationships(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_cycle ON peer_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer_adv ON peer_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewee_adv ON peer_reviews(reviewee_id);

CREATE TABLE IF NOT EXISTS interview_plans (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  interview_type VARCHAR(50) NOT NULL DEFAULT 'regular',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  manager_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  department_id INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  template_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  interview_type VARCHAR(50) NOT NULL,
  description TEXT,
  questions JSONB,
  is_default BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_records (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER REFERENCES interview_plans(id) ON DELETE SET NULL,
  employee_id INTEGER NOT NULL,
  manager_id INTEGER NOT NULL,
  interview_date DATE NOT NULL,
  interview_time TIME,
  duration_minutes INTEGER,
  employee_summary TEXT,
  manager_feedback TEXT,
  achievements TEXT,
  challenges TEXT,
  strengths TEXT,
  improvements TEXT,
  overall_rating DECIMAL(2,1),
  performance_score DECIMAL(2,1),
  potential_score DECIMAL(2,1),
  nine_box_performance VARCHAR(20),
  nine_box_potential VARCHAR(20),
  notes TEXT,
  attachments JSONB,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS improvement_plans (
  id SERIAL PRIMARY KEY,
  interview_record_id INTEGER NOT NULL REFERENCES interview_records(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL,
  manager_id INTEGER NOT NULL,
  goal VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  start_date DATE,
  target_date DATE,
  actual_completion_date DATE,
  status VARCHAR(20) DEFAULT 'not_started',
  progress_percentage INTEGER DEFAULT 0,
  resources_needed TEXT,
  support_from_manager TEXT,
  follow_up_notes TEXT,
  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_reminders (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES interview_plans(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL,
  recipient_type VARCHAR(20) NOT NULL,
  reminder_type VARCHAR(50) NOT NULL,
  reminder_date DATE NOT NULL,
  reminder_time TIME,
  message TEXT,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interview_plans_manager ON interview_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_interview_plans_employee ON interview_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_interview_records_employee ON interview_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_interview_records_manager ON interview_records(manager_id);
CREATE INDEX IF NOT EXISTS idx_improvement_plans_employee ON improvement_plans(employee_id);

INSERT INTO interview_templates (name, interview_type, description, questions, is_default, status)
VALUES
  ('常规绩效面谈模板', 'regular', '季度/年度绩效面谈标准模板', '[{"question":"这个周期你最大的成就是什么？","category":"achievement","required":true},{"question":"你遇到了哪些挑战？如何应对的？","category":"challenge","required":true},{"question":"你的职业发展目标是什么？","category":"career","required":true},{"question":"你需要哪些支持来提升绩效？","category":"support","required":true},{"question":"对团队/公司有什么建议？","category":"feedback","required":false}]'::jsonb, true, 'active'),
  ('试用期转正面谈模板', 'probation', '试用期员工转正评估面谈', '[{"question":"试用期工作感受如何？","category":"experience","required":true},{"question":"对岗位职责的理解程度？","category":"understanding","required":true},{"question":"完成的主要工作任务？","category":"achievement","required":true},{"question":"遇到的困难和解决方式？","category":"challenge","required":true},{"question":"未来工作计划和目标？","category":"plan","required":true}]'::jsonb, true, 'active')
ON CONFLICT DO NOTHING;
