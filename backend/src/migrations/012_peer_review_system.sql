-- Phase 2: 360度互评系统
-- 创建时间: 2026-03-01
-- 描述: 支持同事互评、下属评上级、跨部门协作评价

-- 1. 互评周期表 (review_cycles)
-- 用于管理互评的时间周期，如Q1互评、年度互评等
CREATE TABLE IF NOT EXISTS review_cycles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '周期名称，如"2026-Q1互评"',
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

-- 2. 评价关系表 (review_relationships)
-- 定义谁可以评价谁，在哪个周期
CREATE TABLE IF NOT EXISTS review_relationships (
    id SERIAL PRIMARY KEY,
    cycle_id INT NOT NULL COMMENT '互评周期ID',
    reviewer_id INT NOT NULL COMMENT '评价人ID',
    reviewee_id INT NOT NULL COMMENT '被评价人ID',
    relationship_type VARCHAR(50) NOT NULL COMMENT '关系类型: peer/manager/subordinate/cross_dept',
    department_id INT COMMENT '所属部门ID',
    weight DECIMAL(3,2) DEFAULT 1.00 COMMENT '评价权重 0-1',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE,
    UNIQUE KEY uk_cycle_reviewer_reviewee (cycle_id, reviewer_id, reviewee_id),
    INDEX idx_reviewer (reviewer_id),
    INDEX idx_reviewee (reviewee_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评价关系表';

-- 3. 互评记录表 (peer_reviews)
-- 存储实际的评价内容和评分
CREATE TABLE IF NOT EXISTS peer_reviews (
    id SERIAL PRIMARY KEY,
    relationship_id INT NOT NULL COMMENT '评价关系ID',
    cycle_id INT NOT NULL COMMENT '互评周期ID',
    reviewer_id INT NOT NULL COMMENT '评价人ID',
    reviewee_id INT NOT NULL COMMENT '被评价人ID',
    
    -- 评分维度（5级评分 L1-L5）
    teamwork_score DECIMAL(2,1) COMMENT '团队协作 1.0-5.0',
    communication_score DECIMAL(2,1) COMMENT '沟通能力',
    professional_score DECIMAL(2,1) COMMENT '专业能力',
    responsibility_score DECIMAL(2,1) COMMENT '责任心',
    innovation_score DECIMAL(2,1) COMMENT '创新能力',
    
    -- 总分和评价
    total_score DECIMAL(3,1) COMMENT '总分',
    strengths TEXT COMMENT '优点/亮点',
    improvements TEXT COMMENT '改进建议',
    overall_comment TEXT COMMENT '综合评价',
    
    -- 元数据
    is_anonymous BOOLEAN DEFAULT FALSE COMMENT '是否匿名提交',
    submitted_at TIMESTAMP COMMENT '提交时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (relationship_id) REFERENCES review_relationships(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE,
    INDEX idx_cycle (cycle_id),
    INDEX idx_reviewer (reviewer_id),
    INDEX idx_reviewee (reviewee_id),
    INDEX idx_submitted (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='互评记录表';

-- 4. 互评统计表 (review_statistics)
-- 聚合统计数据，用于快速查询
CREATE TABLE IF NOT EXISTS review_statistics (
    id SERIAL PRIMARY KEY,
    cycle_id INT NOT NULL COMMENT '互评周期ID',
    reviewee_id INT NOT NULL COMMENT '被评价人ID',
    
    -- 统计数据
    total_reviews INT DEFAULT 0 COMMENT '总评价数',
    completed_reviews INT DEFAULT 0 COMMENT '已完成数',
    avg_teamwork DECIMAL(3,2) COMMENT '团队协作平均分',
    avg_communication DECIMAL(3,2) COMMENT '沟通能力平均分',
    avg_professional DECIMAL(3,2) COMMENT '专业能力平均分',
    avg_responsibility DECIMAL(3,2) COMMENT '责任心平均分',
    avg_innovation DECIMAL(3,2) COMMENT '创新能力平均分',
    avg_total_score DECIMAL(3,2) COMMENT '总分平均分',
    
    -- 元数据
    last_calculated_at TIMESTAMP COMMENT '最后计算时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE,
    UNIQUE KEY uk_cycle_reviewee (cycle_id, reviewee_id),
    INDEX idx_avg_score (avg_total_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='互评统计表';

-- 5. 添加触发器：自动更新统计数据
DELIMITER //

CREATE TRIGGER after_peer_review_insert
AFTER INSERT ON peer_reviews
FOR EACH ROW
BEGIN
    -- 更新或插入统计数据
    INSERT INTO review_statistics (
        cycle_id, 
        reviewee_id, 
        total_reviews,
        completed_reviews,
        avg_teamwork,
        avg_communication,
        avg_professional,
        avg_responsibility,
        avg_innovation,
        avg_total_score,
        last_calculated_at
    )
    SELECT 
        NEW.cycle_id,
        NEW.reviewee_id,
        COUNT(*),
        SUM(CASE WHEN submitted_at IS NOT NULL THEN 1 ELSE 0 END),
        AVG(teamwork_score),
        AVG(communication_score),
        AVG(professional_score),
        AVG(responsibility_score),
        AVG(innovation_score),
        AVG(total_score),
        NOW()
    FROM peer_reviews
    WHERE cycle_id = NEW.cycle_id AND reviewee_id = NEW.reviewee_id
    ON DUPLICATE KEY UPDATE
        total_reviews = VALUES(total_reviews),
        completed_reviews = VALUES(completed_reviews),
        avg_teamwork = VALUES(avg_teamwork),
        avg_communication = VALUES(avg_communication),
        avg_professional = VALUES(avg_professional),
        avg_responsibility = VALUES(avg_responsibility),
        avg_innovation = VALUES(avg_innovation),
        avg_total_score = VALUES(avg_total_score),
        last_calculated_at = NOW();
END//

CREATE TRIGGER after_peer_review_update
AFTER UPDATE ON peer_reviews
FOR EACH ROW
BEGIN
    -- 更新统计数据
    INSERT INTO review_statistics (
        cycle_id, 
        reviewee_id, 
        total_reviews,
        completed_reviews,
        avg_teamwork,
        avg_communication,
        avg_professional,
        avg_responsibility,
        avg_innovation,
        avg_total_score,
        last_calculated_at
    )
    SELECT 
        NEW.cycle_id,
        NEW.reviewee_id,
        COUNT(*),
        SUM(CASE WHEN submitted_at IS NOT NULL THEN 1 ELSE 0 END),
        AVG(teamwork_score),
        AVG(communication_score),
        AVG(professional_score),
        AVG(responsibility_score),
        AVG(innovation_score),
        AVG(total_score),
        NOW()
    FROM peer_reviews
    WHERE cycle_id = NEW.cycle_id AND reviewee_id = NEW.reviewee_id
    ON DUPLICATE KEY UPDATE
        total_reviews = VALUES(total_reviews),
        completed_reviews = VALUES(completed_reviews),
        avg_teamwork = VALUES(avg_teamwork),
        avg_communication = VALUES(avg_communication),
        avg_professional = VALUES(avg_professional),
        avg_responsibility = VALUES(avg_responsibility),
        avg_innovation = VALUES(avg_innovation),
        avg_total_score = VALUES(avg_total_score),
        last_calculated_at = NOW();
END//

DELIMITER ;

-- 6. 插入示例数据（可选，用于测试）
-- INSERT INTO review_cycles (name, description, start_date, end_date, status, review_type) 
-- VALUES 
-- ('2026-Q1同事互评', '第一季度360度互评', '2026-03-01', '2026-03-15', 'active', 'peer'),
-- ('2026年度上级评价', '年度下属评上级', '2026-03-01', '2026-03-10', 'active', 'upward');
