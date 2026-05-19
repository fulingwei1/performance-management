-- 将“工程技术部门标准模板”统一优化为 5 个指标。
-- 专项初级模板（PLC/电气、机械/结构、测试/调试等）不受影响。

BEGIN;

UPDATE assessment_templates
SET description = '适用于工程技术岗位：任务交付25%+质量验收20%+技术方案25%+文档沉淀15%+协作改进15%',
    updated_at = CURRENT_TIMESTAMP
WHERE department_type = 'engineering'
  AND name = '工程技术部门标准模板';

INSERT INTO template_metrics (
  id, template_id, metric_name, metric_code, category, weight, description, evaluation_type, sort_order
) VALUES
  ('metric-eng-def-01', 'template-eng-default', '任务交付与进度', 'TASK_DELIVERY_PROGRESS', 'performance', 25.00, '按项目计划、任务安排完成交付，关注进度响应和闭环', 'qualitative', 1),
  ('metric-eng-def-02', 'template-eng-default', '质量验收与问题控制', 'QUALITY_ACCEPTANCE_CONTROL', 'performance', 20.00, '交付成果质量、验收通过情况、问题和返工控制', 'qualitative', 2),
  ('metric-eng-def-03', 'template-eng-default', '技术方案与问题解决', 'SOLUTION_AND_PROBLEM_SOLVING', 'innovation', 25.00, '方案合理性、技术难点处理、异常定位和改进能力', 'qualitative', 3),
  ('metric-eng-def-04', 'template-eng-default', '文档规范与知识沉淀', 'DOCUMENTATION_KNOWLEDGE', 'performance', 15.00, '图纸、代码、测试记录、技术文档和经验沉淀的完整规范性', 'qualitative', 4),
  ('metric-eng-def-05', 'template-eng-default', '协作沟通与主动改进', 'COLLABORATION_IMPROVEMENT', 'collaboration', 15.00, '跨部门协作、沟通反馈、主动改进和技术分享', 'qualitative', 5),
  ('metric-eng-001', 'template-engineering-001', '任务交付与进度', 'TASK_DELIVERY_PROGRESS', 'performance', 25.00, '按项目计划、任务安排完成交付，关注进度响应和闭环', 'qualitative', 1),
  ('metric-eng-002', 'template-engineering-001', '质量验收与问题控制', 'QUALITY_ACCEPTANCE_CONTROL', 'performance', 20.00, '交付成果质量、验收通过情况、问题和返工控制', 'qualitative', 2),
  ('metric-eng-003', 'template-engineering-001', '技术方案与问题解决', 'SOLUTION_AND_PROBLEM_SOLVING', 'innovation', 25.00, '方案合理性、技术难点处理、异常定位和改进能力', 'qualitative', 3),
  ('metric-eng-004', 'template-engineering-001', '文档规范与知识沉淀', 'DOCUMENTATION_KNOWLEDGE', 'performance', 15.00, '图纸、代码、测试记录、技术文档和经验沉淀的完整规范性', 'qualitative', 4),
  ('metric-eng-005', 'template-engineering-001', '协作沟通与主动改进', 'COLLABORATION_IMPROVEMENT', 'collaboration', 15.00, '跨部门协作、沟通反馈、主动改进和技术分享', 'qualitative', 5)
ON CONFLICT (id) DO UPDATE
SET metric_name = EXCLUDED.metric_name,
    metric_code = EXCLUDED.metric_code,
    category = EXCLUDED.category,
    weight = EXCLUDED.weight,
    description = EXCLUDED.description,
    evaluation_type = EXCLUDED.evaluation_type,
    sort_order = EXCLUDED.sort_order;

DELETE FROM template_metrics
WHERE template_id IN ('template-eng-default', 'template-engineering-001')
  AND (
    id IN (
      'metric-eng-def-06', 'metric-eng-def-07', 'metric-eng-def-08',
      'metric-eng-006', 'metric-eng-007', 'metric-eng-008'
    )
    OR metric_code IN (
      'PROJECT_ONTIME_RATE',
      'FIRST_PASS_RATE',
      'SOLUTION_QUALITY',
      'PROBLEM_SOLVING',
      'INNOVATION',
      'DOCUMENTATION',
      'CROSS_TEAM_COLLABORATION',
      'KNOWLEDGE_SHARING'
    )
  )
  AND id NOT IN (
    'metric-eng-def-01', 'metric-eng-def-02', 'metric-eng-def-03', 'metric-eng-def-04', 'metric-eng-def-05',
    'metric-eng-001', 'metric-eng-002', 'metric-eng-003', 'metric-eng-004', 'metric-eng-005'
  );

COMMIT;
