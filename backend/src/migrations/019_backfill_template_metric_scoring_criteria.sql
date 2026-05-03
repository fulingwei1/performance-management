INSERT INTO metric_scoring_criteria (
  id,
  metric_id,
  level,
  score,
  description,
  min_value,
  max_value
)
SELECT
  md5(tm.id || criteria.level),
  tm.id,
  criteria.level,
  criteria.score,
  criteria.description,
  NULL,
  NULL
FROM template_metrics tm
CROSS JOIN (
  VALUES
    ('L1', 0.5, '不合格：结果明显低于要求，影响工作交付，需要重点辅导和限期改进'),
    ('L2', 0.8, '待改进：部分达到要求，但质量、进度或主动性存在明显不足'),
    ('L3', 1.0, '合格：基本达到岗位要求和本月目标，工作结果稳定可接受'),
    ('L4', 1.2, '良好：超过岗位要求，能主动推动问题解决，交付质量较高'),
    ('L5', 1.5, '优秀：显著超出预期，形成标杆成果或可复用经验，对团队有明显贡献')
) AS criteria(level, score, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM metric_scoring_criteria existing
  WHERE existing.metric_id = tm.id
    AND existing.level = criteria.level
);
