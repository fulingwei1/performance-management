-- 员工临时密码首次修改标记
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_employees_must_change_password
  ON employees(must_change_password);
