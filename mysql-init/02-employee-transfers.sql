-- 人员调动历史表
CREATE TABLE IF NOT EXISTS employee_transfers (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  from_department VARCHAR(100),
  to_department VARCHAR(100),
  from_position VARCHAR(100),
  to_position VARCHAR(100),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES employees(id)
);

CREATE INDEX idx_employee_transfers_employee ON employee_transfers(employee_id);
CREATE INDEX idx_employee_transfers_date ON employee_transfers(transfer_date);

