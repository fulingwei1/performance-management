-- 员工-考核模板绑定表
-- 部门经理为下属员工固定指定考核模板，设置后永久生效
CREATE TABLE IF NOT EXISTS employee_template_bindings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_id VARCHAR(36) NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  bound_by VARCHAR(50) NOT NULL,  -- 操作人（部门经理/HR）
  bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)  -- 每个员工只能绑定一个模板
);

CREATE INDEX IF NOT EXISTS idx_etb_employee ON employee_template_bindings(employee_id);
CREATE INDEX IF NOT EXISTS idx_etb_template ON employee_template_bindings(template_id);

COMMENT ON TABLE employee_template_bindings IS '员工-考核模板绑定：部门经理设置后自动生效，无需每次选择';
COMMENT ON COLUMN employee_template_bindings.bound_by IS '绑定操作人ID（部门经理或HR）';
