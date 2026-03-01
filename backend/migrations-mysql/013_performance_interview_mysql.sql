-- Phase 2: 绩效面谈记录系统 (MySQL版本)
-- 创建时间: 2026-03-01

-- 1. 面谈计划表
CREATE TABLE IF NOT EXISTS interview_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL COMMENT '面谈主题',
    description TEXT COMMENT '面谈说明',
    interview_type VARCHAR(50) NOT NULL DEFAULT 'regular' COMMENT '面谈类型',
    scheduled_date DATE NOT NULL COMMENT '计划面谈日期',
    scheduled_time TIME COMMENT '计划面谈时间',
    duration_minutes INT DEFAULT 60 COMMENT '预计时长(分钟)',
    
    manager_id INT NOT NULL COMMENT '面谈官ID',
    employee_id INT NOT NULL COMMENT '被面谈人ID',
    department_id INT COMMENT '所属部门',
    
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' COMMENT '状态',
    template_id INT COMMENT '使用的面谈模板ID',
    
    created_by INT COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_manager (manager_id),
    INDEX idx_employee (employee_id),
    INDEX idx_date (scheduled_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面谈计划表';

-- 2. 面谈模板表
CREATE TABLE IF NOT EXISTS interview_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '模板名称',
    interview_type VARCHAR(50) NOT NULL COMMENT '面谈类型',
    description TEXT COMMENT '模板说明',
    questions JSON COMMENT '问题列表',
    is_default BOOLEAN DEFAULT FALSE COMMENT '是否默认模板',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_type (interview_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面谈模板表';

-- 3. 面谈记录表
CREATE TABLE IF NOT EXISTS interview_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT COMMENT '关联的计划ID',
    employee_id INT NOT NULL COMMENT '员工ID',
    manager_id INT NOT NULL COMMENT '面谈官ID',
    interview_date DATE NOT NULL COMMENT '实际面谈日期',
    interview_time TIME COMMENT '实际面谈时间',
    duration_minutes INT COMMENT '实际时长',
    
    employee_summary TEXT COMMENT '员工自我总结',
    manager_feedback TEXT COMMENT '经理反馈',
    achievements TEXT COMMENT '主要成就',
    challenges TEXT COMMENT '面临挑战',
    strengths TEXT COMMENT '优势',
    improvements TEXT COMMENT '改进点',
    
    overall_rating DECIMAL(2,1) COMMENT '总体评分',
    performance_score DECIMAL(2,1) COMMENT '绩效得分',
    potential_score DECIMAL(2,1) COMMENT '潜力得分',
    
    nine_box_performance VARCHAR(20) COMMENT '绩效表现',
    nine_box_potential VARCHAR(20) COMMENT '潜力',
    
    notes TEXT COMMENT '其他备注',
    attachments JSON COMMENT '附件列表',
    status VARCHAR(20) DEFAULT 'draft' COMMENT '状态',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (plan_id) REFERENCES interview_plans(id) ON DELETE SET NULL,
    INDEX idx_employee (employee_id),
    INDEX idx_manager (manager_id),
    INDEX idx_date (interview_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面谈记录表';

-- 4. 改进计划表
CREATE TABLE IF NOT EXISTS improvement_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    interview_record_id INT NOT NULL COMMENT '面谈记录ID',
    employee_id INT NOT NULL COMMENT '员工ID',
    manager_id INT NOT NULL COMMENT '经理ID',
    
    goal VARCHAR(500) NOT NULL COMMENT '改进目标',
    description TEXT COMMENT '详细说明',
    category VARCHAR(50) COMMENT '分类',
    priority VARCHAR(20) DEFAULT 'medium' COMMENT '优先级',
    
    start_date DATE COMMENT '开始日期',
    target_date DATE COMMENT '目标完成日期',
    actual_completion_date DATE COMMENT '实际完成日期',
    
    status VARCHAR(20) DEFAULT 'not_started' COMMENT '状态',
    progress_percentage INT DEFAULT 0 COMMENT '完成进度',
    
    resources_needed TEXT COMMENT '所需资源',
    support_from_manager TEXT COMMENT '经理支持事项',
    
    follow_up_notes TEXT COMMENT '跟进记录',
    last_reviewed_at TIMESTAMP NULL COMMENT '最后检查时间',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (interview_record_id) REFERENCES interview_records(id) ON DELETE CASCADE,
    INDEX idx_employee (employee_id),
    INDEX idx_status (status),
    INDEX idx_target_date (target_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='改进计划表';

-- 5. 面谈提醒表
CREATE TABLE IF NOT EXISTS interview_reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL COMMENT '面谈计划ID',
    recipient_id INT NOT NULL COMMENT '接收人ID',
    recipient_type VARCHAR(20) NOT NULL COMMENT '接收人类型',
    
    reminder_type VARCHAR(50) NOT NULL COMMENT '提醒类型',
    reminder_date DATE NOT NULL COMMENT '提醒日期',
    reminder_time TIME COMMENT '提醒时间',
    
    message TEXT COMMENT '提醒消息',
    is_sent BOOLEAN DEFAULT FALSE COMMENT '是否已发送',
    sent_at TIMESTAMP NULL COMMENT '发送时间',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (plan_id) REFERENCES interview_plans(id) ON DELETE CASCADE,
    INDEX idx_recipient (recipient_id),
    INDEX idx_date (reminder_date),
    INDEX idx_sent (is_sent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面谈提醒表';

-- 6. 插入默认模板
INSERT INTO interview_templates (name, interview_type, description, questions, is_default, status) VALUES
('常规绩效面谈模板', 'regular', '季度/年度绩效面谈标准模板', 
 '[{"question": "这个周期你最大的成就是什么？", "category": "achievement", "required": true}, {"question": "你遇到了哪些挑战？如何应对的？", "category": "challenge", "required": true}, {"question": "你的职业发展目标是什么？", "category": "career", "required": true}, {"question": "你需要哪些支持来提升绩效？", "category": "support", "required": true}]', 
 true, 'active'),

('试用期转正面谈模板', 'probation', '试用期员工转正评估面谈', 
 '[{"question": "试用期工作感受如何？", "category": "experience", "required": true}, {"question": "对岗位职责的理解程度？", "category": "understanding", "required": true}, {"question": "完成的主要工作任务？", "category": "achievement", "required": true}]', 
 true, 'active'),

('晋升评估面谈模板', 'promotion', '晋升候选人评估面谈', 
 '[{"question": "为什么认为自己适合晋升？", "category": "qualification", "required": true}, {"question": "晋升后的工作计划？", "category": "plan", "required": true}, {"question": "如何带领团队/提升影响力？", "category": "leadership", "required": true}]', 
 true, 'active'),

('离职面谈模板', 'exit', '员工离职面谈', 
 '[{"question": "离职的主要原因？", "category": "reason", "required": true}, {"question": "对公司/部门的建议？", "category": "feedback", "required": false}, {"question": "工作中最满意/不满意的地方？", "category": "satisfaction", "required": true}]', 
 true, 'active');
