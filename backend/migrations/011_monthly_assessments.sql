-- Migration: 011_monthly_assessments
-- Description: 月度差异化考核评分表
-- Created: 2026-03-01

-- PostgreSQL 版本
-- 月度考核评分表
CREATE TABLE IF NOT EXISTS monthly_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    month VARCHAR(7) NOT NULL,  -- YYYY-MM
    template_id UUID NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    department_type VARCHAR(50) NOT NULL,
    scores JSONB NOT NULL,  -- [{metricName, metricCode, weight, level, score, comment}]
    total_score DECIMAL(5,2) NOT NULL,
    evaluator_id VARCHAR(50) NOT NULL,
    evaluator_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    CONSTRAINT monthly_assessments_employee_month_unique UNIQUE (employee_id, month)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_employee ON monthly_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_month ON monthly_assessments(month);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_dept_type ON monthly_assessments(department_type);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_template ON monthly_assessments(template_id);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_evaluator ON monthly_assessments(evaluator_id);

-- 添加注释
COMMENT ON TABLE monthly_assessments IS '月度差异化考核评分记录';
COMMENT ON COLUMN monthly_assessments.employee_id IS '员工ID';
COMMENT ON COLUMN monthly_assessments.month IS '考核月份 (YYYY-MM)';
COMMENT ON COLUMN monthly_assessments.template_id IS '使用的考核模板ID';
COMMENT ON COLUMN monthly_assessments.template_name IS '模板名称';
COMMENT ON COLUMN monthly_assessments.department_type IS '部门类型 (sales/engineering/manufacturing/support/management)';
COMMENT ON COLUMN monthly_assessments.scores IS '各指标评分详情 (JSON数组)';
COMMENT ON COLUMN monthly_assessments.total_score IS '加权总分';
COMMENT ON COLUMN monthly_assessments.evaluator_id IS '评分人ID';
COMMENT ON COLUMN monthly_assessments.evaluator_name IS '评分人姓名';

-- MySQL 版本 (在注释中提供)
/*
-- MySQL 版本
CREATE TABLE IF NOT EXISTS monthly_assessments (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    month VARCHAR(7) NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    department_type VARCHAR(50) NOT NULL,
    scores JSON NOT NULL,
    total_score DECIMAL(5,2) NOT NULL,
    evaluator_id VARCHAR(50) NOT NULL,
    evaluator_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_employee_month (employee_id, month),
    INDEX idx_employee (employee_id),
    INDEX idx_month (month),
    INDEX idx_dept_type (department_type),
    INDEX idx_template (template_id),
    INDEX idx_evaluator (evaluator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='月度差异化考核评分记录';
*/
