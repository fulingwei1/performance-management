ALTER TABLE objectives ADD COLUMN start_date DATE;
ALTER TABLE objectives ADD COLUMN end_date DATE;
ALTER TABLE objectives ADD COLUMN feedback_cycle VARCHAR(20) DEFAULT 'monthly';

CREATE TABLE IF NOT EXISTS okr_assignments (
  id VARCHAR(36) PRIMARY KEY,
  objective_id VARCHAR(36) NOT NULL REFERENCES objectives(id),
  assignee_id VARCHAR(36) NOT NULL,
  assigned_by VARCHAR(36) NOT NULL,
  deadline DATE,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
