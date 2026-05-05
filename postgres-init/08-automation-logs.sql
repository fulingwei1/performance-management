-- 自动化任务执行日志表
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY,

  -- 兼容不同历史实现的任务字段
  job_type VARCHAR(50),
  task_type VARCHAR(50),
  task_name VARCHAR(100),

  month VARCHAR(7),
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'skipped', 'running')),

  details JSONB,
  input_params JSONB,
  result_summary JSONB,
  error_message TEXT,

  duration_ms INTEGER,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE automation_logs
  ADD COLUMN IF NOT EXISTS job_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS task_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS task_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS month VARCHAR(7),
  ADD COLUMN IF NOT EXISTS details JSONB,
  ADD COLUMN IF NOT EXISTS input_params JSONB,
  ADD COLUMN IF NOT EXISTS result_summary JSONB,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_automation_logs_job_type ON automation_logs(job_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_task_type ON automation_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_month ON automation_logs(month);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed_at ON automation_logs(executed_at DESC);

COMMENT ON TABLE automation_logs IS '自动化任务执行日志表';
