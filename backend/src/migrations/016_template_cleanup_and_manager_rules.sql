BEGIN;

-- 旧版基础模板与新版“行业模板”名称重复，保留新版模板，旧版转为归档。
UPDATE assessment_templates
SET status = 'archived',
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  'template-sales-001',
  'template-engineering-001',
  'template-manufacturing-001',
  'template-support-001'
);

-- “项目管理部”不是高管管理类，按项目/工程协同类模板处理。
UPDATE departments
SET department_type = 'engineering',
    updated_at = CURRENT_TIMESTAMP
WHERE name LIKE '%项目管理%';

-- 销售模板去重：销售经理走经理模板，不再落到高级销售工程师模板。
DO $$
DECLARE
  roles_type TEXT;
  levels_type TEXT;
  positions_type TEXT;
BEGIN
  SELECT udt_name INTO roles_type
  FROM information_schema.columns
  WHERE table_name = 'assessment_templates' AND column_name = 'applicable_roles';

  SELECT udt_name INTO levels_type
  FROM information_schema.columns
  WHERE table_name = 'assessment_templates' AND column_name = 'applicable_levels';

  SELECT udt_name INTO positions_type
  FROM information_schema.columns
  WHERE table_name = 'assessment_templates' AND column_name = 'applicable_positions';

  IF positions_type = 'jsonb' THEN
    UPDATE assessment_templates
    SET applicable_positions = '["高级销售工程师","销售主管"]'::jsonb,
        applicable_levels = '["senior"]'::jsonb,
        applicable_roles = '["employee"]'::jsonb,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'template-sales-senior-001';

    UPDATE assessment_templates
    SET applicable_positions = '["销售经理","大客户经理","营销中心总监"]'::jsonb,
        applicable_levels = '["manager","senior"]'::jsonb,
        applicable_roles = '["manager"]'::jsonb,
        priority = 60,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'template-sales-mgr-001';
  ELSE
    UPDATE assessment_templates
    SET applicable_positions = ARRAY['高级销售工程师','销售主管']::TEXT[],
        applicable_levels = ARRAY['senior']::TEXT[],
        applicable_roles = ARRAY['employee']::TEXT[],
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'template-sales-senior-001';

    UPDATE assessment_templates
    SET applicable_positions = ARRAY['销售经理','大客户经理','营销中心总监']::TEXT[],
        applicable_levels = ARRAY['manager','senior']::TEXT[],
        applicable_roles = ARRAY['manager']::TEXT[],
        priority = 60,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'template-sales-mgr-001';
  END IF;
END $$;

WITH rule_candidates(department_type, level, template_id) AS (
  VALUES
    ('sales', 'assistant', 'template-sales-junior-001'),
    ('sales', 'junior', 'template-sales-junior-001'),
    ('sales', 'intermediate', 'template-sales-junior-001'),
    ('sales', 'senior', 'template-sales-senior-001'),
    ('sales', 'manager', 'template-sales-mgr-001'),

    ('engineering', 'assistant', 'template-eng-junior-001'),
    ('engineering', 'junior', 'template-eng-junior-001'),
    ('engineering', 'intermediate', 'template-eng-inter-001'),
    ('engineering', 'senior', 'template-eng-senior-001'),
    ('engineering', 'manager', 'template-eng-mgr-001'),

    ('manufacturing', 'assistant', 'template-mfg-junior-001'),
    ('manufacturing', 'junior', 'template-mfg-junior-001'),
    ('manufacturing', 'intermediate', 'template-mfg-junior-001'),
    ('manufacturing', 'senior', 'template-mfg-senior-001'),
    ('manufacturing', 'manager', 'template-mfg-mgr-001'),

    ('support', 'assistant', 'template-sup-junior-001'),
    ('support', 'junior', 'template-sup-junior-001'),
    ('support', 'intermediate', 'template-sup-junior-001'),
    ('support', 'senior', 'template-sup-senior-001'),
    ('support', 'manager', 'template-sup-mgr-001'),

    ('management', 'manager', 'template-mgmt-gm-001'),
    ('management', 'senior', 'template-mgmt-gm-001')
)
INSERT INTO level_template_rules (id, department_type, level, template_id, set_by, created_at, updated_at)
SELECT
  'rule-' || department_type || '-' || level || '-v2',
  department_type,
  level,
  template_id,
  'admin',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM rule_candidates
WHERE EXISTS (
  SELECT 1
  FROM assessment_templates
  WHERE id = rule_candidates.template_id
    AND status = 'active'
)
ON CONFLICT (department_type, level)
DO UPDATE SET
  template_id = EXCLUDED.template_id,
  set_by = EXCLUDED.set_by,
  updated_at = CURRENT_TIMESTAMP;

DELETE FROM level_template_rules
WHERE department_type = 'management'
  AND level NOT IN ('manager', 'senior');

COMMIT;
