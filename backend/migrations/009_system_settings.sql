-- 系统配置表
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string', -- string/boolean/number/json
  category VARCHAR(50), -- general/performance/notification/security
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- 是否对所有用户可见
  updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
('company_name', 'ATE Technology', 'string', 'general', '公司名称', TRUE),
('score_scale', 'L1-L5', 'string', 'performance', '评分制度', TRUE),
('enable_360_review', 'true', 'boolean', 'performance', '启用360度评价（同事互评）', FALSE),
('360_review_mode', 'optional', 'string', 'performance', '360评价模式: required(必填)/optional(可选)/disabled(禁用)', FALSE),
('360_review_min_reviewers', '2', 'number', 'performance', '360评价最少评价人数', FALSE),
('360_review_max_reviewers', '5', 'number', 'performance', '360评价最多评价人数', FALSE),
('360_review_frequency', 'quarterly', 'string', 'performance', '360评价频率: monthly/quarterly/yearly', FALSE),
('auto_assign_360_tasks', 'true', 'boolean', 'performance', '自动分配360评价任务', FALSE),
('notification_enabled', 'true', 'boolean', 'notification', '启用系统通知', TRUE),
('assessment_publication_enabled', 'true', 'boolean', 'performance', '启用考核结果发布功能', FALSE);

-- 创建索引
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- 添加更新时间自动更新触发器
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_updated_at();

COMMENT ON TABLE system_settings IS '系统配置表';
COMMENT ON COLUMN system_settings.setting_key IS '配置键（唯一）';
COMMENT ON COLUMN system_settings.setting_value IS '配置值';
COMMENT ON COLUMN system_settings.setting_type IS '值类型：string/boolean/number/json';
COMMENT ON COLUMN system_settings.category IS '配置分类';
COMMENT ON COLUMN system_settings.is_public IS '是否对所有用户可见（前端可读取）';
