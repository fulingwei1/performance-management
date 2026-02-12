-- P1-3 目标审批功能数据库迁移
-- 为 strategic_objectives 表添加审批相关字段

-- 添加审批相关字段
ALTER TABLE strategic_objectives
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approver_id TEXT,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- 添加状态检查约束
ALTER TABLE strategic_objectives
  DROP CONSTRAINT IF EXISTS strategic_objectives_status_check;

ALTER TABLE strategic_objectives
  ADD CONSTRAINT strategic_objectives_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'active', 'completed', 'cancelled'));

-- 添加外键约束
ALTER TABLE strategic_objectives
  DROP CONSTRAINT IF EXISTS fk_strategic_objectives_approver;

ALTER TABLE strategic_objectives
  ADD CONSTRAINT fk_strategic_objectives_approver 
  FOREIGN KEY (approver_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE strategic_objectives
  DROP CONSTRAINT IF EXISTS fk_strategic_objectives_approved_by;

ALTER TABLE strategic_objectives
  ADD CONSTRAINT fk_strategic_objectives_approved_by 
  FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_status ON strategic_objectives(status);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_approver ON strategic_objectives(approver_id);

-- 创建目标调整历史表（如果不存在）
CREATE TABLE IF NOT EXISTS objective_adjustments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  objective_id TEXT NOT NULL,
  adjusted_by TEXT NOT NULL,
  adjustment_type VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (objective_id) REFERENCES strategic_objectives(id) ON DELETE CASCADE,
  FOREIGN KEY (adjusted_by) REFERENCES employees(id) ON DELETE CASCADE
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_adjustments_objective ON objective_adjustments(objective_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_created ON objective_adjustments(created_at DESC);

COMMENT ON TABLE objective_adjustments IS '目标调整历史记录';
COMMENT ON COLUMN objective_adjustments.adjustment_type IS '调整类型: target_value, quarterly_targets, monthly_targets, weight, description';
