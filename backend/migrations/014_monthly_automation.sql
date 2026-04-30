-- Migration: 014_monthly_automation
-- Description: Monthly automation system tables (templates, archives, employee emails, automation logs)
-- Created: 2026-04-29

-- ============================================
-- 1. Add email column to employees table (if not exists)
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- ============================================
-- 2. automation_templates - configurable templates for monthly tasks
-- ============================================
CREATE TABLE IF NOT EXISTS automation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    month_pattern VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM',  -- e.g., 'YYYY-MM'
    enabled BOOLEAN DEFAULT TRUE,
    auto_generate_day INT DEFAULT 1,  -- day of month (1-28) to auto-generate tasks
    task_types JSONB DEFAULT '[]'::jsonb,  -- e.g., ["self_review","manager_review"]
    deadline_days JSONB DEFAULT '{}'::jsonb,  -- e.g., {"self_review": 5, "manager_review": 10}
    reminder_schedule JSONB DEFAULT '[]'::jsonb,  -- e.g., [{"days_before": 3, "channel": "email"}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automation_templates_enabled ON automation_templates(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_templates_name ON automation_templates(name);

COMMENT ON TABLE automation_templates IS '月度自动化任务配置模板';
COMMENT ON COLUMN automation_templates.id IS '模板唯一标识';
COMMENT ON COLUMN automation_templates.name IS '模板名称';
COMMENT ON COLUMN automation_templates.month_pattern IS '月份格式 (YYYY-MM)';
COMMENT ON COLUMN automation_templates.enabled IS '是否启用';
COMMENT ON COLUMN automation_templates.auto_generate_day IS '每月自动创建任务的日期 (1-28)';
COMMENT ON COLUMN automation_templates.task_types IS '任务类型数组 (JSON)';
COMMENT ON COLUMN automation_templates.deadline_days IS '各任务类型截止天数 (JSON)';
COMMENT ON COLUMN automation_templates.reminder_schedule IS '提醒计划配置 (JSON)';

-- ============================================
-- 3. monthly_archives - automated archive records
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month VARCHAR(7) NOT NULL UNIQUE,  -- YYYY-MM
    total_records INT DEFAULT 0,
    completed_records INT DEFAULT 0,
    avg_score DECIMAL(5,2),
    level_distribution JSONB DEFAULT '{}'::jsonb,  -- e.g., {"L5": 10, "L4": 30, "L3": 40, "L2": 15, "L1": 5}
    department_stats JSONB DEFAULT '{}'::jsonb,  -- department-level statistics
    chart_paths TEXT[] DEFAULT '{}',  -- array of chart file paths
    archived_by UUID,  -- nullable, references employees or user id
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monthly_archives_month ON monthly_archives(month);
CREATE INDEX IF NOT EXISTS idx_monthly_archives_archived_at ON monthly_archives(archived_at);

COMMENT ON TABLE monthly_archives IS '月度绩效自动归档记录';
COMMENT ON COLUMN monthly_archives.id IS '归档唯一标识';
COMMENT ON COLUMN monthly_archives.month IS '归档月份 (YYYY-MM)';
COMMENT ON COLUMN monthly_archives.total_records IS '总记录数';
COMMENT ON COLUMN monthly_archives.completed_records IS '已完成记录数';
COMMENT ON COLUMN monthly_archives.avg_score IS '平均分';
COMMENT ON COLUMN monthly_archives.level_distribution IS '等级分布 (JSON)';
COMMENT ON COLUMN monthly_archives.department_stats IS '部门统计 (JSON)';
COMMENT ON COLUMN monthly_archives.chart_paths IS '图表文件路径数组';
COMMENT ON COLUMN monthly_archives.archived_by IS '归档操作人ID';
COMMENT ON COLUMN monthly_archives.archived_at IS '归档时间';

-- ============================================
-- 4. employee_emails - store employee email addresses
-- ============================================
CREATE TABLE IF NOT EXISTS employee_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT employee_emails_employee_email_unique UNIQUE (employee_id, email)
);

CREATE INDEX IF NOT EXISTS idx_employee_emails_employee ON employee_emails(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_emails_email ON employee_emails(email);
CREATE INDEX IF NOT EXISTS idx_employee_emails_verified ON employee_emails(verified);

COMMENT ON TABLE employee_emails IS '员工邮箱地址表';
COMMENT ON COLUMN employee_emails.id IS '邮箱记录唯一标识';
COMMENT ON COLUMN employee_emails.employee_id IS '关联员工ID';
COMMENT ON COLUMN employee_emails.email IS '邮箱地址';
COMMENT ON COLUMN employee_emails.verified IS '邮箱是否已验证';

-- ============================================
-- 5. automation_logs - track automation execution
--    Note: automation_logs table may already exist from migration 001.
--    If it does, we add missing columns for the new schema.
--    If it does not, we create it with the full new schema.
-- ============================================
DO $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'automation_logs'
    ) THEN
        -- Table does not exist, create with full new schema
        CREATE TABLE automation_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_type VARCHAR(30) NOT NULL CHECK (job_type IN ('generate_tasks', 'send_reminders', 'publish_results', 'archive_data')),
            month VARCHAR(7),  -- YYYY-MM, nullable for non-monthly jobs
            status VARCHAR(10) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
            details JSONB DEFAULT '{}'::jsonb,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            duration_ms INT
        );

        CREATE INDEX idx_automation_logs_job_type ON automation_logs(job_type);
        CREATE INDEX idx_automation_logs_status ON automation_logs(status);
        CREATE INDEX idx_automation_logs_month ON automation_logs(month);
        CREATE INDEX idx_automation_logs_executed_at ON automation_logs(executed_at);

    ELSE
        -- Table exists (from migration 001), add missing columns if needed
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'automation_logs' AND column_name = 'job_type'
        ) THEN
            ALTER TABLE automation_logs ADD COLUMN job_type VARCHAR(30)
                CHECK (job_type IN ('generate_tasks', 'send_reminders', 'publish_results', 'archive_data'));
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'automation_logs' AND column_name = 'month'
        ) THEN
            ALTER TABLE automation_logs ADD COLUMN month VARCHAR(7);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'automation_logs' AND column_name = 'details'
        ) THEN
            ALTER TABLE automation_logs ADD COLUMN details JSONB DEFAULT '{}'::jsonb;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'automation_logs' AND column_name = 'duration_ms'
        ) THEN
            ALTER TABLE automation_logs ADD COLUMN duration_ms INT;
        END IF;

        -- Ensure status column accepts the new enum values
        -- (the old table already has a status column)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'automation_logs' AND column_name = 'status'
        ) THEN
            ALTER TABLE automation_logs ADD COLUMN status VARCHAR(10)
                DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped'));
        END IF;

        -- Add indexes if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE indexname = 'idx_automation_logs_job_type'
        ) THEN
            CREATE INDEX idx_automation_logs_job_type ON automation_logs(job_type);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE indexname = 'idx_automation_logs_month'
        ) THEN
            CREATE INDEX idx_automation_logs_month ON automation_logs(month);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE indexname = 'idx_automation_logs_executed_at'
        ) THEN
            CREATE INDEX idx_automation_logs_executed_at ON automation_logs(executed_at);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE indexname = 'idx_automation_logs_duration_ms'
        ) THEN
            CREATE INDEX idx_automation_logs_duration_ms ON automation_logs(duration_ms);
        END IF;
    END IF;
END $$;

COMMENT ON TABLE automation_logs IS '自动化任务执行日志';
COMMENT ON COLUMN automation_logs.id IS '日志唯一标识';
COMMENT ON COLUMN automation_logs.job_type IS '任务类型: generate_tasks|send_reminders|publish_results|archive_data';
COMMENT ON COLUMN automation_logs.month IS '关联月份 (YYYY-MM)';
COMMENT ON COLUMN automation_logs.status IS '执行状态: success|failed|skipped';
COMMENT ON COLUMN automation_logs.details IS '执行详情 (JSON)';
COMMENT ON COLUMN automation_logs.executed_at IS '执行时间';
COMMENT ON COLUMN automation_logs.duration_ms IS '执行耗时 (毫秒)';

-- ============================================
-- 6. Updated_at trigger for automation_templates
-- ============================================
CREATE OR REPLACE FUNCTION update_automation_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS automation_templates_updated_at ON automation_templates;
CREATE TRIGGER automation_templates_updated_at
    BEFORE UPDATE ON automation_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_templates_updated_at();
