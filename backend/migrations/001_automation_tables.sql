-- 月度绩效考核自动化闭环表
-- 执行方式: psql -U performance_user -d performance_db -f 001_automation_tables.sql
-- 幂等: 使用 IF NOT EXISTS

-- 1. 月度统计报告表
CREATE TABLE IF NOT EXISTS monthly_reports (
  id VARCHAR(36) PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE,
  total_employees INT DEFAULT 0,
  participated_count INT DEFAULT 0,
  draft_count INT DEFAULT 0,
  submitted_count INT DEFAULT 0,
  scored_count INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  participation_rate DECIMAL(5,2) DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  max_score DECIMAL(5,2) DEFAULT 0,
  min_score DECIMAL(5,2) DEFAULT 0,
  l5_count INT DEFAULT 0,
  l4_count INT DEFAULT 0,
  l3_count INT DEFAULT 0,
  l2_count INT DEFAULT 0,
  l1_count INT DEFAULT 0,
  department_stats JSONB,
  anomaly_report JSONB,
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 绩效归档表
CREATE TABLE IF NOT EXISTS performance_archives (
  id VARCHAR(36) PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE,
  archive_data JSONB NOT NULL,
  snapshot_summary JSONB,
  archived_at TIMESTAMP DEFAULT NOW(),
  archived_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 自动化任务日志表
CREATE TABLE IF NOT EXISTS automation_logs (
  id VARCHAR(36) PRIMARY KEY,
  task_type VARCHAR(50) NOT NULL,
  task_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'running',
  input_params JSONB,
  result_summary JSONB,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_monthly_reports_month ON monthly_reports(month);
CREATE INDEX IF NOT EXISTS idx_performance_archives_month ON performance_archives(month);
CREATE INDEX IF NOT EXISTS idx_automation_logs_task_type ON automation_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);
