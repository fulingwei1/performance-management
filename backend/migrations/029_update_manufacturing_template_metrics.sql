-- 将“生产制造部门标准模板”统一优化为 5 个指标。
-- 业务背景：制造中心当前不存在设备利用率、安全事故率、产量完成率这类硬指标，
-- 三个生产小组统一使用一套更贴近作业质量和现场管理的模板。

BEGIN;

UPDATE assessment_templates
SET description = '适用于生产制造岗位：任务交付25%+作业质量30%+工艺规范20%+现场管理15%+团队协作10%',
    updated_at = CURRENT_TIMESTAMP
WHERE department_type = 'manufacturing'
  AND name = '生产制造部门标准模板';

INSERT INTO template_metrics (
  id, template_id, metric_name, metric_code, category, weight, description, evaluation_type, sort_order
) VALUES
  ('metric-mfg-def-01', 'template-mfg-default', '任务完成与交付', 'TASK_DELIVERY', 'performance', 25.00, '按派工/计划要求完成本月任务，不按产量硬指标考核', 'qualitative', 1),
  ('metric-mfg-def-02', 'template-mfg-default', '作业质量与返工控制', 'WORK_QUALITY_REWORK_CONTROL', 'performance', 30.00, '装配、接线、机加等作业质量，以及错漏、返工和异常控制', 'qualitative', 2),
  ('metric-mfg-def-03', 'template-mfg-default', '工艺规范执行', 'PROCESS_COMPLIANCE', 'behavior', 20.00, '按图纸、工艺、检验要求规范作业，减少随意操作', 'qualitative', 3),
  ('metric-mfg-def-04', 'template-mfg-default', '物料管理与现场5S', 'MATERIAL_AND_5S', 'behavior', 15.00, '物料领用、标识、保管、节约意识和现场5S执行', 'qualitative', 4),
  ('metric-mfg-def-05', 'template-mfg-default', '团队协作与问题反馈', 'TEAMWORK_AND_FEEDBACK', 'collaboration', 10.00, '班组协作、异常及时反馈、跨岗位配合和改善建议', 'qualitative', 5),
  ('metric-mfg-001', 'template-manufacturing-001', '任务完成与交付', 'TASK_DELIVERY', 'performance', 25.00, '按派工/计划要求完成本月任务，不按产量硬指标考核', 'qualitative', 1),
  ('metric-mfg-002', 'template-manufacturing-001', '作业质量与返工控制', 'WORK_QUALITY_REWORK_CONTROL', 'performance', 30.00, '装配、接线、机加等作业质量，以及错漏、返工和异常控制', 'qualitative', 2),
  ('metric-mfg-003', 'template-manufacturing-001', '工艺规范执行', 'PROCESS_COMPLIANCE', 'behavior', 20.00, '按图纸、工艺、检验要求规范作业，减少随意操作', 'qualitative', 3),
  ('metric-mfg-004', 'template-manufacturing-001', '物料管理与现场5S', 'MATERIAL_AND_5S', 'behavior', 15.00, '物料领用、标识、保管、节约意识和现场5S执行', 'qualitative', 4),
  ('metric-mfg-005', 'template-manufacturing-001', '团队协作与问题反馈', 'TEAMWORK_AND_FEEDBACK', 'collaboration', 10.00, '班组协作、异常及时反馈、跨岗位配合和改善建议', 'qualitative', 5)
ON CONFLICT (id) DO UPDATE
SET metric_name = EXCLUDED.metric_name,
    metric_code = EXCLUDED.metric_code,
    category = EXCLUDED.category,
    weight = EXCLUDED.weight,
    description = EXCLUDED.description,
    evaluation_type = EXCLUDED.evaluation_type,
    sort_order = EXCLUDED.sort_order;

DELETE FROM template_metrics
WHERE template_id IN ('template-mfg-default', 'template-manufacturing-001')
  AND (
    id IN (
      'metric-mfg-def-06', 'metric-mfg-def-07', 'metric-mfg-def-08',
      'metric-mfg-006', 'metric-mfg-007', 'metric-mfg-008'
    )
    OR metric_code IN (
      'OUTPUT_COMPLETION',
      'PRODUCTION_EFFICIENCY',
      'EQUIPMENT_UTILIZATION',
      'QUALITY_RATE',
      'SAFETY_INCIDENT_RATE',
      'MATERIAL_LOSS_RATE',
      '5S_MANAGEMENT',
      'TEAMWORK'
    )
  )
  AND id NOT IN (
    'metric-mfg-def-01', 'metric-mfg-def-02', 'metric-mfg-def-03', 'metric-mfg-def-04', 'metric-mfg-def-05',
    'metric-mfg-001', 'metric-mfg-002', 'metric-mfg-003', 'metric-mfg-004', 'metric-mfg-005'
  );

COMMIT;
