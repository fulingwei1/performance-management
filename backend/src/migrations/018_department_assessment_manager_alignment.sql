-- Align assessment owners for departments that should not inherit the GM as reviewer.
UPDATE employees
SET role = 'manager', updated_at = CURRENT_TIMESTAMP
WHERE status = 'active'
  AND name IN ('周念', '王志红', '高勇')
  AND role <> 'manager';

WITH warehouse_manager AS (
  SELECT id FROM employees
  WHERE status = 'active' AND name = '周念'
  ORDER BY id
  LIMIT 1
)
UPDATE employees
SET manager_id = (SELECT id FROM warehouse_manager),
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'active'
  AND department = '制造中心'
  AND POSITION('仓储部' IN COALESCE(sub_department, '')) > 0
  AND id <> (SELECT id FROM warehouse_manager)
  AND (SELECT id FROM warehouse_manager) IS NOT NULL
  AND manager_id IS DISTINCT FROM (SELECT id FROM warehouse_manager);

WITH customer_service_manager AS (
  SELECT id FROM employees
  WHERE status = 'active' AND name = '王志红'
  ORDER BY id
  LIMIT 1
)
UPDATE employees
SET manager_id = (SELECT id FROM customer_service_manager),
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'active'
  AND department = '制造中心'
  AND POSITION('客服部' IN COALESCE(sub_department, '')) > 0
  AND id <> (SELECT id FROM customer_service_manager)
  AND (SELECT id FROM customer_service_manager) IS NOT NULL
  AND manager_id IS DISTINCT FROM (SELECT id FROM customer_service_manager);

WITH production_manager AS (
  SELECT id FROM employees
  WHERE status = 'active' AND name = '高勇'
  ORDER BY id
  LIMIT 1
)
UPDATE employees
SET manager_id = (SELECT id FROM production_manager),
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'active'
  AND department = '制造中心'
  AND POSITION('生产部' IN COALESCE(sub_department, '')) > 0
  AND id <> (SELECT id FROM production_manager)
  AND (SELECT id FROM production_manager) IS NOT NULL
  AND manager_id IS DISTINCT FROM (SELECT id FROM production_manager);
