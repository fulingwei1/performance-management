-- ATE绩效管理系统 - MySQL初始化脚本

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS performance_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE performance_db;

-- ============================================================
-- 1. 员工表
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  department VARCHAR(100),
  sub_department VARCHAR(100),
  position VARCHAR(100),
  role ENUM('employee', 'manager', 'gm', 'hr', 'admin') NOT NULL DEFAULT 'employee',
  level VARCHAR(50),
  manager_id VARCHAR(50),
  password VARCHAR(255),
  avatar TEXT,
  status ENUM('active', 'disabled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_department (department),
  INDEX idx_manager_id (manager_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. 目标表（OKR/KPI）
-- ============================================================
CREATE TABLE IF NOT EXISTS objectives (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level ENUM('company', 'department', 'individual') NOT NULL,
  parent_id VARCHAR(50),
  strategic_objective_id VARCHAR(50),
  department VARCHAR(100),
  owner_id VARCHAR(50),
  year INT NOT NULL,
  quarter VARCHAR(10),
  weight DECIMAL(5,2) DEFAULT 0,
  progress DECIMAL(5,2) DEFAULT 0,
  status ENUM('draft', 'pending_approval', 'approved', 'rejected', 'active', 'completed', 'cancelled') DEFAULT 'draft',
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
  approver_id VARCHAR(50) NULL,
  approved_by VARCHAR(50) NULL,
  approved_at TIMESTAMP NULL,
  submitted_at TIMESTAMP NULL,
  approval_comment TEXT NULL,
  rejection_reason TEXT NULL,
  adjustment_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_owner (owner_id),
  INDEX idx_year (year),
  INDEX idx_level (level),
  INDEX idx_department (department),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. 目标进度表
-- ============================================================
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
  status ENUM('draft', 'employee_submitted', 'manager_reviewed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_progress (objective_id, year, month),
  INDEX idx_employee (employee_id, year, month),
  INDEX idx_objective (objective_id),
  FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. 战略目标表
-- ============================================================
CREATE TABLE IF NOT EXISTS strategic_objectives (
  id VARCHAR(50) PRIMARY KEY,
  year INT NOT NULL,
  type ENUM('company_strategy', 'company_key_work', 'department_key_work') NOT NULL,
  department VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  progress DECIMAL(5,2) DEFAULT 0,
  order_index INT DEFAULT 0,
  created_by VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  approver_id TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT,
  adjustment_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_year_type (year, type),
  INDEX idx_department (department),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. AI使用日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(100),
  feature_type VARCHAR(100) NOT NULL,
  tokens_used INT DEFAULT 0,
  cost_yuan DECIMAL(10,6) DEFAULT 0,
  success TINYINT(1) DEFAULT 1,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_feature (feature_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. 月度绩效表
-- ============================================================
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
  status ENUM('draft', 'submitted', 'reviewed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_performance (employee_id, year, month),
  INDEX idx_employee (employee_id),
  INDEX idx_year_month (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. 晋升申请表
-- ============================================================
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
  status ENUM('draft', 'submitted', 'manager_approved', 'gm_approved', 'hr_approved', 'rejected') DEFAULT 'draft',
  manager_comment TEXT,
  manager_approver_id VARCHAR(50),
  manager_approved_at TIMESTAMP NULL,
  gm_comment TEXT,
  gm_approver_id VARCHAR(50),
  gm_approved_at TIMESTAMP NULL,
  hr_comment TEXT,
  hr_approver_id VARCHAR(50),
  hr_approved_at TIMESTAMP NULL,
  rejected_reason TEXT,
  rejected_by_role VARCHAR(20),
  rejected_by_id VARCHAR(50),
  rejected_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee (employee_id),
  INDEX idx_status (status),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. 晋升审批配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS promotion_approval_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  chain TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO promotion_approval_settings (id, chain, updated_at)
VALUES ('default', '["manager", "gm", "hr"]', CURRENT_TIMESTAMP);

-- ============================================================
-- 9. 季度总结表
-- ============================================================
CREATE TABLE IF NOT EXISTS quarterly_summaries (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  quarter INT NOT NULL,
  summary TEXT,
  achievements TEXT,
  challenges TEXT,
  next_quarter_plan TEXT,
  status ENUM('draft', 'submitted', 'reviewed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_quarterly (employee_id, year, quarter),
  INDEX idx_employee (employee_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. 同事互评表
-- ============================================================
CREATE TABLE IF NOT EXISTS peer_reviews (
  id VARCHAR(50) PRIMARY KEY,
  reviewer_id VARCHAR(50) NOT NULL,
  reviewee_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  quarter INT,
  comment TEXT,
  is_anonymous TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reviewer (reviewer_id),
  INDEX idx_reviewee (reviewee_id),
  FOREIGN KEY (reviewer_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. 绩效记录表
-- ============================================================
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
  group_type ENUM('high', 'low') NOT NULL,
  group_rank INT DEFAULT 0,
  cross_dept_rank INT DEFAULT 0,
  department_rank INT DEFAULT 0,
  company_rank INT DEFAULT 0,
  status ENUM('draft', 'submitted', 'scored', 'completed') DEFAULT 'draft',
  frozen TINYINT(1) DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_employee_month (employee_id, month),
  INDEX idx_assessor (assessor_id),
  INDEX idx_month (month),
  INDEX idx_status (status),
  INDEX idx_group_type (group_type),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (assessor_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. 月度考核结果发布表
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_assessment_publications (
  id VARCHAR(50) PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE,
  published_by VARCHAR(50),
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_month (month),
  FOREIGN KEY (published_by) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. 绩效申诉表
-- ============================================================
CREATE TABLE IF NOT EXISTS appeals (
  id VARCHAR(50) PRIMARY KEY,
  performance_record_id VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  hr_comment TEXT,
  hr_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee (employee_id),
  INDEX idx_status (status),
  INDEX idx_performance_record (performance_record_id),
  INDEX idx_hr_id (hr_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (performance_record_id) REFERENCES performance_records(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (hr_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. 站内消息通知表
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  type ENUM('reminder', 'approval', 'system', 'freeze') NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  `read` TINYINT(1) DEFAULT 0,
  link VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_read (`read`),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. 审计日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50),
  user_name VARCHAR(100),
  user_role VARCHAR(20),
  action ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT') NOT NULL,
  module VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(100),
  description TEXT,
  changes JSON,
  ip_address VARCHAR(50),
  user_agent TEXT,
  request_method VARCHAR(10),
  request_url TEXT,
  result ENUM('SUCCESS', 'FAILED', 'UNAUTHORIZED') DEFAULT 'SUCCESS',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_module (module),
  INDEX idx_time (created_at),
  INDEX idx_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. 目标调整历史表
-- ============================================================
CREATE TABLE IF NOT EXISTS objective_adjustments (
  id VARCHAR(50) PRIMARY KEY,
  objective_id VARCHAR(50) NOT NULL,
  adjusted_by VARCHAR(50) NOT NULL,
  adjustment_type VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_objective (objective_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (objective_id) REFERENCES strategic_objectives(id) ON DELETE CASCADE,
  FOREIGN KEY (adjusted_by) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 额外外键约束
-- ============================================================

ALTER TABLE employees
  ADD CONSTRAINT fk_employees_manager
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE objectives
  ADD CONSTRAINT fk_objectives_owner
  FOREIGN KEY (owner_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE objectives
  ADD CONSTRAINT fk_objectives_strategic
  FOREIGN KEY (strategic_objective_id) REFERENCES strategic_objectives(id) ON DELETE SET NULL;

ALTER TABLE goal_progress
  ADD CONSTRAINT fk_goal_progress_employee
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE goal_progress
  ADD CONSTRAINT fk_goal_progress_manager
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE monthly_performance
  ADD CONSTRAINT fk_monthly_performance_employee
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE monthly_performance
  ADD CONSTRAINT fk_monthly_performance_manager
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE strategic_objectives
  ADD CONSTRAINT fk_strategic_objectives_created_by
  FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE ai_usage_logs
  ADD CONSTRAINT fk_ai_usage_logs_user
  FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE;

-- 待办事项表
CREATE TABLE IF NOT EXISTS todos (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  link VARCHAR(200),
  related_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_todos_employee ON todos(employee_id);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_due_date ON todos(due_date);
