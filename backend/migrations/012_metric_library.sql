-- Metric Library tables for the performance management system
-- Idempotent: uses IF NOT EXISTS

-- 指标主表
CREATE TABLE IF NOT EXISTS performance_metrics (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  category VARCHAR(50),
  type VARCHAR(30),
  description TEXT,
  weight DECIMAL(5,2) DEFAULT 0,
  formula TEXT,
  unit VARCHAR(50),
  target_value DECIMAL(10,2),
  min_value DECIMAL(10,2),
  max_value DECIMAL(10,2),
  data_source VARCHAR(200),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_category ON performance_metrics(category);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_status ON performance_metrics(status);

-- 评分标准
CREATE TABLE IF NOT EXISTS scoring_criteria (
  id VARCHAR(36) PRIMARY KEY,
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  level VARCHAR(10) NOT NULL,
  score DECIMAL(3,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scoring_criteria_metric_id ON scoring_criteria(metric_id);

-- 指标-部门关联
CREATE TABLE IF NOT EXISTS metric_departments (
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  department_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (metric_id, department_id)
);

-- 指标-岗位关联
CREATE TABLE IF NOT EXISTS metric_positions (
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  position_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (metric_id, position_id)
);

-- 指标-级别关联
CREATE TABLE IF NOT EXISTS metric_levels (
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  level VARCHAR(50) NOT NULL,
  PRIMARY KEY (metric_id, level)
);

-- 指标模板
CREATE TABLE IF NOT EXISTS metric_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  position_id VARCHAR(36) REFERENCES positions(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metric_templates_position ON metric_templates(position_id);
CREATE INDEX IF NOT EXISTS idx_metric_templates_status ON metric_templates(status);

-- 模板-指标关联
CREATE TABLE IF NOT EXISTS metric_template_metrics (
  template_id VARCHAR(36) NOT NULL REFERENCES metric_templates(id) ON DELETE CASCADE,
  metric_id VARCHAR(36) NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) DEFAULT 0,
  required BOOLEAN DEFAULT true,
  PRIMARY KEY (template_id, metric_id)
);
