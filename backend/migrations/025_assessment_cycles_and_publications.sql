-- 考核周期、节假日和月度发布表兜底迁移。
-- 线上旧库可能只跑过部分初始化 SQL，导致 /api/cycles 或发布接口查表失败。

CREATE TABLE IF NOT EXISTS assessment_cycles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  self_assessment_deadline DATE,
  manager_review_deadline DATE,
  hr_review_deadline DATE,
  appeal_deadline DATE,
  status VARCHAR(20) DEFAULT 'draft',
  reminder_days INTEGER DEFAULT 3,
  auto_submit BOOLEAN DEFAULT false,
  exclude_holidays BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_cycles_year ON assessment_cycles(year);
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_status ON assessment_cycles(status);
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_period ON assessment_cycles(start_date, end_date);

CREATE TABLE IF NOT EXISTS holidays (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'company',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date_name ON holidays(date, name);

CREATE TABLE IF NOT EXISTS monthly_assessment_publications (
  id VARCHAR(50) PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE,
  published_by VARCHAR(50) REFERENCES employees(id),
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monthly_publications_month ON monthly_assessment_publications(month);
