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
  wecom_user_id VARCHAR(128),
  department VARCHAR(100),
  sub_department VARCHAR(100),
  position VARCHAR(100),
  role employee_role NOT NULL DEFAULT 'employee',
  level VARCHAR(50),
  manager_id VARCHAR(50),
  password VARCHAR(255),
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
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
  employee_issue_tags JSONB DEFAULT '[]'::jsonb,
  resource_need_tags JSONB DEFAULT '[]'::jsonb,
  improvement_suggestion TEXT,
  suggestion_anonymous BOOLEAN DEFAULT false,
  task_completion DECIMAL(3,2) DEFAULT 1.00,
  initiative DECIMAL(3,2) DEFAULT 1.00,
  project_feedback DECIMAL(3,2) DEFAULT 1.00,
  quality_improvement DECIMAL(3,2) DEFAULT 1.00,
  total_score DECIMAL(3,2) DEFAULT 0.00,
  level VARCHAR(2) DEFAULT 'L3',
  normalized_score DECIMAL(3,2),
  manager_comment TEXT,
  next_month_work_arrangement TEXT,
  evaluation_keywords JSONB DEFAULT '[]'::jsonb,
  issue_type_tags JSONB DEFAULT '[]'::jsonb,
  highlight_tags JSONB DEFAULT '[]'::jsonb,
  work_type_tags JSONB DEFAULT '[]'::jsonb,
  improvement_action_tags JSONB DEFAULT '[]'::jsonb,
  issue_attribution_tags JSONB DEFAULT '[]'::jsonb,
  workload_tags JSONB DEFAULT '[]'::jsonb,
  manager_suggestion_tags JSONB DEFAULT '[]'::jsonb,
  score_evidence TEXT,
  monthly_star_recommended BOOLEAN DEFAULT false,
  monthly_star_category VARCHAR(50),
  monthly_star_reason TEXT,
  monthly_star_public BOOLEAN DEFAULT true,
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
  force_distribution BOOLEAN DEFAULT FALSE,
  force_reason TEXT DEFAULT '',
  readiness_snapshot JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monthly_publications_month ON monthly_assessment_publications(month);

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
COMMENT ON TABLE performance_records IS '绩效记录表（示例数据）';
COMMENT ON TABLE monthly_assessment_publications IS '月度考核结果发布记录表';
COMMENT ON TABLE notifications IS '站内消息通知表';
COMMENT ON TABLE audit_logs IS '审计日志表';
