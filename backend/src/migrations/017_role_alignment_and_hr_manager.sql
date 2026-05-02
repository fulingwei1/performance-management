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
SET role = 'admin',
    status = 'active',
    department = '人力行政部',
    sub_department = COALESCE(NULLIF(sub_department, ''), '人事组'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'hr001' OR name = '林作倩';

UPDATE employees
SET role = 'admin',
    status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'admin' OR name = '系统管理员';

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
