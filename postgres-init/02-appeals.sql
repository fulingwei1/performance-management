-- 绩效申诉表迁移脚本

-- 创建申诉状态枚举类型
DO $$ BEGIN
  CREATE TYPE appeal_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 创建申诉表
CREATE TABLE IF NOT EXISTS appeals (
  id VARCHAR(50) PRIMARY KEY,
  performance_record_id VARCHAR(50) NOT NULL REFERENCES performance_records(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status appeal_status NOT NULL DEFAULT 'pending',
  hr_comment TEXT,
  hr_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_appeals_performance_record_id ON appeals(performance_record_id);
CREATE INDEX IF NOT EXISTS idx_appeals_employee_id ON appeals(employee_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
CREATE INDEX IF NOT EXISTS idx_appeals_hr_id ON appeals(hr_id);
CREATE INDEX IF NOT EXISTS idx_appeals_created_at ON appeals(created_at DESC);

-- 添加更新时间戳触发器
DROP TRIGGER IF EXISTS update_appeals_updated_at ON appeals;
CREATE TRIGGER update_appeals_updated_at
  BEFORE UPDATE ON appeals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE appeals IS '绩效申诉记录表';
COMMENT ON COLUMN appeals.id IS '申诉ID';
COMMENT ON COLUMN appeals.performance_record_id IS '绩效记录ID';
COMMENT ON COLUMN appeals.employee_id IS '申诉员工ID';
COMMENT ON COLUMN appeals.reason IS '申诉原因';
COMMENT ON COLUMN appeals.status IS '申诉状态: pending-待处理, approved-已批准, rejected-已拒绝';
COMMENT ON COLUMN appeals.hr_comment IS 'HR处理意见';
COMMENT ON COLUMN appeals.hr_id IS '处理HR的ID';
COMMENT ON COLUMN appeals.created_at IS '创建时间';
COMMENT ON COLUMN appeals.updated_at IS '更新时间';
