-- Phase 2: 360度互评系统
-- 创建时间: 2026-03-01
-- 描述: 支持同事互评、下属评上级、跨部门协作评价

-- 1. 互评周期表 (review_cycles)
CREATE TABLE IF NOT EXISTS review_cycles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    review_type VARCHAR(50) NOT NULL DEFAULT 'peer',
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);
CREATE INDEX IF NOT EXISTS idx_review_cycles_dates ON review_cycles(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_review_cycles_type ON review_cycles(review_type);

COMMENT ON TABLE review_cycles IS '互评周期表';
COMMENT ON COLUMN review_cycles.name IS '周期名称，如"2026-Q1互评"';
COMMENT ON COLUMN review_cycles.description IS '周期描述';
COMMENT ON COLUMN review_cycles.start_date IS '开始日期';
COMMENT ON COLUMN review_cycles.end_date IS '结束日期';
COMMENT ON COLUMN review_cycles.status IS '状态: draft/active/closed';
COMMENT ON COLUMN review_cycles.review_type IS '互评类型: peer/upward/cross';
COMMENT ON COLUMN review_cycles.is_anonymous IS '是否匿名评价';
COMMENT ON COLUMN review_cycles.created_by IS '创建人ID';

-- 2. 评价关系表 (review_relationships)
CREATE TABLE IF NOT EXISTS review_relationships (
    id SERIAL PRIMARY KEY,
    cycle_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewee_id INT NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    department_id INT,
    weight DECIMAL(3,2) DEFAULT 1.00,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE,
    UNIQUE (cycle_id, reviewer_id, reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_review_rel_reviewer ON review_relationships(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_rel_reviewee ON review_relationships(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_review_rel_status ON review_relationships(status);

COMMENT ON TABLE review_relationships IS '评价关系表';
COMMENT ON COLUMN review_relationships.cycle_id IS '互评周期ID';
COMMENT ON COLUMN review_relationships.reviewer_id IS '评价人ID';
COMMENT ON COLUMN review_relationships.reviewee_id IS '被评价人ID';
COMMENT ON COLUMN review_relationships.relationship_type IS '关系类型: peer/manager/subordinate/cross_dept';
COMMENT ON COLUMN review_relationships.department_id IS '所属部门ID';
COMMENT ON COLUMN review_relationships.weight IS '评价权重 0-1';
COMMENT ON COLUMN review_relationships.status IS '状态: pending/completed';

-- 3. 互评记录表 (peer_reviews)
CREATE TABLE IF NOT EXISTS peer_reviews (
    id SERIAL PRIMARY KEY,
    relationship_id INT NOT NULL,
    cycle_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewee_id INT NOT NULL,

    teamwork_score DECIMAL(2,1),
    communication_score DECIMAL(2,1),
    professional_score DECIMAL(2,1),
    responsibility_score DECIMAL(2,1),
    innovation_score DECIMAL(2,1),

    total_score DECIMAL(3,1),
    strengths TEXT,
    improvements TEXT,
    overall_comment TEXT,

    is_anonymous BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (relationship_id) REFERENCES review_relationships(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_peer_reviews_cycle ON peer_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer ON peer_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewee ON peer_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_submitted ON peer_reviews(submitted_at);

COMMENT ON TABLE peer_reviews IS '互评记录表';
COMMENT ON COLUMN peer_reviews.relationship_id IS '评价关系ID';
COMMENT ON COLUMN peer_reviews.cycle_id IS '互评周期ID';
COMMENT ON COLUMN peer_reviews.reviewer_id IS '评价人ID';
COMMENT ON COLUMN peer_reviews.reviewee_id IS '被评价人ID';
COMMENT ON COLUMN peer_reviews.teamwork_score IS '团队协作 1.0-5.0';
COMMENT ON COLUMN peer_reviews.communication_score IS '沟通能力';
COMMENT ON COLUMN peer_reviews.professional_score IS '专业能力';
COMMENT ON COLUMN peer_reviews.responsibility_score IS '责任心';
COMMENT ON COLUMN peer_reviews.innovation_score IS '创新能力';
COMMENT ON COLUMN peer_reviews.total_score IS '总分';
COMMENT ON COLUMN peer_reviews.strengths IS '优点/亮点';
COMMENT ON COLUMN peer_reviews.improvements IS '改进建议';
COMMENT ON COLUMN peer_reviews.overall_comment IS '综合评价';
COMMENT ON COLUMN peer_reviews.is_anonymous IS '是否匿名提交';
COMMENT ON COLUMN peer_reviews.submitted_at IS '提交时间';

-- 4. 互评统计表 (review_statistics)
CREATE TABLE IF NOT EXISTS review_statistics (
    id SERIAL PRIMARY KEY,
    cycle_id INT NOT NULL,
    reviewee_id INT NOT NULL,

    total_reviews INT DEFAULT 0,
    completed_reviews INT DEFAULT 0,
    avg_teamwork DECIMAL(3,2),
    avg_communication DECIMAL(3,2),
    avg_professional DECIMAL(3,2),
    avg_responsibility DECIMAL(3,2),
    avg_innovation DECIMAL(3,2),
    avg_total_score DECIMAL(3,2),

    last_calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE,
    UNIQUE (cycle_id, reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_review_stats_avg ON review_statistics(avg_total_score);

COMMENT ON TABLE review_statistics IS '互评统计表';
COMMENT ON COLUMN review_statistics.cycle_id IS '互评周期ID';
COMMENT ON COLUMN review_statistics.reviewee_id IS '被评价人ID';
COMMENT ON COLUMN review_statistics.total_reviews IS '总评价数';
COMMENT ON COLUMN review_statistics.completed_reviews IS '已完成数';
COMMENT ON COLUMN review_statistics.avg_teamwork IS '团队协作平均分';
COMMENT ON COLUMN review_statistics.avg_communication IS '沟通能力平均分';
COMMENT ON COLUMN review_statistics.avg_professional IS '专业能力平均分';
COMMENT ON COLUMN review_statistics.avg_responsibility IS '责任心平均分';
COMMENT ON COLUMN review_statistics.avg_innovation IS '创新能力平均分';
COMMENT ON COLUMN review_statistics.avg_total_score IS '总分平均分';
COMMENT ON COLUMN review_statistics.last_calculated_at IS '最后计算时间';

-- 5. 触发器函数：自动更新统计数据
CREATE OR REPLACE FUNCTION fn_update_review_statistics()
RETURNS TRIGGER AS $$
BEGIN
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
    ON CONFLICT (cycle_id, reviewee_id) DO UPDATE SET
        total_reviews = EXCLUDED.total_reviews,
        completed_reviews = EXCLUDED.completed_reviews,
        avg_teamwork = EXCLUDED.avg_teamwork,
        avg_communication = EXCLUDED.avg_communication,
        avg_professional = EXCLUDED.avg_professional,
        avg_responsibility = EXCLUDED.avg_responsibility,
        avg_innovation = EXCLUDED.avg_innovation,
        avg_total_score = EXCLUDED.avg_total_score,
        last_calculated_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_peer_review_insert
AFTER INSERT ON peer_reviews
FOR EACH ROW EXECUTE FUNCTION fn_update_review_statistics();

CREATE TRIGGER after_peer_review_update
AFTER UPDATE ON peer_reviews
FOR EACH ROW EXECUTE FUNCTION fn_update_review_statistics();
