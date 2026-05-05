-- 清理员工自循环直属上级，以及绩效记录中的无效考核人引用。

-- 1) 直属上级不能指向自己；历史数据中的自指顶层负责人改为空上级。
UPDATE employees
SET manager_id = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE manager_id IS NOT NULL
  AND manager_id = id;

-- 2) 已存在绩效记录 assessor_id 指向不存在员工时，优先同步为员工当前有效直属上级。
UPDATE performance_records pr
SET assessor_id = e.manager_id,
    updated_at = CURRENT_TIMESTAMP
FROM employees e
JOIN employees mgr ON mgr.id = e.manager_id AND COALESCE(mgr.status, 'active') = 'active'
WHERE pr.employee_id = e.id
  AND COALESCE(e.status, 'active') = 'active'
  AND e.manager_id IS NOT NULL
  AND e.manager_id <> e.id
  AND (
    pr.assessor_id IS NULL
    OR pr.assessor_id = ''
    OR NOT EXISTS (SELECT 1 FROM employees assessor WHERE assessor.id = pr.assessor_id)
  );

-- 3) 仍无法解析到有效上级的记录，不再保留幽灵 assessor；等待人事档案补齐后由同步服务重新分配。
UPDATE performance_records pr
SET assessor_id = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE pr.assessor_id IS NULL
  OR pr.assessor_id = ''
  OR NOT EXISTS (SELECT 1 FROM employees assessor WHERE assessor.id = pr.assessor_id);
