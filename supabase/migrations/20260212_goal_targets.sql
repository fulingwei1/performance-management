-- 扩展目标表：添加季度和月度拆解
ALTER TABLE objectives
ADD COLUMN IF NOT EXISTS quarterly_targets JSONB DEFAULT '{
  "Q1": {"target": "", "weight": 25},
  "Q2": {"target": "", "weight": 25},
  "Q3": {"target": "", "weight": 25},
  "Q4": {"target": "", "weight": 25}
}'::jsonb,
ADD COLUMN IF NOT EXISTS monthly_targets JSONB DEFAULT '{
  "M1": "", "M2": "", "M3": "", "M4": "",
  "M5": "", "M6": "", "M7": "", "M8": "",
  "M9": "", "M10": "", "M11": "", "M12": ""
}'::jsonb,
ADD COLUMN IF NOT EXISTS target_value TEXT,
ADD COLUMN IF NOT EXISTS employee_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS employee_feedback TEXT;

-- 创建目标进度表（追踪每月完成度）
CREATE TABLE IF NOT EXISTS goal_progress (
    id TEXT PRIMARY KEY,
    objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    
    -- 员工填写
    employee_completion_rate DECIMAL(5,2) DEFAULT 0 CHECK (employee_completion_rate BETWEEN 0 AND 100),
    employee_comment TEXT,
    employee_submitted_at TIMESTAMP WITH TIME ZONE,
    
    -- 经理填写/审核
    manager_completion_rate DECIMAL(5,2) CHECK (manager_completion_rate BETWEEN 0 AND 100),
    manager_comment TEXT,
    manager_reviewed_at TIMESTAMP WITH TIME ZONE,
    manager_id TEXT REFERENCES employees(id),
    
    -- 状态
    status TEXT CHECK (status IN ('draft', 'employee_submitted', 'manager_reviewed')) DEFAULT 'draft',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(objective_id, year, month)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_goal_progress_employee ON goal_progress(employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_goal_progress_objective ON goal_progress(objective_id);
CREATE INDEX IF NOT EXISTS idx_objectives_owner ON objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_objectives_year ON objectives(year);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_objectives_updated_at
    BEFORE UPDATE ON objectives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_progress_updated_at
    BEFORE UPDATE ON goal_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
