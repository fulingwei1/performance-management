-- AI使用日志表
-- 记录每次AI调用的详细信息，用于统计和成本控制

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_name VARCHAR(100),  -- 冗余字段，方便查询
  feature_type VARCHAR(50) NOT NULL,  -- 功能类型: 'self-summary', 'next-month-plan', 'manager-comment', 'work-arrangement'
  tokens_used INTEGER DEFAULT 0,  -- 使用的token数
  cost_yuan DECIMAL(10, 6) DEFAULT 0,  -- 成本（元）
  success BOOLEAN DEFAULT true,  -- 是否成功
  error_message TEXT,  -- 错误信息（如果失败）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引优化查询
CREATE INDEX idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_feature ON ai_usage_logs(feature_type);

-- 用户使用统计视图
CREATE OR REPLACE VIEW ai_usage_stats AS
SELECT 
  u.id as user_id,
  u.name as user_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  SUM(tokens_used) as total_tokens,
  SUM(cost_yuan) as total_cost,
  MAX(created_at) as last_used_at
FROM users u
LEFT JOIN ai_usage_logs l ON u.id = l.user_id
GROUP BY u.id, u.name;

COMMENT ON TABLE ai_usage_logs IS 'AI功能使用日志';
COMMENT ON COLUMN ai_usage_logs.feature_type IS '功能类型: self-summary(员工自评), next-month-plan(下月计划), manager-comment(经理评价), work-arrangement(工作安排)';
COMMENT ON COLUMN ai_usage_logs.cost_yuan IS '单次调用成本（元），Kimi API约0.0015-0.003元/次';
