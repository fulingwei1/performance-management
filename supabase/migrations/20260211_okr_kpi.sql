-- 战略目标（公司级）
CREATE TABLE IF NOT EXISTS strategic_objectives (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER NOT NULL,
    status TEXT CHECK (status IN ('draft', 'active', 'completed', 'cancelled')) DEFAULT 'draft',
    created_by TEXT REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OKR 目标（支持级联：公司→部门→个人）
CREATE TABLE IF NOT EXISTS objectives (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    level TEXT CHECK (level IN ('company', 'department', 'individual')) NOT NULL,
    parent_id TEXT REFERENCES objectives(id),
    strategic_objective_id TEXT REFERENCES strategic_objectives(id),
    department TEXT,
    owner_id TEXT REFERENCES employees(id),
    year INTEGER NOT NULL,
    quarter TEXT,
    weight DECIMAL(5,2) DEFAULT 100,
    progress DECIMAL(5,2) DEFAULT 0,
    status TEXT CHECK (status IN ('draft', 'active', 'completed', 'cancelled')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 关键结果（KR）
CREATE TABLE IF NOT EXISTS key_results (
    id TEXT PRIMARY KEY,
    objective_id TEXT REFERENCES objectives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    metric_type TEXT CHECK (metric_type IN ('number', 'percentage', 'boolean', 'currency')) DEFAULT 'number',
    target_value DECIMAL(12,2),
    current_value DECIMAL(12,2) DEFAULT 0,
    unit TEXT,
    weight DECIMAL(5,2) DEFAULT 0,
    progress DECIMAL(5,2) DEFAULT 0,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'at_risk')) DEFAULT 'not_started',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KPI 指标绑定
CREATE TABLE IF NOT EXISTS kpi_assignments (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    objective_id TEXT REFERENCES objectives(id),
    key_result_id TEXT REFERENCES key_results(id),
    kpi_name TEXT NOT NULL,
    target_value DECIMAL(12,2),
    actual_value DECIMAL(12,2) DEFAULT 0,
    unit TEXT,
    weight DECIMAL(5,2) DEFAULT 0,
    score DECIMAL(5,2),
    year INTEGER NOT NULL,
    month TEXT,
    status TEXT CHECK (status IN ('pending', 'submitted', 'approved')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 绩效合约
CREATE TABLE IF NOT EXISTS performance_contracts (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    manager_id TEXT REFERENCES employees(id),
    year INTEGER NOT NULL,
    objectives_snapshot JSONB,
    kpi_snapshot JSONB,
    employee_signed_at TIMESTAMP WITH TIME ZONE,
    manager_signed_at TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('draft', 'pending_employee', 'pending_manager', 'signed', 'revised')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, year)
);

-- 月度进度汇报
CREATE TABLE IF NOT EXISTS monthly_reports (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    summary TEXT,
    achievements TEXT,
    issues TEXT,
    next_month_plan TEXT,
    attachments JSONB DEFAULT '[]',
    manager_comment TEXT,
    manager_id TEXT REFERENCES employees(id),
    commented_at TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('draft', 'submitted', 'reviewed')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, year, month)
);

-- 绩效面谈记录
CREATE TABLE IF NOT EXISTS performance_interviews (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    interviewer_id TEXT REFERENCES employees(id),
    year INTEGER NOT NULL,
    interview_date DATE,
    performance_summary TEXT,
    strengths TEXT,
    improvements TEXT,
    development_plan TEXT,
    employee_feedback TEXT,
    agreed_actions JSONB DEFAULT '[]',
    status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_objectives_parent ON objectives(parent_id);
CREATE INDEX IF NOT EXISTS idx_objectives_owner ON objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_objectives_department ON objectives(department);
CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_kpi_employee ON kpi_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_employee ON monthly_reports(employee_id);
