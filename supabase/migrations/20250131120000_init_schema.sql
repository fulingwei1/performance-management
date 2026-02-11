-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    sub_department TEXT,
    role TEXT CHECK (role IN ('employee', 'manager', 'gm', 'hr')),
    level TEXT CHECK (level IN ('senior', 'intermediate', 'junior', 'assistant')),
    manager_id TEXT,
    avatar TEXT,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Records
CREATE TABLE IF NOT EXISTS performance_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    assessor_id TEXT REFERENCES employees(id),
    month TEXT, -- YYYY-MM
    self_summary TEXT,
    next_month_plan TEXT,
    task_completion DECIMAL(5,2),
    initiative DECIMAL(5,2),
    project_feedback DECIMAL(5,2),
    quality_improvement DECIMAL(5,2),
    total_score DECIMAL(5,2),
    level TEXT, -- L1-L5
    normalized_score DECIMAL(5,2),
    manager_comment TEXT,
    next_month_work_arrangement TEXT,
    group_type TEXT CHECK (group_type IN ('high', 'low')),
    group_rank INTEGER,
    cross_dept_rank INTEGER,
    department_rank INTEGER,
    company_rank INTEGER,
    status TEXT CHECK (status IN ('draft', 'submitted', 'scored', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quarterly Summaries
CREATE TABLE IF NOT EXISTS quarterly_summaries (
    id TEXT PRIMARY KEY,
    manager_id TEXT REFERENCES employees(id),
    manager_name TEXT,
    quarter TEXT,
    summary TEXT,
    next_quarter_plan TEXT,
    status TEXT CHECK (status IN ('draft', 'submitted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quarterly_summaries_manager_quarter ON quarterly_summaries(manager_id, quarter);

-- Promotion Requests
CREATE TABLE IF NOT EXISTS promotion_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    requester_id TEXT REFERENCES employees(id),
    requester_role TEXT CHECK (requester_role IN ('employee', 'manager')),
    target_level TEXT CHECK (target_level IN ('senior', 'intermediate', 'junior', 'assistant')),
    target_position TEXT,
    raise_percentage DECIMAL(5,2),
    performance_summary TEXT,
    skill_summary TEXT,
    competency_summary TEXT,
    work_summary TEXT,
    status TEXT CHECK (status IN ('draft', 'submitted', 'manager_approved', 'gm_approved', 'hr_approved', 'rejected')),
    manager_comment TEXT,
    manager_approver_id TEXT REFERENCES employees(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    gm_comment TEXT,
    gm_approver_id TEXT REFERENCES employees(id),
    gm_approved_at TIMESTAMP WITH TIME ZONE,
    hr_comment TEXT,
    hr_approver_id TEXT REFERENCES employees(id),
    hr_approved_at TIMESTAMP WITH TIME ZONE,
    rejected_reason TEXT,
    rejected_by_role TEXT CHECK (rejected_by_role IN ('manager', 'gm', 'hr')),
    rejected_by_id TEXT REFERENCES employees(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_requests_employee_id ON promotion_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_promotion_requests_requester_id ON promotion_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_promotion_requests_status ON promotion_requests(status);

-- Promotion Approval Settings
CREATE TABLE IF NOT EXISTS promotion_approval_settings (
    id TEXT PRIMARY KEY,
    chain TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Peer Reviews
CREATE TABLE IF NOT EXISTS peer_reviews (
    id TEXT PRIMARY KEY,
    reviewer_id TEXT REFERENCES employees(id),
    reviewer_name TEXT,
    reviewee_id TEXT REFERENCES employees(id),
    reviewee_name TEXT,
    record_id TEXT,
    collaboration DECIMAL(5,2),
    professionalism DECIMAL(5,2),
    communication DECIMAL(5,2),
    comment TEXT,
    month TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment Cycles
CREATE TABLE IF NOT EXISTS assessment_cycles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('monthly', 'quarterly', 'annual', 'probation')),
    year INTEGER,
    start_date TEXT,
    end_date TEXT,
    self_assessment_deadline TEXT,
    manager_review_deadline TEXT,
    hr_review_deadline TEXT,
    appeal_deadline TEXT,
    status TEXT CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    reminder_days INTEGER DEFAULT 3,
    auto_submit BOOLEAN DEFAULT FALSE,
    exclude_holidays BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Holidays
CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT CHECK (type IN ('national', 'company'))
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    category TEXT,
    type TEXT,
    description TEXT,
    weight DECIMAL(5,2),
    formula TEXT,
    unit TEXT,
    target_value DECIMAL(10,2),
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    data_source TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scoring Criteria
CREATE TABLE IF NOT EXISTS scoring_criteria (
    id TEXT PRIMARY KEY,
    metric_id TEXT REFERENCES performance_metrics(id) ON DELETE CASCADE,
    level TEXT,
    score DECIMAL(5,2),
    description TEXT
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    parent_id TEXT,
    manager_id TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Positions
CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    department_id TEXT REFERENCES departments(id),
    level TEXT,
    category TEXT,
    description TEXT,
    requirements TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metric Relations
CREATE TABLE IF NOT EXISTS metric_departments (
    metric_id TEXT REFERENCES performance_metrics(id) ON DELETE CASCADE,
    department_id TEXT REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (metric_id, department_id)
);

CREATE TABLE IF NOT EXISTS metric_positions (
    metric_id TEXT REFERENCES performance_metrics(id) ON DELETE CASCADE,
    position_id TEXT REFERENCES positions(id) ON DELETE CASCADE,
    PRIMARY KEY (metric_id, position_id)
);

CREATE TABLE IF NOT EXISTS metric_levels (
    metric_id TEXT REFERENCES performance_metrics(id) ON DELETE CASCADE,
    level TEXT,
    PRIMARY KEY (metric_id, level)
);

-- Metric Templates
CREATE TABLE IF NOT EXISTS metric_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    position_id TEXT REFERENCES positions(id),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_metrics (
    template_id TEXT REFERENCES metric_templates(id) ON DELETE CASCADE,
    metric_id TEXT REFERENCES performance_metrics(id) ON DELETE CASCADE,
    weight DECIMAL(5,2),
    required BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (template_id, metric_id)
);
