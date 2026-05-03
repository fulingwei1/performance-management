BEGIN;

UPDATE employees
SET role = 'admin',
    status = 'active',
    department = '人力行政部',
    sub_department = '',
    position = COALESCE(NULLIF(position, ''), '部门经理'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'hr002' OR name = '符凌维';

UPDATE employees
SET role = 'hr',
    status = 'active',
    department = '人力行政部',
    sub_department = COALESCE(NULLIF(sub_department, ''), '人事组'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'hr001' OR name = '林作倩';

DO $$
DECLARE
  hr_manager_id TEXT;
  old_admin_id TEXT;
  fk_record RECORD;
BEGIN
  SELECT id INTO hr_manager_id
  FROM employees
  WHERE name = '符凌维'
  ORDER BY CASE WHEN id = 'hr002' THEN 0 ELSE 1 END, id
  LIMIT 1;

  SELECT id INTO old_admin_id
  FROM employees
  WHERE id = 'admin' OR name = '系统管理员'
  ORDER BY CASE WHEN id = 'admin' THEN 0 ELSE 1 END, id
  LIMIT 1;

  IF hr_manager_id IS NOT NULL AND old_admin_id IS NOT NULL THEN
    FOR fk_record IN
      SELECT * FROM (VALUES
        ('appeals', 'hr_id'),
        ('employee_template_bindings', 'set_by'),
        ('employee_transfers', 'created_by'),
        ('level_template_rules', 'set_by'),
        ('monthly_assessment_publications', 'published_by'),
        ('notifications', 'user_id'),
        ('objective_adjustments', 'adjusted_by'),
        ('strategic_objectives', 'approved_by'),
        ('strategic_objectives', 'approver_id')
      ) AS fk(table_name, column_name)
      WHERE EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = fk.table_name
          AND column_name = fk.column_name
      )
    LOOP
      EXECUTE format(
        'UPDATE %I SET %I = $1 WHERE %I = $2',
        fk_record.table_name,
        fk_record.column_name,
        fk_record.column_name
      )
      USING hr_manager_id, old_admin_id;
    END LOOP;

    DELETE FROM employees
    WHERE id = old_admin_id;
  END IF;
END $$;

DO $$
DECLARE
  hr_manager_id TEXT;
BEGIN
  SELECT id INTO hr_manager_id
  FROM employees
  WHERE name = '符凌维'
  ORDER BY id
  LIMIT 1;

  IF hr_manager_id IS NOT NULL THEN
    UPDATE employees
    SET manager_id = hr_manager_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active'
      AND department = '人力行政部'
      AND id <> hr_manager_id
      AND manager_id IS DISTINCT FROM hr_manager_id;
  END IF;
END $$;

COMMIT;
