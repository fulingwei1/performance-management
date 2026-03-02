-- Migration: 016_appeals_table
-- Description: Create appeals table for PostgreSQL
-- Created: 2026-03-02

CREATE TABLE IF NOT EXISTS appeals (
  id VARCHAR(100) PRIMARY KEY,
  performance_record_id VARCHAR(100) NOT NULL,
  employee_id VARCHAR(20) NOT NULL REFERENCES employees(id),
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  hr_id VARCHAR(20) REFERENCES employees(id),
  hr_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appeals_employee ON appeals(employee_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
CREATE INDEX IF NOT EXISTS idx_appeals_performance_record ON appeals(performance_record_id);
CREATE INDEX IF NOT EXISTS idx_appeals_hr ON appeals(hr_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_appeals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appeals_updated_at ON appeals;
CREATE TRIGGER trg_appeals_updated_at
BEFORE UPDATE ON appeals
FOR EACH ROW EXECUTE FUNCTION update_appeals_updated_at();
