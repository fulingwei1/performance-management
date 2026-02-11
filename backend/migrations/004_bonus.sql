CREATE TABLE IF NOT EXISTS bonus_config (
  id VARCHAR(36) PRIMARY KEY,
  rules JSONB,
  updated_by VARCHAR(36),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bonus_results (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36),
  employee_name VARCHAR(100),
  department VARCHAR(100),
  year INTEGER,
  quarter INTEGER,
  score DECIMAL(5,2),
  grade VARCHAR(10),
  coefficient DECIMAL(3,1),
  base_salary DECIMAL(12,2),
  bonus DECIMAL(12,2),
  adjusted BOOLEAN DEFAULT FALSE,
  adjusted_by VARCHAR(36),
  adjusted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
