-- 目标审批功能扩展
-- 为 objectives 表添加审批相关字段

-- 修改 status 枚举，添加审批状态
ALTER TABLE objectives 
  DROP CONSTRAINT IF EXISTS objectives_status_check;

ALTER TABLE objectives 
  ADD CONSTRAINT objectives_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'active', 'completed', 'cancelled'));

-- 添加审批相关字段
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,           -- 提交审批时间
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,            -- 审批时间
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER,              -- 审批人ID
  ADD COLUMN IF NOT EXISTS review_comment TEXT,              -- 审批意见
  ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;           -- 调整原因（用于目标调整）

-- 添加外键约束
ALTER TABLE objectives
  ADD CONSTRAINT fk_objectives_reviewed_by 
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_owner_status ON objectives(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_objectives_reviewed_by ON objectives(reviewed_by);

-- 创建目标调整历史表
CREATE TABLE IF NOT EXISTS objective_adjustments (
  id SERIAL PRIMARY KEY,
  objective_id INTEGER NOT NULL,
  adjusted_by INTEGER NOT NULL,          -- 调整人（通常是经理）
  adjustment_type VARCHAR(50) NOT NULL,  -- 调整类型: 'target_value', 'quarterly_targets', 'monthly_targets', 'weight', 'description'
  old_value TEXT,                        -- 旧值（JSON格式）
  new_value TEXT,                        -- 新值（JSON格式）
  reason TEXT,                           -- 调整原因
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE,
  FOREIGN KEY (adjusted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 添加索引
CREATE INDEX idx_adjustments_objective ON objective_adjustments(objective_id);
CREATE INDEX idx_adjustments_created ON objective_adjustments(created_at DESC);

COMMENT ON TABLE objective_adjustments IS '目标调整历史记录';
COMMENT ON COLUMN objective_adjustments.adjustment_type IS '调整类型: target_value(目标值), quarterly_targets(季度目标), monthly_targets(月度目标), weight(权重), description(描述)';
