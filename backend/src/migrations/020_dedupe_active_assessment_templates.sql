BEGIN;

-- 销售类存在一套旧基础模板和一套新版行业模板同名同类型。
-- 保留新版行业模板 template-sales-default；旧模板归档，不再在前端模板列表出现。
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM assessment_templates WHERE id = 'template-sales-default')
     AND EXISTS (SELECT 1 FROM assessment_templates WHERE id = 'template-sales-001') THEN

    DELETE FROM department_templates old_dt
    USING department_templates kept_dt
    WHERE old_dt.template_id = 'template-sales-001'
      AND kept_dt.template_id = 'template-sales-default'
      AND kept_dt.department_id = old_dt.department_id;

    UPDATE department_templates
    SET template_id = 'template-sales-default'
    WHERE template_id = 'template-sales-001';

    UPDATE level_template_rules
    SET template_id = 'template-sales-default',
        updated_at = CURRENT_TIMESTAMP
    WHERE template_id = 'template-sales-001';

    UPDATE monthly_assessments
    SET template_id = 'template-sales-default',
        template_name = COALESCE(template_name, '销售部门标准模板')
    WHERE template_id = 'template-sales-001';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'interview_plans'
        AND column_name = 'template_id'
        AND udt_name IN ('varchar', 'text')
    ) THEN
      UPDATE interview_plans
      SET template_id = 'template-sales-default',
          updated_at = CURRENT_TIMESTAMP
      WHERE template_id = 'template-sales-001';
    END IF;

    UPDATE metric_template_metrics
    SET template_id = 'template-sales-default'
    WHERE template_id = 'template-sales-001';

    UPDATE assessment_templates
    SET status = 'archived',
        is_default = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'template-sales-001';

    UPDATE assessment_templates
    SET status = 'active',
        is_default = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'template-sales-default';
  END IF;
END $$;

-- 防止同一部门类型下再出现同名的“启用中模板”。
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_templates_active_type_name_unique
ON assessment_templates (department_type, name)
WHERE status = 'active';

COMMIT;
