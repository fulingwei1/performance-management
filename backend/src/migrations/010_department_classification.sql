-- Migration 010: 部门分类和考核模板系统
-- Created: 2026-03-01
-- Purpose: 支持差异化考核

-- ============================================
-- 1. 部门表增加分类字段
-- ============================================

-- 检查 department_type 列是否存在，不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'departments' AND column_name = 'department_type'
    ) THEN
        ALTER TABLE departments 
        ADD COLUMN department_type VARCHAR(20) DEFAULT 'support';
    END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN departments.department_type IS '部门类型: sales(销售), engineering(工程), manufacturing(生产), support(支持), management(管理)';

-- 检查 use_custom_kpi 列是否存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'departments' AND column_name = 'use_custom_kpi'
    ) THEN
        ALTER TABLE departments 
        ADD COLUMN use_custom_kpi BOOLEAN DEFAULT false;
    END IF;
END $$;

COMMENT ON COLUMN departments.use_custom_kpi IS '是否使用自定义考核指标（false=使用类型默认模板）';

-- ============================================
-- 2. 考核模板表
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    department_type VARCHAR(20) NOT NULL,  -- 适用部门类型
    is_default BOOLEAN DEFAULT false,       -- 是否为该类型的默认模板
    status VARCHAR(20) DEFAULT 'active',    -- active/archived
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE assessment_templates IS '考核模板表';
COMMENT ON COLUMN assessment_templates.department_type IS '适用部门类型: sales/engineering/manufacturing/support/management';
COMMENT ON COLUMN assessment_templates.is_default IS '是否为该类型的默认模板（每种类型只能有一个默认）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_templates_dept_type ON assessment_templates(department_type);
CREATE INDEX IF NOT EXISTS idx_templates_status ON assessment_templates(status);

-- ============================================
-- 3. 模板指标表
-- ============================================

CREATE TABLE IF NOT EXISTS template_metrics (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_code VARCHAR(50) NOT NULL,
    category VARCHAR(50),               -- performance/behavior/innovation/collaboration
    weight DECIMAL(5,2) NOT NULL,       -- 权重（百分比）
    description TEXT,
    evaluation_type VARCHAR(20),        -- quantitative/qualitative
    target_value DECIMAL(10,2),         -- 目标值（可选）
    measurement_unit VARCHAR(50),       -- 度量单位（如：%、件、小时）
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT weight_range CHECK (weight >= 0 AND weight <= 100)
);

COMMENT ON TABLE template_metrics IS '模板考核指标表';
COMMENT ON COLUMN template_metrics.evaluation_type IS '评估类型: quantitative(量化)/qualitative(定性)';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_template_metrics_template ON template_metrics(template_id);
CREATE INDEX IF NOT EXISTS idx_template_metrics_code ON template_metrics(metric_code);

-- ============================================
-- 4. 指标评分标准表
-- ============================================

CREATE TABLE IF NOT EXISTS metric_scoring_criteria (
    id VARCHAR(36) PRIMARY KEY,
    metric_id VARCHAR(36) NOT NULL REFERENCES template_metrics(id) ON DELETE CASCADE,
    level VARCHAR(10) NOT NULL,         -- L1/L2/L3/L4/L5
    score DECIMAL(3,2) NOT NULL,        -- 得分系数（0.5-1.5）
    description TEXT NOT NULL,          -- 评分说明
    min_value DECIMAL(10,2),            -- 最小值（量化指标用）
    max_value DECIMAL(10,2),            -- 最大值（量化指标用）
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT score_range CHECK (score >= 0.5 AND score <= 1.5)
);

COMMENT ON TABLE metric_scoring_criteria IS '指标评分标准表';
COMMENT ON COLUMN metric_scoring_criteria.level IS '评分等级: L1(0.5) - L5(1.5)';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_metric ON metric_scoring_criteria(metric_id);

-- ============================================
-- 5. 部门模板关联表
-- ============================================

CREATE TABLE IF NOT EXISTS department_templates (
    id VARCHAR(36) PRIMARY KEY,
    department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    template_id VARCHAR(36) NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,  -- 生效日期
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(department_id, template_id)
);

COMMENT ON TABLE department_templates IS '部门与模板关联表';
COMMENT ON COLUMN department_templates.effective_date IS '模板生效日期（支持未来切换）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dept_templates_dept ON department_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_templates_template ON department_templates(template_id);

-- ============================================
-- 6. 插入默认模板
-- ============================================

-- 销售部门模板
INSERT INTO assessment_templates (id, name, description, department_type, is_default)
VALUES (
    'template-sales-001',
    '销售部门标准模板',
    '适用于销售岗位的考核模板：业绩导向，70%量化指标+30%行为指标',
    'sales',
    true
) ON CONFLICT DO NOTHING;

-- 销售模板指标
INSERT INTO template_metrics (id, template_id, metric_name, metric_code, category, weight, description, evaluation_type, sort_order)
VALUES 
    ('metric-sales-001', 'template-sales-001', '销售额完成率', 'SALES_COMPLETION', 'performance', 30.00, '实际销售额/目标销售额', 'quantitative', 1),
    ('metric-sales-002', 'template-sales-001', '回款率', 'PAYMENT_RATE', 'performance', 20.00, '实际回款/应收款项', 'quantitative', 2),
    ('metric-sales-003', 'template-sales-001', '新客户开发', 'NEW_CLIENTS', 'performance', 10.00, '新增有效客户数量', 'quantitative', 3),
    ('metric-sales-004', 'template-sales-001', '客户满意度', 'CLIENT_SATISFACTION', 'performance', 10.00, '客户满意度调查得分', 'quantitative', 4),
    ('metric-sales-005', 'template-sales-001', '客户关系维护', 'CLIENT_RELATIONSHIP', 'behavior', 10.00, '客户拜访频率、关系维护质量', 'qualitative', 5),
    ('metric-sales-006', 'template-sales-001', '团队协作', 'TEAMWORK', 'collaboration', 10.00, '跨部门协作、信息共享', 'qualitative', 6),
    ('metric-sales-007', 'template-sales-001', '专业能力提升', 'SKILL_DEVELOPMENT', 'behavior', 10.00, '产品知识、销售技巧提升', 'qualitative', 7)
ON CONFLICT DO NOTHING;

-- 工程技术部门模板
INSERT INTO assessment_templates (id, name, description, department_type, is_default)
VALUES (
    'template-engineering-001',
    '工程技术部门标准模板',
    '适用于工程技术岗位：项目交付50%+技术能力30%+协作成长20%',
    'engineering',
    true
) ON CONFLICT DO NOTHING;

-- 工程模板指标
INSERT INTO template_metrics (id, template_id, metric_name, metric_code, category, weight, description, evaluation_type, sort_order)
VALUES 
    ('metric-eng-001', 'template-engineering-001', '项目按时完成率', 'PROJECT_ONTIME_RATE', 'performance', 20.00, '按时交付项目数/总项目数', 'quantitative', 1),
    ('metric-eng-002', 'template-engineering-001', '一次验收通过率', 'FIRST_PASS_RATE', 'performance', 15.00, '一次验收通过数/总验收数', 'quantitative', 2),
    ('metric-eng-003', 'template-engineering-001', '技术方案合理性', 'SOLUTION_QUALITY', 'performance', 15.00, '方案设计质量、可行性评估', 'qualitative', 3),
    ('metric-eng-004', 'template-engineering-001', '技术难题解决能力', 'PROBLEM_SOLVING', 'innovation', 15.00, '攻克技术难题的能力', 'qualitative', 4),
    ('metric-eng-005', 'template-engineering-001', '创新贡献', 'INNOVATION', 'innovation', 10.00, '专利、技术改进提案', 'quantitative', 5),
    ('metric-eng-006', 'template-engineering-001', '技术文档完整性', 'DOCUMENTATION', 'performance', 5.00, '技术文档的完整性和规范性', 'qualitative', 6),
    ('metric-eng-007', 'template-engineering-001', '跨部门协作', 'CROSS_TEAM_COLLABORATION', 'collaboration', 10.00, '与其他部门的协作配合', 'qualitative', 7),
    ('metric-eng-008', 'template-engineering-001', '技术分享与培训', 'KNOWLEDGE_SHARING', 'collaboration', 10.00, '技术分享次数和质量', 'quantitative', 8)
ON CONFLICT DO NOTHING;

-- 生产制造部门模板
INSERT INTO assessment_templates (id, name, description, department_type, is_default)
VALUES (
    'template-manufacturing-001',
    '生产制造部门标准模板',
    '适用于生产制造岗位：效率40%+质量安全40%+现场管理20%',
    'manufacturing',
    true
) ON CONFLICT DO NOTHING;

-- 生产模板指标
INSERT INTO template_metrics (id, template_id, metric_name, metric_code, category, weight, description, evaluation_type, sort_order)
VALUES 
    ('metric-mfg-001', 'template-manufacturing-001', '产量完成率', 'OUTPUT_COMPLETION', 'performance', 20.00, '实际产量/目标产量', 'quantitative', 1),
    ('metric-mfg-002', 'template-manufacturing-001', '生产效率', 'PRODUCTION_EFFICIENCY', 'performance', 10.00, '单位时间产出', 'quantitative', 2),
    ('metric-mfg-003', 'template-manufacturing-001', '设备利用率', 'EQUIPMENT_UTILIZATION', 'performance', 10.00, '设备有效运转时间占比', 'quantitative', 3),
    ('metric-mfg-004', 'template-manufacturing-001', '产品合格率', 'QUALITY_RATE', 'performance', 20.00, '合格产品数/总产品数', 'quantitative', 4),
    ('metric-mfg-005', 'template-manufacturing-001', '安全事故率', 'SAFETY_INCIDENT_RATE', 'performance', 15.00, '安全事故次数（零事故=满分）', 'quantitative', 5),
    ('metric-mfg-006', 'template-manufacturing-001', '物料损耗率', 'MATERIAL_LOSS_RATE', 'performance', 5.00, '物料浪费比例', 'quantitative', 6),
    ('metric-mfg-007', 'template-manufacturing-001', '5S现场管理', '5S_MANAGEMENT', 'behavior', 10.00, '现场整理整顿清扫清洁素养', 'qualitative', 7),
    ('metric-mfg-008', 'template-manufacturing-001', '团队协作', 'TEAMWORK', 'collaboration', 10.00, '班组协作、互帮互助', 'qualitative', 8)
ON CONFLICT DO NOTHING;

-- 支持部门模板
INSERT INTO assessment_templates (id, name, description, department_type, is_default)
VALUES (
    'template-support-001',
    '支持部门标准模板',
    '适用于财务、人事、行政、采购等支持岗位：质量50%+服务30%+能力20%',
    'support',
    true
) ON CONFLICT DO NOTHING;

-- 支持部门模板指标
INSERT INTO template_metrics (id, template_id, metric_name, metric_code, category, weight, description, evaluation_type, sort_order)
VALUES 
    ('metric-sup-001', 'template-support-001', '工作准确率', 'ACCURACY_RATE', 'performance', 25.00, '工作无差错率', 'quantitative', 1),
    ('metric-sup-002', 'template-support-001', '工作及时性', 'TIMELINESS', 'performance', 15.00, '按时完成率', 'quantitative', 2),
    ('metric-sup-003', 'template-support-001', '合规性', 'COMPLIANCE', 'performance', 10.00, '制度执行、无违规', 'qualitative', 3),
    ('metric-sup-004', 'template-support-001', '内部客户满意度', 'INTERNAL_SATISFACTION', 'performance', 15.00, '内部客户评价得分', 'quantitative', 4),
    ('metric-sup-005', 'template-support-001', '响应速度', 'RESPONSE_SPEED', 'behavior', 10.00, '问题响应时效', 'quantitative', 5),
    ('metric-sup-006', 'template-support-001', '主动服务意识', 'PROACTIVE_SERVICE', 'behavior', 5.00, '主动发现问题、提供支持', 'qualitative', 6),
    ('metric-sup-007', 'template-support-001', '专业知识运用', 'PROFESSIONAL_SKILL', 'performance', 10.00, '专业能力应用', 'qualitative', 7),
    ('metric-sup-008', 'template-support-001', '流程优化建议', 'PROCESS_IMPROVEMENT', 'innovation', 5.00, '改进提案数量和质量', 'quantitative', 8),
    ('metric-sup-009', 'template-support-001', '跨部门协作', 'CROSS_DEPT_COLLABORATION', 'collaboration', 5.00, '跨部门配合', 'qualitative', 9)
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. 更新现有部门类型（根据实际情况）
-- ============================================

-- 示例：根据部门名称设置类型
UPDATE departments SET department_type = 'sales' WHERE name LIKE '%营销%' OR name LIKE '%销售%';
UPDATE departments SET department_type = 'engineering' WHERE name LIKE '%工程%' OR name LIKE '%技术%' OR name LIKE '%研发%';
UPDATE departments SET department_type = 'manufacturing' WHERE name LIKE '%制造%' OR name LIKE '%生产%' OR name LIKE '%品质%';
UPDATE departments SET department_type = 'support' WHERE name LIKE '%财务%' OR name LIKE '%人力%' OR name LIKE '%行政%' OR name LIKE '%采购%';
UPDATE departments SET department_type = 'management' WHERE name LIKE '%总%' OR name LIKE '%管理%';

-- ============================================
-- 8. 验证数据
-- ============================================

-- 检查部门类型分布
SELECT department_type, COUNT(*) as count 
FROM departments 
GROUP BY department_type;

-- 检查模板数量
SELECT department_type, COUNT(*) as count 
FROM assessment_templates 
GROUP BY department_type;

-- 检查指标数量
SELECT t.department_type, COUNT(m.id) as metric_count
FROM assessment_templates t
LEFT JOIN template_metrics m ON t.id = m.template_id
GROUP BY t.department_type;
