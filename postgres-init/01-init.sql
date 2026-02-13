-- ATE绩效管理系统 - PostgreSQL初始化脚本

-- 创建自定义类型
DO $$ BEGIN
  CREATE TYPE employee_role AS ENUM ('employee', 'manager', 'gm', 'hr', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE employee_status AS ENUM ('active', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE objective_level AS ENUM ('company', 'department', 'individual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE objective_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE progress_status AS ENUM ('draft', 'employee_submitted', 'manager_reviewed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE strategic_type AS ENUM ('company_strategy', 'company_key_work', 'department_key_work');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('draft', 'submitted', 'reviewed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE promotion_status AS ENUM ('draft', 'submitted', 'manager_approved', 'gm_approved', 'hr_approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 员工表
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  department VARCHAR(100),
  sub_department VARCHAR(100),
  position VARCHAR(100),
  role employee_role NOT NULL DEFAULT 'employee',
  level VARCHAR(50),
  manager_id VARCHAR(50),
  password VARCHAR(255),
  avatar TEXT,
  status employee_status DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 目标表（OKR/KPI）
CREATE TABLE IF NOT EXISTS objectives (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level objective_level NOT NULL,
  parent_id VARCHAR(50),
  strategic_objective_id VARCHAR(50),
  department VARCHAR(100),
  owner_id VARCHAR(50),
  year INT NOT NULL,
  quarter VARCHAR(10),
  weight DECIMAL(5,2) DEFAULT 0,
  progress DECIMAL(5,2) DEFAULT 0,
  status objective_status DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  target_value VARCHAR(255),
  target_unit VARCHAR(50),
  q1_target DECIMAL(10,2),
  q2_target DECIMAL(10,2),
  q3_target DECIMAL(10,2),
  q4_target DECIMAL(10,2),
  employee_confirmed_at TIMESTAMP NULL,
  employee_feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_objectives_owner ON objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_objectives_year ON objectives(year);
CREATE INDEX IF NOT EXISTS idx_objectives_level ON objectives(level);
CREATE INDEX IF NOT EXISTS idx_objectives_department ON objectives(department);

DROP TRIGGER IF EXISTS update_objectives_updated_at ON objectives;
CREATE TRIGGER update_objectives_updated_at
  BEFORE UPDATE ON objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 目标进度表
CREATE TABLE IF NOT EXISTS goal_progress (
  id VARCHAR(50) PRIMARY KEY,
  objective_id VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  employee_completion_rate DECIMAL(5,2) DEFAULT 0,
  employee_comment TEXT,
  employee_submitted_at TIMESTAMP NULL,
  manager_completion_rate DECIMAL(5,2),
  manager_comment TEXT,
  manager_reviewed_at TIMESTAMP NULL,
  manager_id VARCHAR(50),
  status progress_status DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (objective_id, year, month),
  FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_employee ON goal_progress(employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_goal_progress_objective ON goal_progress(objective_id);

DROP TRIGGER IF EXISTS update_goal_progress_updated_at ON goal_progress;
CREATE TRIGGER update_goal_progress_updated_at
  BEFORE UPDATE ON goal_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 战略目标表
CREATE TABLE IF NOT EXISTS strategic_objectives (
  id VARCHAR(50) PRIMARY KEY,
  year INT NOT NULL,
  type strategic_type NOT NULL,
  department VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  progress DECIMAL(5,2) DEFAULT 0,
  order_index INT DEFAULT 0,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_strategic_objectives_year_type ON strategic_objectives(year, type);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_department ON strategic_objectives(department);

DROP TRIGGER IF EXISTS update_strategic_objectives_updated_at ON strategic_objectives;
CREATE TRIGGER update_strategic_objectives_updated_at
  BEFORE UPDATE ON strategic_objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- AI使用日志表
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(100),
  feature_type VARCHAR(100) NOT NULL,
  tokens_used INT DEFAULT 0,
  cost_yuan DECIMAL(10,6) DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON ai_usage_logs(created_at);

-- 月度绩效表
CREATE TABLE IF NOT EXISTS monthly_performance (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  score DECIMAL(5,2),
  work_summary TEXT,
  next_month_plan TEXT,
  manager_comment TEXT,
  manager_id VARCHAR(50),
  keywords JSON,
  status review_status DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_performance_employee ON monthly_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_performance_year_month ON monthly_performance(year, month);

DROP TRIGGER IF EXISTS update_monthly_performance_updated_at ON monthly_performance;
CREATE TRIGGER update_monthly_performance_updated_at
  BEFORE UPDATE ON monthly_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 晋升申请表
CREATE TABLE IF NOT EXISTS promotion_requests (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  requester_id VARCHAR(50),
  requester_role VARCHAR(20),
  current_level VARCHAR(50),
  target_level VARCHAR(50) NOT NULL,
  target_position VARCHAR(100),
  raise_percentage DECIMAL(5,2),
  performance_summary TEXT,
  skill_summary TEXT,
  competency_summary TEXT,
  work_summary TEXT,
  status promotion_status DEFAULT 'draft',
  manager_comment TEXT,
  manager_approver_id VARCHAR(50),
  manager_approved_at TIMESTAMP,
  gm_comment TEXT,
  gm_approver_id VARCHAR(50),
  gm_approved_at TIMESTAMP,
  hr_comment TEXT,
  hr_approver_id VARCHAR(50),
  hr_approved_at TIMESTAMP,
  rejected_reason TEXT,
  rejected_by_role VARCHAR(20),
  rejected_by_id VARCHAR(50),
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promotion_requests_employee ON promotion_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_promotion_requests_status ON promotion_requests(status);

DROP TRIGGER IF EXISTS update_promotion_requests_updated_at ON promotion_requests;
CREATE TRIGGER update_promotion_requests_updated_at
  BEFORE UPDATE ON promotion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 晋升审批配置表
CREATE TABLE IF NOT EXISTS promotion_approval_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  chain TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认审批链配置
INSERT INTO promotion_approval_settings (id, chain, updated_at)
VALUES ('default', '["manager", "gm", "hr"]', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 季度总结表
CREATE TABLE IF NOT EXISTS quarterly_summaries (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  quarter INT NOT NULL,
  summary TEXT,
  achievements TEXT,
  challenges TEXT,
  next_quarter_plan TEXT,
  status review_status DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, year, quarter)
);

CREATE INDEX IF NOT EXISTS idx_quarterly_summaries_employee ON quarterly_summaries(employee_id);

DROP TRIGGER IF EXISTS update_quarterly_summaries_updated_at ON quarterly_summaries;
CREATE TRIGGER update_quarterly_summaries_updated_at
  BEFORE UPDATE ON quarterly_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 同事互评表
CREATE TABLE IF NOT EXISTS peer_reviews (
  id VARCHAR(50) PRIMARY KEY,
  reviewer_id VARCHAR(50) NOT NULL,
  reviewee_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  quarter INT,
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer ON peer_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewee ON peer_reviews(reviewee_id);

-- 绩效记录表（用于示例数据）
DO $$ BEGIN
  CREATE TYPE record_status AS ENUM ('draft', 'submitted', 'scored', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE group_type AS ENUM ('high', 'low');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS performance_records (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  assessor_id VARCHAR(50) NOT NULL,
  month VARCHAR(7) NOT NULL,
  self_summary TEXT,
  next_month_plan TEXT,
  task_completion DECIMAL(3,2) DEFAULT 1.00,
  initiative DECIMAL(3,2) DEFAULT 1.00,
  project_feedback DECIMAL(3,2) DEFAULT 1.00,
  quality_improvement DECIMAL(3,2) DEFAULT 1.00,
  total_score DECIMAL(3,2) DEFAULT 0.00,
  level VARCHAR(2) DEFAULT 'L3',
  normalized_score DECIMAL(3,2),
  manager_comment TEXT,
  next_month_work_arrangement TEXT,
  group_type group_type NOT NULL,
  group_rank INT DEFAULT 0,
  cross_dept_rank INT DEFAULT 0,
  department_rank INT DEFAULT 0,
  company_rank INT DEFAULT 0,
  status record_status DEFAULT 'draft',
  frozen BOOLEAN DEFAULT false,
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, month)
);

CREATE INDEX IF NOT EXISTS idx_performance_records_assessor ON performance_records(assessor_id);
CREATE INDEX IF NOT EXISTS idx_performance_records_month ON performance_records(month);
CREATE INDEX IF NOT EXISTS idx_performance_records_status ON performance_records(status);
CREATE INDEX IF NOT EXISTS idx_performance_records_group_type ON performance_records(group_type);

DROP TRIGGER IF EXISTS update_performance_records_updated_at ON performance_records;
CREATE TRIGGER update_performance_records_updated_at
  BEFORE UPDATE ON performance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 月度考核结果发布表
CREATE TABLE IF NOT EXISTS monthly_assessment_publications (
  id VARCHAR(50) PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE,
  published_by VARCHAR(50) REFERENCES employees(id),
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monthly_publications_month ON monthly_assessment_publications(month);

-- 绩效申诉表
DO $$ BEGIN
  CREATE TYPE appeal_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS appeals (
  id VARCHAR(50) PRIMARY KEY,
  performance_record_id VARCHAR(50) REFERENCES performance_records(id),
  employee_id VARCHAR(50) REFERENCES employees(id),
  reason TEXT NOT NULL,
  status appeal_status DEFAULT 'pending',
  hr_comment TEXT,
  hr_id VARCHAR(50) REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appeals_employee ON appeals(employee_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
CREATE INDEX IF NOT EXISTS idx_appeals_performance_record ON appeals(performance_record_id);

DROP TRIGGER IF EXISTS update_appeals_updated_at ON appeals;
CREATE TRIGGER update_appeals_updated_at
  BEFORE UPDATE ON appeals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 站内消息通知表
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('reminder', 'approval', 'system', 'freeze');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES employees(id),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  link VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 审计日志表
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_result AS ENUM ('SUCCESS', 'FAILED', 'UNAUTHORIZED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  
  -- 操作人信息
  user_id VARCHAR(50),
  user_name VARCHAR(100),
  user_role VARCHAR(20),
  
  -- 操作信息
  action audit_action NOT NULL,
  module VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(100),
  
  -- 详细信息
  description TEXT,
  changes JSONB,
  
  -- 请求信息
  ip_address VARCHAR(50),
  user_agent TEXT,
  request_method VARCHAR(10),
  request_url TEXT,
  
  -- 结果
  result audit_result DEFAULT 'SUCCESS',
  error_message TEXT,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_type, target_id);

-- 初始化说明
COMMENT ON DATABASE performance_db IS 'ATE绩效管理系统数据库';
COMMENT ON TABLE employees IS '员工表';
COMMENT ON TABLE objectives IS '目标表（OKR/KPI）';
COMMENT ON TABLE goal_progress IS '目标进度跟踪表';
COMMENT ON TABLE strategic_objectives IS '战略目标表';
COMMENT ON TABLE ai_usage_logs IS 'AI功能使用统计表';
COMMENT ON TABLE monthly_performance IS '月度绩效表';
COMMENT ON TABLE promotion_requests IS '晋升申请表';
COMMENT ON TABLE quarterly_summaries IS '季度总结表';
COMMENT ON TABLE peer_reviews IS '同事互评表';
COMMENT ON TABLE performance_records IS '绩效记录表（示例数据）';
COMMENT ON TABLE monthly_assessment_publications IS '月度考核结果发布记录表';
COMMENT ON TABLE notifications IS '站内消息通知表';
COMMENT ON TABLE audit_logs IS '审计日志表';
