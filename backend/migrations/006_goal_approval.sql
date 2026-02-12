-- 添加目标审批相关字段
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS approver_id VARCHAR(50) REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50) REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_objectives_approver ON objectives(approver_id);
CREATE INDEX IF NOT EXISTS idx_objectives_status_approver ON objectives(status, approver_id);

-- 创建目标调整历史表
CREATE TABLE IF NOT EXISTS objective_adjustments (
  id SERIAL PRIMARY KEY,
  objective_id VARCHAR(50) NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  adjusted_by VARCHAR(50) NOT NULL REFERENCES employees(id),
  adjustment_type VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_adjustments_objective ON objective_adjustments(objective_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_adjuster ON objective_adjustments(adjusted_by);

COMMENT ON COLUMN objectives.approver_id IS '审批人ID（通常是员工的直属经理）';
COMMENT ON COLUMN objectives.approved_by IS '实际批准人ID';
COMMENT ON COLUMN objectives.approved_at IS '批准时间';
COMMENT ON COLUMN objectives.rejection_reason IS '拒绝原因';
COMMENT ON COLUMN objectives.adjustment_reason IS '调整原因';
COMMENT ON TABLE objective_adjustments IS '目标调整历史记录表';
