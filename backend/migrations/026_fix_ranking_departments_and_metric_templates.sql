-- 修复线上错误默认排名配置、重复部门，以及指标模板空数据。

-- 1) 排名配置：历史误配置只包含“项目管理部”时，恢复为默认全员参与（排除模式）。
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public)
VALUES (
  'performance_ranking_config',
  '{"version":1,"participation":{"mode":"exclude","enabledUnitKeys":[],"includedUnitKeys":[],"excludedUnitKeys":[],"includedEmployeeIds":[],"excludedEmployeeIds":[]},"groupRank":{"defaultStrategy":{"type":"by_high_low"},"perUnit":{}},"templateAssignments":{},"mergeRankGroups":[]}',
  'json',
  'performance',
  '绩效参与范围与排名规则配置',
  FALSE
)
ON CONFLICT (setting_key) DO NOTHING;

UPDATE system_settings
SET setting_value = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        setting_value::jsonb,
        '{participation,mode}',
        '"exclude"'::jsonb,
        true
      ),
      '{participation,enabledUnitKeys}',
      '[]'::jsonb,
      true
    ),
    '{participation,includedUnitKeys}',
    '[]'::jsonb,
    true
  ),
  '{participation,includedEmployeeIds}',
  '[]'::jsonb,
  true
)::text,
updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'performance_ranking_config'
  AND setting_type = 'json'
  AND setting_value::jsonb #>> '{participation,mode}' = 'include'
  AND (
    COALESCE(setting_value::jsonb #> '{participation,includedUnitKeys}', '[]'::jsonb) = '["项目管理部"]'::jsonb
    OR COALESCE(setting_value::jsonb #> '{participation,enabledUnitKeys}', '[]'::jsonb) = '["项目管理部"]'::jsonb
  );

-- 2) 部门去重：同一父部门下同名 active 部门保留最早/排序最前的一条，其余转为 inactive，并把子部门/岗位引用迁移到保留记录。
WITH ranked_departments AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY COALESCE(parent_id, ''), lower(trim(name))
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(parent_id, ''), lower(trim(name))
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS rn
  FROM departments
  WHERE name IS NOT NULL AND trim(name) <> ''
)
UPDATE departments child
SET parent_id = ranked_departments.keep_id,
    updated_at = CURRENT_TIMESTAMP
FROM ranked_departments
WHERE child.parent_id = ranked_departments.id
  AND ranked_departments.rn > 1
  AND child.parent_id <> ranked_departments.keep_id;

WITH ranked_departments AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY COALESCE(parent_id, ''), lower(trim(name))
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(parent_id, ''), lower(trim(name))
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS rn
  FROM departments
  WHERE name IS NOT NULL AND trim(name) <> ''
)
UPDATE positions p
SET department_id = ranked_departments.keep_id,
    updated_at = CURRENT_TIMESTAMP
FROM ranked_departments
WHERE p.department_id = ranked_departments.id
  AND ranked_departments.rn > 1
  AND p.department_id <> ranked_departments.keep_id;

WITH ranked_departments AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(parent_id, ''), lower(trim(name))
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS rn
  FROM departments
  WHERE name IS NOT NULL AND trim(name) <> ''
)
UPDATE departments d
SET status = 'inactive',
    updated_at = CURRENT_TIMESTAMP
FROM ranked_departments
WHERE d.id = ranked_departments.id
  AND ranked_departments.rn > 1
  AND d.status = 'active';

-- 3) 指标库默认模板，避免 /api/metrics/templates 返回空数组。
INSERT INTO performance_metrics (
  id, name, code, category, type, description, weight, unit, min_value, max_value, status
) VALUES
  ('metric-task-completion', '任务完成率', 'TASK_COMPLETION', 'performance', 'quantitative', '按时完成任务的质量和数量', 40, '%', 0, 150, 'active'),
  ('metric-initiative', '工作主动性', 'INITIATIVE', 'attitude', 'qualitative', '主动承担责任和解决问题的态度', 30, NULL, 0.5, 1.5, 'active'),
  ('metric-quality', '工作质量', 'QUALITY', 'performance', 'qualitative', '工作成果的准确性和规范性', 30, NULL, 0.5, 1.5, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO metric_templates (id, name, description, position_id, status)
VALUES
  ('metric-template-standard', '通用绩效指标模板', '用于未配置专用模板岗位的默认指标组合。', NULL, 'active'),
  ('metric-template-junior', '初级/助理成长指标模板', '强化任务质量、规范执行和学习成长，适用于初级与助理员工。', NULL, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES
  ('metric-template-standard', 'metric-task-completion', 40, TRUE),
  ('metric-template-standard', 'metric-initiative', 30, TRUE),
  ('metric-template-standard', 'metric-quality', 30, TRUE),
  ('metric-template-junior', 'metric-task-completion', 35, TRUE),
  ('metric-template-junior', 'metric-quality', 40, TRUE),
  ('metric-template-junior', 'metric-initiative', 25, TRUE)
ON CONFLICT (template_id, metric_id) DO NOTHING;
