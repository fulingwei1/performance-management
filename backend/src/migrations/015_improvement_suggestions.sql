ALTER TABLE performance_records
  ADD COLUMN IF NOT EXISTS improvement_suggestion TEXT,
  ADD COLUMN IF NOT EXISTS suggestion_anonymous BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS template_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metric_scores JSONB;

CREATE INDEX IF NOT EXISTS idx_performance_records_template ON performance_records(template_id);
