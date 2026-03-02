-- Phase 2: 绩效面谈记录系统（增强版）
-- 创建时间: 2026-03-01
-- 描述: 完整的绩效面谈流程，包含计划、记录、改进计划、跟进提醒

-- 1. 面谈计划表 (interview_plans)
CREATE TABLE IF NOT EXISTS interview_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    interview_type VARCHAR(50) NOT NULL DEFAULT 'regular',
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    duration_minutes INT DEFAULT 60,

    manager_id INT NOT NULL,
    employee_id INT NOT NULL,
    department_id INT,

    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    template_id INT,

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interview_plans_manager ON interview_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_interview_plans_employee ON interview_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_interview_plans_date ON interview_plans(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_interview_plans_status ON interview_plans(status);

COMMENT ON TABLE interview_plans IS '面谈计划表';
COMMENT ON COLUMN interview_plans.title IS '面谈主题';
COMMENT ON COLUMN interview_plans.description IS '面谈说明';
COMMENT ON COLUMN interview_plans.interview_type IS '面谈类型: regular/probation/promotion/exit';
COMMENT ON COLUMN interview_plans.scheduled_date IS '计划面谈日期';
COMMENT ON COLUMN interview_plans.scheduled_time IS '计划面谈时间';
COMMENT ON COLUMN interview_plans.duration_minutes IS '预计时长(分钟)';
COMMENT ON COLUMN interview_plans.manager_id IS '面谈官ID（经理）';
COMMENT ON COLUMN interview_plans.employee_id IS '被面谈人ID';
COMMENT ON COLUMN interview_plans.department_id IS '所属部门';
COMMENT ON COLUMN interview_plans.status IS '状态: scheduled/completed/cancelled/rescheduled';
COMMENT ON COLUMN interview_plans.template_id IS '使用的面谈模板ID';
COMMENT ON COLUMN interview_plans.created_by IS '创建人ID';

-- 2. 面谈模板表 (interview_templates)
CREATE TABLE IF NOT EXISTS interview_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    interview_type VARCHAR(50) NOT NULL,
    description TEXT,
    questions JSON,
    is_default BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interview_templates_type ON interview_templates(interview_type);
CREATE INDEX IF NOT EXISTS idx_interview_templates_status ON interview_templates(status);

COMMENT ON TABLE interview_templates IS '面谈模板表';
COMMENT ON COLUMN interview_templates.name IS '模板名称';
COMMENT ON COLUMN interview_templates.interview_type IS '面谈类型';
COMMENT ON COLUMN interview_templates.description IS '模板说明';
COMMENT ON COLUMN interview_templates.questions IS '问题列表 [{question, category, required}]';
COMMENT ON COLUMN interview_templates.is_default IS '是否默认模板';
COMMENT ON COLUMN interview_templates.status IS '状态: active/archived';

-- 3. 面谈记录表 (interview_records)
CREATE TABLE IF NOT EXISTS interview_records (
    id SERIAL PRIMARY KEY,
    plan_id INT,
    employee_id INT NOT NULL,
    manager_id INT NOT NULL,
    interview_date DATE NOT NULL,
    interview_time TIME,
    duration_minutes INT,

    employee_summary TEXT,
    manager_feedback TEXT,
    achievements TEXT,
    challenges TEXT,
    strengths TEXT,
    improvements TEXT,

    overall_rating DECIMAL(2,1),
    performance_score DECIMAL(2,1),
    potential_score DECIMAL(2,1),

    nine_box_performance VARCHAR(20),
    nine_box_potential VARCHAR(20),

    notes TEXT,
    attachments JSON,
    status VARCHAR(20) DEFAULT 'draft',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (plan_id) REFERENCES interview_plans(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_interview_records_employee ON interview_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_interview_records_manager ON interview_records(manager_id);
CREATE INDEX IF NOT EXISTS idx_interview_records_date ON interview_records(interview_date);
CREATE INDEX IF NOT EXISTS idx_interview_records_status ON interview_records(status);

COMMENT ON TABLE interview_records IS '面谈记录表';
COMMENT ON COLUMN interview_records.plan_id IS '关联的计划ID';
COMMENT ON COLUMN interview_records.employee_id IS '员工ID';
COMMENT ON COLUMN interview_records.manager_id IS '面谈官ID';
COMMENT ON COLUMN interview_records.interview_date IS '实际面谈日期';
COMMENT ON COLUMN interview_records.interview_time IS '实际面谈时间';
COMMENT ON COLUMN interview_records.duration_minutes IS '实际时长';
COMMENT ON COLUMN interview_records.employee_summary IS '员工自我总结';
COMMENT ON COLUMN interview_records.manager_feedback IS '经理反馈';
COMMENT ON COLUMN interview_records.achievements IS '主要成就';
COMMENT ON COLUMN interview_records.challenges IS '面临挑战';
COMMENT ON COLUMN interview_records.strengths IS '优势';
COMMENT ON COLUMN interview_records.improvements IS '改进点';
COMMENT ON COLUMN interview_records.overall_rating IS '总体评分 1.0-5.0';
COMMENT ON COLUMN interview_records.performance_score IS '绩效得分';
COMMENT ON COLUMN interview_records.potential_score IS '潜力得分';
COMMENT ON COLUMN interview_records.nine_box_performance IS '绩效表现: low/medium/high';
COMMENT ON COLUMN interview_records.nine_box_potential IS '潜力: low/medium/high';
COMMENT ON COLUMN interview_records.notes IS '其他备注';
COMMENT ON COLUMN interview_records.attachments IS '附件列表';
COMMENT ON COLUMN interview_records.status IS '状态: draft/submitted/approved';

-- 4. 改进计划表 (improvement_plans)
CREATE TABLE IF NOT EXISTS improvement_plans (
    id SERIAL PRIMARY KEY,
    interview_record_id INT NOT NULL,
    employee_id INT NOT NULL,
    manager_id INT NOT NULL,

    goal VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium',

    start_date DATE,
    target_date DATE,
    actual_completion_date DATE,

    status VARCHAR(20) DEFAULT 'not_started',
    progress_percentage INT DEFAULT 0,

    resources_needed TEXT,
    support_from_manager TEXT,

    follow_up_notes TEXT,
    last_reviewed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (interview_record_id) REFERENCES interview_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_improvement_plans_employee ON improvement_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_improvement_plans_status ON improvement_plans(status);
CREATE INDEX IF NOT EXISTS idx_improvement_plans_target ON improvement_plans(target_date);

COMMENT ON TABLE improvement_plans IS '改进计划表';
COMMENT ON COLUMN improvement_plans.interview_record_id IS '面谈记录ID';
COMMENT ON COLUMN improvement_plans.employee_id IS '员工ID';
COMMENT ON COLUMN improvement_plans.manager_id IS '经理ID';
COMMENT ON COLUMN improvement_plans.goal IS '改进目标';
COMMENT ON COLUMN improvement_plans.description IS '详细说明';
COMMENT ON COLUMN improvement_plans.category IS '分类: skill/behavior/performance';
COMMENT ON COLUMN improvement_plans.priority IS '优先级: low/medium/high/urgent';
COMMENT ON COLUMN improvement_plans.start_date IS '开始日期';
COMMENT ON COLUMN improvement_plans.target_date IS '目标完成日期';
COMMENT ON COLUMN improvement_plans.actual_completion_date IS '实际完成日期';
COMMENT ON COLUMN improvement_plans.status IS '状态: not_started/in_progress/completed/cancelled';
COMMENT ON COLUMN improvement_plans.progress_percentage IS '完成进度 0-100';
COMMENT ON COLUMN improvement_plans.resources_needed IS '所需资源';
COMMENT ON COLUMN improvement_plans.support_from_manager IS '经理支持事项';
COMMENT ON COLUMN improvement_plans.follow_up_notes IS '跟进记录';
COMMENT ON COLUMN improvement_plans.last_reviewed_at IS '最后检查时间';

-- 5. 面谈提醒表 (interview_reminders)
CREATE TABLE IF NOT EXISTS interview_reminders (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL,
    recipient_id INT NOT NULL,
    recipient_type VARCHAR(20) NOT NULL,

    reminder_type VARCHAR(50) NOT NULL,
    reminder_date DATE NOT NULL,
    reminder_time TIME,

    message TEXT,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (plan_id) REFERENCES interview_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_reminders_recipient ON interview_reminders(recipient_id);
CREATE INDEX IF NOT EXISTS idx_interview_reminders_date ON interview_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_interview_reminders_sent ON interview_reminders(is_sent);

COMMENT ON TABLE interview_reminders IS '面谈提醒表';
COMMENT ON COLUMN interview_reminders.plan_id IS '面谈计划ID';
COMMENT ON COLUMN interview_reminders.recipient_id IS '接收人ID';
COMMENT ON COLUMN interview_reminders.recipient_type IS '接收人类型: employee/manager/hr';
COMMENT ON COLUMN interview_reminders.reminder_type IS '提醒类型: upcoming/overdue/followup';
COMMENT ON COLUMN interview_reminders.reminder_date IS '提醒日期';
COMMENT ON COLUMN interview_reminders.reminder_time IS '提醒时间';
COMMENT ON COLUMN interview_reminders.message IS '提醒消息';
COMMENT ON COLUMN interview_reminders.is_sent IS '是否已发送';
COMMENT ON COLUMN interview_reminders.sent_at IS '发送时间';

-- 6. 插入默认面谈模板
INSERT INTO interview_templates (name, interview_type, description, questions, is_default, status) VALUES
('常规绩效面谈模板', 'regular', '季度/年度绩效面谈标准模板',
 '[
   {"question": "这个周期你最大的成就是什么？", "category": "achievement", "required": true},
   {"question": "你遇到了哪些挑战？如何应对的？", "category": "challenge", "required": true},
   {"question": "你的职业发展目标是什么？", "category": "career", "required": true},
   {"question": "你需要哪些支持来提升绩效？", "category": "support", "required": true},
   {"question": "对团队/公司有什么建议？", "category": "feedback", "required": false}
 ]',
 true, 'active'),

('试用期转正面谈模板', 'probation', '试用期员工转正评估面谈',
 '[
   {"question": "试用期工作感受如何？", "category": "experience", "required": true},
   {"question": "对岗位职责的理解程度？", "category": "understanding", "required": true},
   {"question": "完成的主要工作任务？", "category": "achievement", "required": true},
   {"question": "遇到的困难和解决方式？", "category": "challenge", "required": true},
   {"question": "未来工作计划和目标？", "category": "plan", "required": true}
 ]',
 true, 'active'),

('晋升评估面谈模板', 'promotion', '晋升候选人评估面谈',
 '[
   {"question": "为什么认为自己适合晋升？", "category": "qualification", "required": true},
   {"question": "晋升后的工作计划？", "category": "plan", "required": true},
   {"question": "如何带领团队/提升影响力？", "category": "leadership", "required": true},
   {"question": "职业发展长期规划？", "category": "career", "required": true}
 ]',
 true, 'active'),

('离职面谈模板', 'exit', '员工离职面谈',
 '[
   {"question": "离职的主要原因？", "category": "reason", "required": true},
   {"question": "对公司/部门的建议？", "category": "feedback", "required": false},
   {"question": "工作中最满意/不满意的地方？", "category": "satisfaction", "required": true},
   {"question": "未来职业规划？", "category": "career", "required": false}
 ]',
 true, 'active');
