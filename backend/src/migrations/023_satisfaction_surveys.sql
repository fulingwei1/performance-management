-- 半年度员工满意度调查
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id VARCHAR(80) PRIMARY KEY,
  year INTEGER NOT NULL,
  half SMALLINT NOT NULL CHECK (half IN (1, 2)),
  period VARCHAR(7) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (year, half),
  UNIQUE (period)
);

CREATE TABLE IF NOT EXISTS satisfaction_survey_responses (
  id VARCHAR(120) PRIMARY KEY,
  survey_id VARCHAR(80) NOT NULL REFERENCES satisfaction_surveys(id) ON DELETE CASCADE,
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  sub_department VARCHAR(100),
  anonymous BOOLEAN NOT NULL DEFAULT TRUE,
  scores JSONB NOT NULL,
  comment TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (survey_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_period ON satisfaction_surveys(period);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_status ON satisfaction_surveys(status);
CREATE INDEX IF NOT EXISTS idx_satisfaction_responses_survey ON satisfaction_survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_responses_employee ON satisfaction_survey_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_responses_department ON satisfaction_survey_responses(department);

COMMENT ON TABLE satisfaction_surveys IS '半年度员工满意度调查主表';
COMMENT ON TABLE satisfaction_survey_responses IS '半年度员工满意度调查答卷表';
