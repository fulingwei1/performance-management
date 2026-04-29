-- 员工季度绩效汇总表
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
