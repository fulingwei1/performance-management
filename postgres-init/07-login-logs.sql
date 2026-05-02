-- 登录日志表

-- 创建登录方式类型
DO $$ BEGIN
  CREATE TYPE login_method AS ENUM ('idCard', 'password');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS login_logs (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  department VARCHAR(100),
  sub_department VARCHAR(100),
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  login_method login_method NOT NULL,
  login_ip VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_login_logs_employee_id ON login_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON login_logs(login_time);
CREATE INDEX IF NOT EXISTS idx_login_logs_success ON login_logs(success);
