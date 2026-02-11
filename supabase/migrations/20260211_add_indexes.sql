-- Add missing indexes for performance optimization

-- performance_records indexes
CREATE INDEX IF NOT EXISTS idx_performance_records_employee_id ON performance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_records_month ON performance_records(month);
CREATE INDEX IF NOT EXISTS idx_performance_records_assessor_id ON performance_records(assessor_id);
CREATE INDEX IF NOT EXISTS idx_performance_records_status ON performance_records(status);
CREATE INDEX IF NOT EXISTS idx_performance_records_employee_month ON performance_records(employee_id, month);

-- Unique constraint: one record per employee per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_records_employee_month_unique 
  ON performance_records(employee_id, month);

-- employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_level ON employees(level);

-- peer_reviews indexes
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer_id ON peer_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewee_id ON peer_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_month ON peer_reviews(month);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_record_id ON peer_reviews(record_id);
