-- Phase 2: 360度互评系统 (MySQL版本)
-- 创建时间: 2026-03-01

-- 1. 互评周期表
CREATE TABLE IF NOT EXISTS review_cycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '周期名称',
    description TEXT COMMENT '周期描述',
    start_date DATE NOT NULL COMMENT '开始日期',
    end_date DATE NOT NULL COMMENT '结束日期',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态: draft/active/closed',
    review_type VARCHAR(50) NOT NULL DEFAULT 'peer' COMMENT '互评类型: peer/upward/cross',
    is_anonymous BOOLEAN DEFAULT FALSE COMMENT '是否匿名评价',
    created_by INT COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_review_type (review_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='互评周期表';

-- 2. 评价关系表
CREATE TABLE IF NOT EXISTS review_relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id INT NOT NULL COMMENT '互评周期ID',
    reviewer_id INT NOT NULL COMMENT '评价人ID',
    reviewee_id INT NOT NULL COMMENT '被评价人ID',
    relationship_type VARCHAR(50) NOT NULL COMMENT '关系类型',
    department_id INT COMMENT '所属部门ID',
    weight DECIMAL(3,2) DEFAULT 1.00 COMMENT '评价权重',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE,
    UNIQUE KEY uk_cycle_reviewer_reviewee (cycle_id, reviewer_id, reviewee_id),
    INDEX idx_reviewer (reviewer_id),
    INDEX idx_reviewee (reviewee_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评价关系表';

-- 3. 互评记录表
CREATE TABLE IF NOT EXISTS peer_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    relationship_id INT NOT NULL COMMENT '评价关系ID',
    cycle_id INT NOT NULL COMMENT '互评周期ID',
    reviewer_id INT NOT NULL COMMENT '评价人ID',
    reviewee_id INT NOT NULL COMMENT '被评价人ID',
    
    teamwork_score DECIMAL(2,1) COMMENT '团队协作',
    communication_score DECIMAL(2,1) COMMENT '沟通能力',
    professional_score DECIMAL(2,1) COMMENT '专业能力',
    responsibility_score DECIMAL(2,1) COMMENT '责任心',
    innovation_score DECIMAL(2,1) COMMENT '创新能力',
    
    total_score DECIMAL(3,1) COMMENT '总分',
    strengths TEXT COMMENT '优点',
    improvements TEXT COMMENT '改进建议',
    overall_comment TEXT COMMENT '综合评价',
    
    is_anonymous BOOLEAN DEFAULT FALSE COMMENT '是否匿名',
    submitted_at TIMESTAMP NULL COMMENT '提交时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (relationship_id) REFERENCES review_relationships(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE,
    INDEX idx_cycle (cycle_id),
    INDEX idx_reviewer (reviewer_id),
    INDEX idx_reviewee (reviewee_id),
    INDEX idx_submitted (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='互评记录表';

-- 4. 互评统计表
CREATE TABLE IF NOT EXISTS review_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id INT NOT NULL COMMENT '互评周期ID',
    reviewee_id INT NOT NULL COMMENT '被评价人ID',
    
    total_reviews INT DEFAULT 0 COMMENT '总评价数',
    completed_reviews INT DEFAULT 0 COMMENT '已完成数',
    avg_teamwork DECIMAL(3,2) COMMENT '团队协作平均分',
    avg_communication DECIMAL(3,2) COMMENT '沟通能力平均分',
    avg_professional DECIMAL(3,2) COMMENT '专业能力平均分',
    avg_responsibility DECIMAL(3,2) COMMENT '责任心平均分',
    avg_innovation DECIMAL(3,2) COMMENT '创新能力平均分',
    avg_total_score DECIMAL(3,2) COMMENT '总分平均分',
    
    last_calculated_at TIMESTAMP NULL COMMENT '最后计算时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE,
    UNIQUE KEY uk_cycle_reviewee (cycle_id, reviewee_id),
    INDEX idx_avg_score (avg_total_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='互评统计表';
