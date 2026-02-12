-- ATE绩效管理系统 - MySQL初始化脚本

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS performance_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE performance_db;

-- 员工表
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

-- 目标表（OKR/KPI）
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_owner (owner_id),
  INDEX idx_year (year),
  INDEX idx_level (level),
  INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  status ENUM('draft', 'employee_submitted', 'manager_reviewed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_progress (objective_id, year, month),
  INDEX idx_employee (employee_id, year, month),
  INDEX idx_objective (objective_id),
  FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 战略目标表
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_year_type (year, type),
  INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_feature (feature_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  status ENUM('draft', 'submitted', 'reviewed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_performance (employee_id, year, month),
  INDEX idx_employee (employee_id),
  INDEX idx_year_month (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 晋升申请表
CREATE TABLE IF NOT EXISTS promotion_requests (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  current_level VARCHAR(50),
  target_level VARCHAR(50) NOT NULL,
  performance_summary TEXT,
  skill_summary TEXT,
  competency_summary TEXT,
  work_summary TEXT,
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft',
  manager_review TEXT,
  hr_review TEXT,
  gm_review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee (employee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  status ENUM('draft', 'submitted', 'reviewed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_quarterly (employee_id, year, quarter),
  INDEX idx_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 同事互评表
CREATE TABLE IF NOT EXISTS peer_reviews (
  id VARCHAR(50) PRIMARY KEY,
  reviewer_id VARCHAR(50) NOT NULL,
  reviewee_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  quarter INT,
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reviewer (reviewer_id),
  INDEX idx_reviewee (reviewee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化说明
-- 本脚本会在MySQL容器首次启动时自动执行
-- 后续数据导入和表结构更新请通过migration脚本完成
