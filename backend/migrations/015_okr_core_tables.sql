-- Migration: 015_okr_core_tables
-- Description: Create missing OKR/todo/notification core tables for PostgreSQL
-- Created: 2026-03-02

CREATE TABLE IF NOT EXISTS strategic_objectives (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  year INTEGER NOT NULL,
  type VARCHAR(50),
  department VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  created_by VARCHAR(20) REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_strategic_objectives_year ON strategic_objectives(year);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_status ON strategic_objectives(status);

CREATE TABLE IF NOT EXISTS objectives (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level VARCHAR(30) NOT NULL,
  parent_id VARCHAR(50) REFERENCES objectives(id) ON DELETE SET NULL,
  strategic_objective_id VARCHAR(50) REFERENCES strategic_objectives(id) ON DELETE SET NULL,
  department VARCHAR(100),
  owner_id VARCHAR(20) NOT NULL REFERENCES employees(id),
  year INTEGER NOT NULL,
  quarter INTEGER,
  weight DECIMAL(5,2) NOT NULL DEFAULT 100,
  progress DECIMAL(5,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  feedback_cycle VARCHAR(20) DEFAULT 'monthly',
  target_value TEXT,
  quarterly_targets JSONB,
  monthly_targets JSONB,
  employee_confirmed_at TIMESTAMP,
  employee_feedback TEXT,
  approver_id VARCHAR(20) REFERENCES employees(id),
  approved_by VARCHAR(20) REFERENCES employees(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  adjustment_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_objectives_year ON objectives(year);
CREATE INDEX IF NOT EXISTS idx_objectives_owner ON objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_objectives_parent ON objectives(parent_id);
CREATE INDEX IF NOT EXISTS idx_objectives_strategic ON objectives(strategic_objective_id);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_approver ON objectives(approver_id);
CREATE INDEX IF NOT EXISTS idx_objectives_status_approver ON objectives(status, approver_id);

CREATE TABLE IF NOT EXISTS key_results (
  id VARCHAR(50) PRIMARY KEY,
  objective_id VARCHAR(50) NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  metric_type VARCHAR(30) DEFAULT 'number',
  target_value DECIMAL(12,2),
  current_value DECIMAL(12,2) DEFAULT 0,
  unit VARCHAR(30),
  weight DECIMAL(5,2) DEFAULT 0,
  progress DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'not_started',
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id);

CREATE TABLE IF NOT EXISTS objective_adjustments (
  id SERIAL PRIMARY KEY,
  objective_id VARCHAR(50) NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  adjusted_by VARCHAR(20) NOT NULL REFERENCES employees(id),
  adjustment_type VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_adjustments_objective ON objective_adjustments(objective_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_adjuster ON objective_adjustments(adjusted_by);

CREATE TABLE IF NOT EXISTS okr_assignments (
  id VARCHAR(36) PRIMARY KEY,
  objective_id VARCHAR(50) NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  assignee_id VARCHAR(20) NOT NULL REFERENCES employees(id),
  assigned_by VARCHAR(20) NOT NULL REFERENCES employees(id),
  deadline DATE,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_okr_assignments_objective ON okr_assignments(objective_id);
CREATE INDEX IF NOT EXISTS idx_okr_assignments_assignee ON okr_assignments(assignee_id);

CREATE TABLE IF NOT EXISTS performance_contracts (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES employees(id),
  manager_id VARCHAR(20) NOT NULL REFERENCES employees(id),
  year INTEGER NOT NULL,
  objectives_snapshot JSONB,
  kpi_snapshot JSONB,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  employee_signed_at TIMESTAMP,
  manager_signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_performance_contracts_employee_year ON performance_contracts(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_performance_contracts_manager ON performance_contracts(manager_id);
CREATE INDEX IF NOT EXISTS idx_performance_contracts_status ON performance_contracts(status);

CREATE TABLE IF NOT EXISTS todos (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES employees(id),
  type VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  link VARCHAR(255),
  related_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_todos_employee ON todos(employee_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL REFERENCES employees(id),
  type VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Keep updated_at in sync where present
CREATE OR REPLACE FUNCTION update_updated_at_column_015()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_strategic_objectives_updated_at ON strategic_objectives;
CREATE TRIGGER trg_strategic_objectives_updated_at
BEFORE UPDATE ON strategic_objectives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_015();

DROP TRIGGER IF EXISTS trg_objectives_updated_at ON objectives;
CREATE TRIGGER trg_objectives_updated_at
BEFORE UPDATE ON objectives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_015();

DROP TRIGGER IF EXISTS trg_key_results_updated_at ON key_results;
CREATE TRIGGER trg_key_results_updated_at
BEFORE UPDATE ON key_results
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_015();

DROP TRIGGER IF EXISTS trg_performance_contracts_updated_at ON performance_contracts;
CREATE TRIGGER trg_performance_contracts_updated_at
BEFORE UPDATE ON performance_contracts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_015();
