-- 周期中途考核范围调整：保留绩效记录，但可标记为本期取消/豁免，排除统计、排名和催办

ALTER TYPE record_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE record_status ADD VALUE IF NOT EXISTS 'exempted';

ALTER TABLE performance_records
  ADD COLUMN IF NOT EXISTS is_excluded_from_stats BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exclude_reason TEXT,
  ADD COLUMN IF NOT EXISTS excluded_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS excluded_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS scope_change_batch_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_performance_records_scope_excluded
  ON performance_records(month, is_excluded_from_stats, status);

CREATE TABLE IF NOT EXISTS performance_scope_adjustments (
  id VARCHAR(100) PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  previous_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  action VARCHAR(30) NOT NULL,
  reason TEXT,
  operated_by VARCHAR(50),
  operated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_performance_scope_adjustments_month
  ON performance_scope_adjustments(month);

CREATE INDEX IF NOT EXISTS idx_performance_scope_adjustments_employee_month
  ON performance_scope_adjustments(employee_id, month);
