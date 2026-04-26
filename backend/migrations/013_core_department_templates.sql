-- 核心部门、核心岗位、不同级别考核模板初始化脚本
-- 适用于绩效管理系统

-- ============================================
-- 1. 核心部门数据（非标自动化设备制造）
-- ============================================
INSERT INTO departments (id, name, code, parent_id, sort_order, status, department_type)
VALUES 
  -- 销售体系
  ('dept-sales', '销售部', 'SALES', NULL, 1, 'active', 'sales'),
  ('dept-presales', '售前方案部', 'PRESALES', NULL, 2, 'active', 'sales'),
  
  -- 工程技术中心（核心）
  ('dept-engineering', '工程技术中心', 'ENG', NULL, 3, 'active', 'engineering'),
  ('dept-mechanical', '机械设计部', 'MECH', 'dept-engineering', 1, 'active', 'engineering'),
  ('dept-electrical', '电气设计部', 'ELEC', 'dept-engineering', 2, 'active', 'engineering'),
  ('dept-software', '软件开发部', 'SW', 'dept-engineering', 3, 'active', 'engineering'),
  ('dept-visual', '视觉检测部', 'VISION', 'dept-engineering', 4, 'active', 'engineering'),
  
  -- 生产体系
  ('dept-production', '生产部', 'PROD', NULL, 4, 'active', 'manufacturing'),
  ('dept-assembly', '装配车间', 'ASSEMBLY', 'dept-production', 1, 'active', 'manufacturing'),
  ('dept-debug', '调试车间', 'DEBUG', 'dept-production', 2, 'active', 'manufacturing'),
  ('dept-testing', '测试部', 'TEST', 'dept-production', 3, 'active', 'manufacturing'),
  
  -- 供应链
  ('dept-procurement', '采购部', 'PROCURE', NULL, 5, 'active', 'support'),
  ('dept-warehouse', '仓储部', 'WH', NULL, 6, 'active', 'support'),
  
  -- 质量
  ('dept-quality', '质量部', 'QA', NULL, 7, 'active', 'support'),
  ('dept-iqc', '来料检验(IQC)', 'IQC', 'dept-quality', 1, 'active', 'support'),
  ('dept-oqc', '出货检验(OQC)', 'OQC', 'dept-quality', 2, 'active', 'support'),
  
  -- 售后/服务
  ('dept-service', '售后服务部', 'SERVICE', NULL, 8, 'active', 'support'),
  ('dept-installation', '安装派遣组', 'INSTALL', 'dept-service', 1, 'active', 'support'),
  
  -- PMO
  ('dept-pmo', 'PMO', 'PMO', NULL, 9, 'active', 'management'),
  
  -- 职能
  ('dept-hr', '人力资源部', 'HR', NULL, 10, 'active', 'support'),
  ('dept-finance', '财务部', 'FIN', NULL, 11, 'active', 'support'),
  ('dept-rd', '研发部', 'RD', NULL, 12, 'active', 'engineering')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  department_type = EXCLUDED.department_type,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 2. 核心岗位数据
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id VARCHAR(36) REFERENCES departments(id),
  level VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO positions (id, name, department_id, level, description)
VALUES 
  -- 销售体系 (4 层: 销售 → 销售经理 → 销售总监 → 销售总经理)
  ('pos-sales', '销售工程师', 'dept-sales', 'intermediate', '客户开发、订单跟进、回款'),
  ('pos-sales-senior', '高级销售工程师', 'dept-sales', 'senior', '大客户开发、复杂项目销售'),
  ('pos-sales-manager', '销售经理', 'dept-sales', 'senior', '销售团队管理、区域目标'),
  ('pos-sales-director', '销售总监', 'dept-sales', 'director', '销售战略、分公司管理'),
  
  -- 售前方案
  ('pos-presales-engineer', '售前工程师', 'dept-presales', 'intermediate', '需求分析、方案编制、报价'),
  ('pos-presales-senior', '高级售前工程师', 'dept-presales', 'senior', '复杂方案、技术评审'),
  ('pos-presales-lead', '售前主管', 'dept-presales', 'senior', '售前团队管理、方案审核'),
  
  -- 机械设计部
  ('pos-mech-designer', '机械设计师', 'dept-mechanical', 'intermediate', '非标设备结构设计、3D 建模'),
  ('pos-mech-senior', '高级机械设计师', 'dept-mechanical', 'senior', '复杂结构设计、技术评审'),
  ('pos-mech-lead', '机械设计主管', 'dept-mechanical', 'senior', '设计团队管理、标准制定'),
  
  -- 电气设计部
  ('pos-elec-designer', '电气设计师', 'dept-electrical', 'intermediate', '电气原理图、PLC 编程'),
  ('pos-elec-senior', '高级电气设计师', 'dept-electrical', 'senior', '复杂电气系统、运动控制'),
  ('pos-elec-lead', '电气设计主管', 'dept-electrical', 'senior', '电气团队管理、技术规范'),
  
  -- 软件开发部
  ('pos-sw-dev', '软件工程师', 'dept-software', 'intermediate', '测试软件、上位机开发'),
  ('pos-sw-senior', '高级软件工程师', 'dept-software', 'senior', '架构设计、核心算法'),
  ('pos-sw-lead', '软件开发主管', 'dept-software', 'senior', '软件团队管理、技术选型'),
  
  -- 视觉检测部
  ('pos-visual-eng', '视觉工程师', 'dept-visual', 'intermediate', '视觉算法、相机选型'),
  ('pos-visual-senior', '高级视觉工程师', 'dept-visual', 'senior', '复杂视觉方案、算法优化'),
  
  -- 装配车间
  ('pos-assembler', '装配技术员', 'dept-assembly', 'junior', '设备装配、调试辅助'),
  ('pos-assembler-senior', '高级装配技师', 'dept-assembly', 'senior', '复杂设备装配、技术指导'),
  ('pos-assembly-lead', '装配组长', 'dept-assembly', 'senior', '装配计划、质量管控'),
  
  -- 调试车间
  ('pos-debugger', '调试技术员', 'dept-debug', 'junior', '设备功能调试、参数优化'),
  ('pos-debugger-senior', '高级调试技师', 'dept-debug', 'senior', '复杂系统联调、问题解决'),
  
  -- 测试部
  ('pos-tester', '测试工程师', 'dept-testing', 'intermediate', '功能测试、性能测试、FAT/SAT'),
  ('pos-test-senior', '高级测试工程师', 'dept-testing', 'senior', '测试方案、自动化测试'),
  
  -- 采购部
  ('pos-purchaser', '采购工程师', 'dept-procurement', 'intermediate', '供应商管理、物料采购'),
  ('pos-purchaser-senior', '高级采购工程师', 'dept-procurement', 'senior', '战略采购、成本分析'),
  ('pos-procurement-lead', '采购主管', 'dept-procurement', 'senior', '采购团队管理、供应商评审'),
  
  -- 质量部
  ('pos-iqc-eng', 'IQC 检验员', 'dept-iqc', 'intermediate', '来料检验、供应商质量'),
  ('pos-oqc-eng', 'OQC 检验员', 'dept-oqc', 'intermediate', '出货检验、客户标准'),
  ('pos-qa-eng', '质量工程师', 'dept-quality', 'intermediate', '质量体系、过程控制'),
  ('pos-quality-lead', '质量主管', 'dept-quality', 'senior', '质量体系建设、客户投诉处理'),
  
  -- 售后服务
  ('pos-service-eng', '售后工程师', 'dept-service', 'intermediate', '客户现场安装、调试、维修'),
  ('pos-service-senior', '高级售后工程师', 'dept-service', 'senior', '复杂问题处理、客户培训'),
  ('pos-service-lead', '售后主管', 'dept-service', 'senior', '售后团队管理、服务计划'),
  
  -- PMO
  ('pos-pm', '项目经理', 'dept-pmo', 'senior', '项目计划、进度管控、跨部门协调'),
  ('pos-pm-senior', '高级项目经理', 'dept-pmo', 'senior', '大型项目、多项目统筹'),
  ('pos-pmo-lead', 'PMO 主管', 'dept-pmo', 'senior', '项目管理体系、流程优化'),
  
  -- 研发部
  ('pos-rd-eng', '研发工程师', 'dept-rd', 'intermediate', '新技术预研、产品规划'),
  ('pos-rd-senior', '高级研发工程师', 'dept-rd', 'senior', '核心技术攻关、专利布局'),
  
  -- 职能
  ('pos-hr-manager', 'HR 经理', 'dept-hr', 'senior', '人力资源规划、团队建设'),
  ('pos-finance-manager', '财务经理', 'dept-finance', 'senior', '财务管理、成本控制')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 3. 通用考核指标（按类别）
-- ============================================

-- 业绩类指标（非标自动化行业）
INSERT INTO performance_metrics (id, name, code, category, type, description, weight, formula, unit, target_value, min_value, max_value, data_source, status)
VALUES
  -- 通用业绩指标
  ('metric-task-completion', '任务完成率', 'TASK_COMPLETION', 'performance', 'quantitative', '按时完成分配任务的比例', 20, '完成任务数/总任务数*100', '%', 90, 0, 100, '系统统计', 'active'),
  ('metric-quality-rate', '工作质量', 'QUALITY_RATE', 'performance', 'quantitative', '工作成果合格率', 15, '合格产出/总产出*100', '%', 95, 0, 100, '质量检验', 'active'),
  ('metric-deadline-compliance', '交付准时率', 'DELIVERY_ON_TIME', 'performance', 'quantitative', '按时交付的比例', 15, '按时交付数/总交付数*100', '%', 90, 0, 100, '项目管理', 'active'),
  
  -- 销售指标
  ('metric-sales-target', '销售目标达成率', 'SALES_TARGET', 'performance', 'quantitative', '销售额/回款额目标完成情况', 30, '实际销售额/目标销售额*100', '%', 100, 0, 150, 'CRM 系统', 'active'),
  ('metric-conversion-rate', '商机转化率', 'CONVERSION_RATE', 'performance', 'quantitative', '商机→订单转化率', 15, '成交商机数/总商机数*100', '%', 30, 0, 100, 'CRM 系统', 'active'),
  ('metric-payment-collection', '回款率', 'PAYMENT_COLLECTION', 'performance', 'quantitative', '应收账款回收比例', 15, '实际回款/应收回款*100', '%', 85, 0, 100, '财务系统', 'active'),
  ('metric-quote-response', '报价响应及时率', 'QUOTE_RESPONSE', 'performance', 'quantitative', '按时提交报价的比例', 10, '按时报价数/总报价数*100', '%', 95, 0, 100, '销售系统', 'active'),
  
  -- 售前方案指标
  ('metric-solution-quality', '方案质量', 'SOLUTION_QUALITY', 'performance', 'qualitative', '技术方案完整性、可行性、创新性', 25, '方案评审评分', '分', 4.0, 1, 5, '技术评审', 'active'),
  ('metric-quote-accuracy', '报价准确率', 'QUOTE_ACCURACY', 'performance', 'quantitative', '报价成本与实际成本偏差', 20, '(1-|报价成本-实际成本|/实际成本)*100', '%', 90, 0, 100, '成本分析', 'active'),
  ('metric-requirement-coverage', '需求覆盖率', 'REQ_COVERAGE', 'performance', 'quantitative', '方案覆盖客户需求比例', 15, '覆盖需求数/总需求数*100', '%', 95, 0, 100, '需求分析', 'active'),
  
  -- 机械设计指标
  ('metric-design-completion', '设计任务完成率', 'DESIGN_COMPLETION', 'performance', 'quantitative', '按时完成设计任务比例', 25, '完成设计数/计划设计数*100', '%', 90, 0, 100, '设计管理', 'active'),
  ('metric-design-error-rate', '设计差错率', 'DESIGN_ERROR_RATE', 'performance', 'quantitative', '设计错误导致返工的比例', 20, '错误次数/总设计数*100', '%', 5, 0, 100, 'ECN 记录', 'active'),
  ('metric-3d-model-quality', '3D 建模质量', 'MODEL_QUALITY', 'performance', 'qualitative', '模型规范性、可制造性', 15, '模型审查评分', '分', 4.0, 1, 5, '设计评审', 'active'),
  ('metric-standard-part-rate', '标准件使用率', 'STANDARD_PART_RATE', 'performance', 'quantitative', '设计中标准件使用比例', 10, '标准件数/总零件数*100', '%', 70, 0, 100, 'BOM 分析', 'active'),
  
  -- 电气设计指标
  ('metric-elec-design-completion', '电气设计完成率', 'ELEC_DESIGN_COMPLETION', 'performance', 'quantitative', '电气图纸/程序按时完成比例', 25, '完成数/计划数*100', '%', 90, 0, 100, '设计管理', 'active'),
  ('metric-plc-program-quality', 'PLC 程序质量', 'PLC_QUALITY', 'performance', 'qualitative', '程序规范性、可读性、稳定性', 20, '代码审查评分', '分', 4.0, 1, 5, '代码审查', 'active'),
  ('metric-wiring-error-rate', '接线差错率', 'WIRING_ERROR_RATE', 'performance', 'quantitative', '接线错误导致返工比例', 15, '错误数/总接线数*100', '%', 3, 0, 100, '装配反馈', 'active'),
  
  -- 软件开发指标
  ('metric-sw-dev-completion', '软件开发完成率', 'SW_DEV_COMPLETION', 'performance', 'quantitative', '按时完成开发任务比例', 25, '完成功能数/计划功能数*100', '%', 90, 0, 100, '项目管理', 'active'),
  ('metric-sw-bug-rate', '软件缺陷率', 'SW_BUG_RATE', 'performance', 'quantitative', '软件缺陷密度', 20, '缺陷数/千行代码', '个', 5, 0, 20, '缺陷管理', 'active'),
  ('metric-test-automation-rate', '测试自动化率', 'TEST_AUTO_RATE', 'performance', 'quantitative', '自动化测试用例比例', 15, '自动化用例数/总用例数*100', '%', 60, 0, 100, '测试系统', 'active'),
  
  -- 视觉检测指标
  ('metric-visual-accuracy', '视觉识别准确率', 'VISUAL_ACCURACY', 'performance', 'quantitative', '视觉系统识别准确率', 30, '正确识别数/总识别数*100', '%', 99, 0, 100, '测试记录', 'active'),
  ('metric-visual-speed', '视觉处理速度', 'VISUAL_SPEED', 'performance', 'quantitative', '单帧处理时间达标率', 20, '达标帧数/总帧数*100', '%', 95, 0, 100, '性能测试', 'active'),
  
  -- 装配/调试指标
  ('metric-assembly-quality', '装配质量', 'ASSEMBLY_QUALITY', 'performance', 'quantitative', '装配一次合格率', 25, '一次合格数/总装配数*100', '%', 90, 0, 100, '质量记录', 'active'),
  ('metric-debug-efficiency', '调试效率', 'DEBUG_EFFICIENCY', 'performance', 'quantitative', '调试按时完成率', 25, '按时调试完成数/总调试数*100', '%', 85, 0, 100, '调试记录', 'active'),
  ('metric-fa-sat-pass-rate', 'FAT/SAT 通过率', 'FAT_SAT_PASS', 'performance', 'quantitative', '工厂验收/现场验收一次通过率', 20, '一次通过次数/总验收次数*100', '%', 80, 0, 100, '验收记录', 'active'),
  
  -- 采购指标
  ('metric-procurement-timeliness', '采购及时率', 'PROCUREMENT_TIMELINESS', 'performance', 'quantitative', '按时到货率', 25, '按时到货数/总采购数*100', '%', 90, 0, 100, '采购系统', 'active'),
  ('metric-cost-reduction', '成本降低率', 'COST_REDUCTION', 'performance', 'quantitative', '采购成本降低比例', 20, '(基准价-实际价)/基准价*100', '%', 5, -10, 30, '成本分析', 'active'),
  ('metric-supplier-quality', '供应商来料合格率', 'SUPPLIER_QUALITY', 'performance', 'quantitative', '供应商来料合格比例', 15, '合格批次/总批次*100', '%', 95, 0, 100, 'IQC 记录', 'active'),
  
  -- 质量指标
  ('metric-iqc-pass-rate', 'IQC 来料合格率', 'IQC_PASS_RATE', 'performance', 'quantitative', '来料检验合格率', 25, '合格批次/总检验批次*100', '%', 95, 0, 100, 'IQC 记录', 'active'),
  ('metric-oqc-pass-rate', 'OQC 出货合格率', 'OQC_PASS_RATE', 'performance', 'quantitative', '出货检验合格率', 25, '合格批次/总检验批次*100', '%', 98, 0, 100, 'OQC 记录', 'active'),
  ('metric-customer-complaint', '客户投诉次数', 'CUSTOMER_COMPLAINT', 'performance', 'quantitative', '客户质量投诉次数', 20, '投诉次数', '次', 0, 0, 5, '客诉记录', 'active'),
  
  -- 售后服务指标
  ('metric-service-response-time', '服务响应及时率', 'SERVICE_RESPONSE', 'performance', 'quantitative', '按时响应客户请求比例', 25, '及时响应数/总请求数*100', '%', 95, 0, 100, '服务系统', 'active'),
  ('metric-service-resolution-rate', '问题解决率', 'SERVICE_RESOLUTION', 'performance', 'quantitative', '首次上门解决率', 25, '首次解决数/总服务数*100', '%', 80, 0, 100, '服务记录', 'active'),
  ('metric-customer-satisfaction', '客户满意度', 'CUSTOMER_SATISFACTION', 'performance', 'qualitative', '客户对服务的满意度', 20, '客户评分', '分', 4.5, 1, 5, '客户调查', 'active'),
  
  -- PMO 指标
  ('metric-project-on-time', '项目准时交付率', 'PROJECT_ON_TIME', 'performance', 'quantitative', '项目按时交付比例', 30, '按时交付项目数/总项目数*100', '%', 85, 0, 100, '项目管理', 'active'),
  ('metric-project-budget', '项目预算控制', 'PROJECT_BUDGET', 'performance', 'quantitative', '项目成本控制在预算内比例', 20, '预算内项目数/总项目数*100', '%', 90, 0, 100, '财务系统', 'active'),
  ('metric-risk-management', '风险管理有效性', 'RISK_MANAGEMENT', 'performance', 'qualitative', '风险识别和应对效果', 15, '风险评估评分', '分', 4.0, 1, 5, '风险管理', 'active'),
  
  -- 研发指标
  ('metric-rd-progress', '研发进度达成率', 'RD_PROGRESS', 'performance', 'quantitative', '研发里程碑按时达成比例', 25, '达成里程碑数/总里程碑数*100', '%', 85, 0, 100, '研发管理', 'active'),
  ('metric-patent-output', '专利产出', 'PATENT_OUTPUT', 'performance', 'quantitative', '专利申请/授权数量', 20, '专利数量', '件', 2, 0, 10, '知识产权', 'active'),
  ('metric-technology-breakthrough', '技术突破', 'TECH_BREAKTHROUGH', 'performance', 'qualitative', '核心技术攻关成果', 20, '技术评审评分', '分', 4.0, 1, 5, '技术委员会', 'active')
  ('metric-team-performance', '团队绩效', 'TEAM_PERFORMANCE', 'performance', 'quantitative', '团队整体绩效达成情况', 10, '团队平均绩效得分', '分', 4.0, 1, 5, '绩效系统', 'active'),
  ('metric-strategic-execution', '战略执行', 'STRATEGIC_EXECUTION', 'performance', 'qualitative', '公司战略执行情况', 10, '战略目标达成率', '%', 80, 0, 100, '管理层评估', 'active'),
  ('metric-cost-control', '成本控制', 'COST_CONTROL', 'performance', 'quantitative', '预算执行情况', 10, '预算金额/实际支出*100', '%', 100, 0, 120, '财务系统', 'active'),
  ('metric-documentation', '文档完整性', 'DOCUMENTATION', 'performance', 'qualitative', '技术文档的完整性和质量', 10, '文档完整度评分', '分', 4.0, 1, 5, '文档审查', 'active'),
  ('metric-innovation', '技术创新', 'INNOVATION', 'performance', 'qualitative', '技术创新和改进贡献', 10, '创新提案采纳数', '个', 2, 0, 10, '技术委员会', 'active'),
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  weight = EXCLUDED.weight,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 4. 评分标准（L1-L5 五级评分）
-- ============================================
INSERT INTO scoring_criteria (id, metric_id, level, score, description)
SELECT 
  md5(random()::text)::uuid,
  id,
  level,
  score,
  description
FROM (
  VALUES
    ('metric-task-completion', 'L1', 0.5, '严重不达标，完成率<60%'),
    ('metric-task-completion', 'L2', 0.8, '部分达标，完成率 60-79%'),
    ('metric-task-completion', 'L3', 1.0, '基本达标，完成率 80-94%'),
    ('metric-task-completion', 'L4', 1.2, '优秀达标，完成率 95-109%'),
    ('metric-task-completion', 'L5', 1.5, '卓越达标，完成率≥110%'),
    
    ('metric-quality-rate', 'L1', 0.5, '质量严重不达标，合格率<80%'),
    ('metric-quality-rate', 'L2', 0.8, '质量部分达标，合格率 80-89%'),
    ('metric-quality-rate', 'L3', 1.0, '质量基本达标，合格率 90-94%'),
    ('metric-quality-rate', 'L4', 1.2, '质量优秀，合格率 95-98%'),
    ('metric-quality-rate', 'L5', 1.5, '质量卓越，合格率≥99%'),
    
    ('metric-efficiency', 'L1', 0.5, '效率严重不足，<70%'),
    ('metric-efficiency', 'L2', 0.8, '效率部分达标，70-89%'),
    ('metric-efficiency', 'L3', 1.0, '效率基本达标，90-109%'),
    ('metric-efficiency', 'L4', 1.2, '效率优秀，110-129%'),
    ('metric-efficiency', 'L5', 1.5, '效率卓越，≥130%'),
    
    ('metric-deadline-compliance', 'L1', 0.5, '严重超时，遵守率<70%'),
    ('metric-deadline-compliance', 'L2', 0.8, '部分超时，遵守率 70-84%'),
    ('metric-deadline-compliance', 'L3', 1.0, '基本按时，遵守率 85-94%'),
    ('metric-deadline-compliance', 'L4', 1.2, '优秀按时，遵守率 95-99%'),
    ('metric-deadline-compliance', 'L5', 1.5, '卓越按时，遵守率 100%'),
    
    ('metric-professional-skills', 'L1', 0.5, '专业技能严重不足'),
    ('metric-professional-skills', 'L2', 0.8, '专业技能部分掌握'),
    ('metric-professional-skills', 'L3', 1.0, '专业技能基本达标'),
    ('metric-professional-skills', 'L4', 1.2, '专业技能优秀'),
    ('metric-professional-skills', 'L5', 1.5, '专业技能卓越'),
    
    ('metric-responsibility', 'L1', 0.5, '责任心严重不足'),
    ('metric-responsibility', 'L2', 0.8, '责任心部分体现'),
    ('metric-responsibility', 'L3', 1.0, '责任心基本达标'),
    ('metric-responsibility', 'L4', 1.2, '责任心强'),
    ('metric-responsibility', 'L5', 1.5, '责任心卓越，主动担当'),
    
    ('metric-teamwork', 'L1', 0.5, '团队协作差'),
    ('metric-teamwork', 'L2', 0.8, '团队协作部分配合'),
    ('metric-teamwork', 'L3', 1.0, '团队协作基本达标'),
    ('metric-teamwork', 'L4', 1.2, '团队协作良好'),
    ('metric-teamwork', 'L5', 1.5, '团队协作卓越，促进团队凝聚'),
    
    ('metric-initiative', 'L1', 0.5, '缺乏主动性'),
    ('metric-initiative', 'L2', 0.8, '主动性一般'),
    ('metric-initiative', 'L3', 1.0, '主动性基本达标'),
    ('metric-initiative', 'L4', 1.2, '主动性强'),
    ('metric-initiative', 'L5', 1.5, '主动性卓越，持续创新')
) AS scoring_data(metric_id, level, score, description)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. 考核模板（非标自动化行业）
-- ============================================

-- 销售体系
INSERT INTO metric_templates (id, name, description, position_id, status) VALUES
  ('template-sales', '销售部 - 销售工程师考核模板', '适用于销售工程师的绩效考核', 'pos-sales', 'active'),
  ('template-sales-senior', '销售部 - 高级销售工程师考核模板', '适用于高级销售工程师的绩效考核', 'pos-sales-senior', 'active'),
  ('template-sales-manager', '销售部 - 销售经理考核模板', '适用于销售经理的绩效考核', 'pos-sales-manager', 'active'),
  ('template-sales-director', '销售部 - 销售总监考核模板', '适用于销售总监的绩效考核', 'pos-sales-director', 'active'),

  -- 售前方案
  ('template-presales', '售前方案部 - 售前工程师考核模板', '适用于售前工程师的绩效考核', 'pos-presales-engineer', 'active'),
  ('template-presales-senior', '售前方案部 - 高级售前工程师考核模板', '适用于高级售前工程师的绩效考核', 'pos-presales-senior', 'active'),
  ('template-presales-lead', '售前方案部 - 售前主管考核模板', '适用于售前主管的绩效考核', 'pos-presales-lead', 'active'),

  -- 机械设计
  ('template-mech', '机械设计部 - 机械设计师考核模板', '适用于机械设计师的绩效考核', 'pos-mech-designer', 'active'),
  ('template-mech-senior', '机械设计部 - 高级机械设计师考核模板', '适用于高级机械设计师的绩效考核', 'pos-mech-senior', 'active'),
  ('template-mech-lead', '机械设计部 - 机械设计主管考核模板', '适用于机械设计主管的绩效考核', 'pos-mech-lead', 'active'),

  -- 电气设计
  ('template-elec', '电气设计部 - 电气设计师考核模板', '适用于电气设计师的绩效考核', 'pos-elec-designer', 'active'),
  ('template-elec-senior', '电气设计部 - 高级电气设计师考核模板', '适用于高级电气设计师的绩效考核', 'pos-elec-senior', 'active'),
  ('template-elec-lead', '电气设计部 - 电气设计主管考核模板', '适用于电气设计主管的绩效考核', 'pos-elec-lead', 'active'),

  -- 软件开发
  ('template-sw', '软件开发部 - 软件工程师考核模板', '适用于软件工程师的绩效考核', 'pos-sw-dev', 'active'),
  ('template-sw-senior', '软件开发部 - 高级软件工程师考核模板', '适用于高级软件工程师的绩效考核', 'pos-sw-senior', 'active'),
  ('template-sw-lead', '软件开发部 - 软件开发主管考核模板', '适用于软件开发主管的绩效考核', 'pos-sw-lead', 'active'),

  -- 视觉检测
  ('template-visual', '视觉检测部 - 视觉工程师考核模板', '适用于视觉工程师的绩效考核', 'pos-visual-eng', 'active'),
  ('template-visual-senior', '视觉检测部 - 高级视觉工程师考核模板', '适用于高级视觉工程师的绩效考核', 'pos-visual-senior', 'active'),

  -- 装配/调试
  ('template-assembler', '装配车间 - 装配技术员考核模板', '适用于装配技术员的绩效考核', 'pos-assembler', 'active'),
  ('template-assembler-senior', '装配车间 - 高级装配技师考核模板', '适用于高级装配技师的绩效考核', 'pos-assembler-senior', 'active'),
  ('template-debugger', '调试车间 - 调试技术员考核模板', '适用于调试技术员的绩效考核', 'pos-debugger', 'active'),
  ('template-debugger-senior', '调试车间 - 高级调试技师考核模板', '适用于高级调试技师的绩效考核', 'pos-debugger-senior', 'active'),

  -- 测试
  ('template-tester', '测试部 - 测试工程师考核模板', '适用于测试工程师的绩效考核', 'pos-tester', 'active'),

  -- 采购
  ('template-purchaser', '采购部 - 采购工程师考核模板', '适用于采购工程师的绩效考核', 'pos-purchaser', 'active'),
  ('template-purchaser-senior', '采购部 - 高级采购工程师考核模板', '适用于高级采购工程师的绩效考核', 'pos-purchaser-senior', 'active'),

  -- 质量
  ('template-iqc', '质量部 - IQC 检验员考核模板', '适用于 IQC 检验员的绩效考核', 'pos-iqc-eng', 'active'),
  ('template-oqc', '质量部 - OQC 检验员考核模板', '适用于 OQC 检验员的绩效考核', 'pos-oqc-eng', 'active'),
  ('template-qa', '质量部 - 质量工程师考核模板', '适用于质量工程师的绩效考核', 'pos-qa-eng', 'active'),

  -- 售后服务
  ('template-service', '售后服务部 - 售后工程师考核模板', '适用于售后工程师的绩效考核', 'pos-service-eng', 'active'),
  ('template-service-senior', '售后服务部 - 高级售后工程师考核模板', '适用于高级售后工程师的绩效考核', 'pos-service-senior', 'active'),

  -- PMO
  ('template-pm', 'PMO - 项目经理考核模板', '适用于项目经理的绩效考核', 'pos-pm', 'active'),
  ('template-pm-senior', 'PMO - 高级项目经理考核模板', '适用于高级项目经理的绩效考核', 'pos-pm-senior', 'active'),

  -- 研发
  ('template-rd', '研发部 - 研发工程师考核模板', '适用于研发工程师的绩效考核', 'pos-rd-eng', 'active'),

  -- 职能
  ('template-hr', '人力资源部 - HR 经理考核模板', '适用于 HR 经理的绩效考核', 'pos-hr-manager', 'active'),
  ('template-finance', '财务部 - 财务经理考核模板', '适用于财务经理的绩效考核', 'pos-finance-manager', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- 6. 模板 - 指标关联（按岗位配置权重）
-- ============================================

-- 销售工程师：销售目标 30 + 商机转化 15 + 回款 15 + 报价响应 10 + 任务完成 15 + 团队协作 10 + 主动性 5
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-sales', 'metric-sales-target', 30, true),
  ('template-sales', 'metric-conversion-rate', 15, true),
  ('template-sales', 'metric-payment-collection', 15, true),
  ('template-sales', 'metric-quote-response', 10, true),
  ('template-sales', 'metric-task-completion', 15, true),
  ('template-sales', 'metric-teamwork', 10, true),
  ('template-sales', 'metric-initiative', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级销售工程师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-sales-senior', 'metric-sales-target', 30, true),
  ('template-sales-senior', 'metric-conversion-rate', 15, true),
  ('template-sales-senior', 'metric-payment-collection', 15, true),
  ('template-sales-senior', 'metric-quote-response', 10, true),
  ('template-sales-senior', 'metric-task-completion', 10, true),
  ('template-sales-senior', 'metric-problem-solving', 10, true),
  ('template-sales-senior', 'metric-teamwork', 5, true),
  ('template-sales-senior', 'metric-initiative', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 销售经理：销售目标 25 + 团队绩效 20 + 回款 15 + 客户满意度 15 + 领导力 15 + 团队协作 10
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-sales-manager', 'metric-sales-target', 25, true),
  ('template-sales-manager', 'metric-project-on-time', 20, true),
  ('template-sales-manager', 'metric-payment-collection', 15, true),
  ('template-sales-manager', 'metric-customer-satisfaction', 15, true),
  ('template-sales-manager', 'metric-leadership', 15, true),
  ('template-sales-manager', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 销售总监
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-sales-director', 'metric-sales-target', 30, true),
  ('template-sales-director', 'metric-project-on-time', 20, true),
  ('template-sales-director', 'metric-payment-collection', 15, true),
  ('template-sales-director', 'metric-leadership', 20, true),
  ('template-sales-director', 'metric-strategic-execution', 15, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 售前工程师：方案质量 25 + 报价准确 20 + 需求覆盖 15 + 任务完成 15 + 专业能力 10 + 团队协作 10 + 主动性 5
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-presales', 'metric-solution-quality', 25, true),
  ('template-presales', 'metric-quote-accuracy', 20, true),
  ('template-presales', 'metric-requirement-coverage', 15, true),
  ('template-presales', 'metric-task-completion', 15, true),
  ('template-presales', 'metric-professional-skills', 10, true),
  ('template-presales', 'metric-teamwork', 10, true),
  ('template-presales', 'metric-initiative', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级售前工程师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-presales-senior', 'metric-solution-quality', 25, true),
  ('template-presales-senior', 'metric-quote-accuracy', 20, true),
  ('template-presales-senior', 'metric-requirement-coverage', 15, true),
  ('template-presales-senior', 'metric-task-completion', 10, true),
  ('template-presales-senior', 'metric-problem-solving', 15, true),
  ('template-presales-senior', 'metric-professional-skills', 10, true),
  ('template-presales-senior', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 售前主管
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-presales-lead', 'metric-solution-quality', 20, true),
  ('template-presales-lead', 'metric-quote-accuracy', 15, true),
  ('template-presales-lead', 'metric-leadership', 20, true),
  ('template-presales-lead', 'metric-task-completion', 15, true),
  ('template-presales-lead', 'metric-problem-solving', 15, true),
  ('template-presales-lead', 'metric-teamwork', 15, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 机械设计师：设计完成 25 + 设计差错率 20 + 3D 建模质量 15 + 标准件使用率 10 + 任务完成 15 + 团队协作 10 + 责任心 5
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-mech', 'metric-design-completion', 25, true),
  ('template-mech', 'metric-design-error-rate', 20, true),
  ('template-mech', 'metric-3d-model-quality', 15, true),
  ('template-mech', 'metric-standard-part-rate', 10, true),
  ('template-mech', 'metric-task-completion', 15, true),
  ('template-mech', 'metric-teamwork', 10, true),
  ('template-mech', 'metric-responsibility', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级机械设计师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-mech-senior', 'metric-design-completion', 20, true),
  ('template-mech-senior', 'metric-design-error-rate', 15, true),
  ('template-mech-senior', 'metric-3d-model-quality', 15, true),
  ('template-mech-senior', 'metric-standard-part-rate', 10, true),
  ('template-mech-senior', 'metric-problem-solving', 20, true),
  ('template-mech-senior', 'metric-professional-skills', 10, true),
  ('template-mech-senior', 'metric-teamwork', 5, true),
  ('template-mech-senior', 'metric-innovation', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 机械设计主管
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-mech-lead', 'metric-design-completion', 20, true),
  ('template-mech-lead', 'metric-design-error-rate', 15, true),
  ('template-mech-lead', 'metric-leadership', 20, true),
  ('template-mech-lead', 'metric-task-completion', 15, true),
  ('template-mech-lead', 'metric-problem-solving', 15, true),
  ('template-mech-lead', 'metric-teamwork', 15, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 电气设计师：电气设计完成 25 + PLC 程序质量 20 + 接线差错率 15 + 任务完成 15 + 专业能力 10 + 团队协作 10 + 责任心 5
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-elec', 'metric-elec-design-completion', 25, true),
  ('template-elec', 'metric-plc-program-quality', 20, true),
  ('template-elec', 'metric-wiring-error-rate', 15, true),
  ('template-elec', 'metric-task-completion', 15, true),
  ('template-elec', 'metric-professional-skills', 10, true),
  ('template-elec', 'metric-teamwork', 10, true),
  ('template-elec', 'metric-responsibility', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级电气设计师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-elec-senior', 'metric-elec-design-completion', 20, true),
  ('template-elec-senior', 'metric-plc-program-quality', 20, true),
  ('template-elec-senior', 'metric-wiring-error-rate', 10, true),
  ('template-elec-senior', 'metric-problem-solving', 20, true),
  ('template-elec-senior', 'metric-professional-skills', 15, true),
  ('template-elec-senior', 'metric-teamwork', 10, true),
  ('template-elec-senior', 'metric-innovation', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 电气设计主管
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-elec-lead', 'metric-elec-design-completion', 20, true),
  ('template-elec-lead', 'metric-plc-program-quality', 15, true),
  ('template-elec-lead', 'metric-leadership', 20, true),
  ('template-elec-lead', 'metric-task-completion', 15, true),
  ('template-elec-lead', 'metric-problem-solving', 15, true),
  ('template-elec-lead', 'metric-teamwork', 15, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 软件工程师：软件开发完成 25 + 软件缺陷率 20 + 测试自动化率 15 + 任务完成 15 + 专业能力 10 + 团队协作 10 + 学习力 5
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-sw', 'metric-sw-dev-completion', 25, true),
  ('template-sw', 'metric-sw-bug-rate', 20, true),
  ('template-sw', 'metric-test-automation-rate', 15, true),
  ('template-sw', 'metric-task-completion', 15, true),
  ('template-sw', 'metric-professional-skills', 10, true),
  ('template-sw', 'metric-teamwork', 10, true),
  ('template-sw', 'metric-learning-ability', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级软件工程师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-sw-senior', 'metric-sw-dev-completion', 20, true),
  ('template-sw-senior', 'metric-sw-bug-rate', 15, true),
  ('template-sw-senior', 'metric-test-automation-rate', 15, true),
  ('template-sw-senior', 'metric-problem-solving', 20, true),
  ('template-sw-senior', 'metric-professional-skills', 15, true),
  ('template-sw-senior', 'metric-innovation', 10, true),
  ('template-sw-senior', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 软件开发主管
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-sw-lead', 'metric-sw-dev-completion', 15, true),
  ('template-sw-lead', 'metric-sw-bug-rate', 10, true),
  ('template-sw-lead', 'metric-leadership', 25, true),
  ('template-sw-lead', 'metric-task-completion', 15, true),
  ('template-sw-lead', 'metric-problem-solving', 15, true),
  ('template-sw-lead', 'metric-teamwork', 10, true),
  ('template-sw-lead', 'metric-innovation', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 视觉工程师：识别准确率 30 + 处理速度 20 + 任务完成 15 + 专业能力 15 + 团队协作 10 + 学习力 10
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-visual', 'metric-visual-accuracy', 30, true),
  ('template-visual', 'metric-visual-speed', 20, true),
  ('template-visual', 'metric-task-completion', 15, true),
  ('template-visual', 'metric-professional-skills', 15, true),
  ('template-visual', 'metric-teamwork', 10, true),
  ('template-visual', 'metric-learning-ability', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级视觉工程师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-visual-senior', 'metric-visual-accuracy', 25, true),
  ('template-visual-senior', 'metric-visual-speed', 20, true),
  ('template-visual-senior', 'metric-problem-solving', 20, true),
  ('template-visual-senior', 'metric-innovation', 15, true),
  ('template-visual-senior', 'metric-professional-skills', 10, true),
  ('template-visual-senior', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 装配技术员：装配质量 25 + 任务完成 25 + 责任心 15 + 团队协作 15 + 出勤率 10 + 学习态度 10
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-assembler', 'metric-assembly-quality', 25, true),
  ('template-assembler', 'metric-task-completion', 25, true),
  ('template-assembler', 'metric-responsibility', 15, true),
  ('template-assembler', 'metric-teamwork', 15, true),
  ('template-assembler', 'metric-attendance', 10, true),
  ('template-assembler', 'metric-learning-ability', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级装配技师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-assembler-senior', 'metric-assembly-quality', 25, true),
  ('template-assembler-senior', 'metric-task-completion', 20, true),
  ('template-assembler-senior', 'metric-problem-solving', 20, true),
  ('template-assembler-senior', 'metric-professional-skills', 15, true),
  ('template-assembler-senior', 'metric-teamwork', 10, true),
  ('template-assembler-senior', 'metric-responsibility', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 调试技术员：调试效率 25 + FAT/SAT 通过率 20 + 任务完成 20 + 责任心 15 + 团队协作 10 + 学习态度 10
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-debugger', 'metric-debug-efficiency', 25, true),
  ('template-debugger', 'metric-fa-sat-pass-rate', 20, true),
  ('template-debugger', 'metric-task-completion', 20, true),
  ('template-debugger', 'metric-responsibility', 15, true),
  ('template-debugger', 'metric-teamwork', 10, true),
  ('template-debugger', 'metric-learning-ability', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级调试技师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-debugger-senior', 'metric-debug-efficiency', 25, true),
  ('template-debugger-senior', 'metric-fa-sat-pass-rate', 20, true),
  ('template-debugger-senior', 'metric-problem-solving', 20, true),
  ('template-debugger-senior', 'metric-professional-skills', 15, true),
  ('template-debugger-senior', 'metric-teamwork', 10, true),
  ('template-debugger-senior', 'metric-responsibility', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 测试工程师：FAT/SAT 通过率 25 + 任务完成 20 + 工作质量 15 + 专业能力 15 + 团队协作 10 + 责任心 10 + 学习力 5
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-tester', 'metric-fa-sat-pass-rate', 25, true),
  ('template-tester', 'metric-task-completion', 20, true),
  ('template-tester', 'metric-quality-rate', 15, true),
  ('template-tester', 'metric-professional-skills', 15, true),
  ('template-tester', 'metric-teamwork', 10, true),
  ('template-tester', 'metric-responsibility', 10, true),
  ('template-tester', 'metric-learning-ability', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 采购工程师：采购及时率 25 + 成本降低 20 + 来料合格率 15 + 任务完成 15 + 专业能力 10 + 团队协作 10 + 责任心 5
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-purchaser', 'metric-procurement-timeliness', 25, true),
  ('template-purchaser', 'metric-cost-reduction', 20, true),
  ('template-purchaser', 'metric-supplier-quality', 15, true),
  ('template-purchaser', 'metric-task-completion', 15, true),
  ('template-purchaser', 'metric-professional-skills', 10, true),
  ('template-purchaser', 'metric-teamwork', 10, true),
  ('template-purchaser', 'metric-responsibility', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级采购工程师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-purchaser-senior', 'metric-procurement-timeliness', 20, true),
  ('template-purchaser-senior', 'metric-cost-reduction', 25, true),
  ('template-purchaser-senior', 'metric-supplier-quality', 15, true),
  ('template-purchaser-senior', 'metric-problem-solving', 15, true),
  ('template-purchaser-senior', 'metric-professional-skills', 10, true),
  ('template-purchaser-senior', 'metric-teamwork', 10, true),
  ('template-purchaser-senior', 'metric-innovation', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- IQC 检验员：来料合格率 30 + 任务完成 20 + 工作质量 15 + 责任心 15 + 专业能力 10 + 团队协作 10
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-iqc', 'metric-iqc-pass-rate', 30, true),
  ('template-iqc', 'metric-task-completion', 20, true),
  ('template-iqc', 'metric-quality-rate', 15, true),
  ('template-iqc', 'metric-responsibility', 15, true),
  ('template-iqc', 'metric-professional-skills', 10, true),
  ('template-iqc', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- OQC 检验员：出货合格率 30 + 任务完成 20 + 工作质量 15 + 责任心 15 + 专业能力 10 + 团队协作 10
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-oqc', 'metric-oqc-pass-rate', 30, true),
  ('template-oqc', 'metric-task-completion', 20, true),
  ('template-oqc', 'metric-quality-rate', 15, true),
  ('template-oqc', 'metric-responsibility', 15, true),
  ('template-oqc', 'metric-professional-skills', 10, true),
  ('template-oqc', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 质量工程师：客户投诉 25 + 过程控制 20 + 任务完成 15 + 问题解决 15 + 专业能力 10 + 团队协作 10 + 责任心 5
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-qa', 'metric-customer-complaint', 25, true),
  ('template-qa', 'metric-quality-rate', 20, true),
  ('template-qa', 'metric-task-completion', 15, true),
  ('template-qa', 'metric-problem-solving', 15, true),
  ('template-qa', 'metric-professional-skills', 10, true),
  ('template-qa', 'metric-teamwork', 10, true),
  ('template-qa', 'metric-responsibility', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 售后工程师：响应及时率 25 + 问题解决率 25 + 客户满意度 20 + 任务完成 15 + 专业能力 10 + 团队协作 5
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-service', 'metric-service-response-time', 25, true),
  ('template-service', 'metric-service-resolution-rate', 25, true),
  ('template-service', 'metric-customer-satisfaction', 20, true),
  ('template-service', 'metric-task-completion', 15, true),
  ('template-service', 'metric-professional-skills', 10, true),
  ('template-service', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级售后工程师
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-service-senior', 'metric-service-response-time', 20, true),
  ('template-service-senior', 'metric-service-resolution-rate', 25, true),
  ('template-service-senior', 'metric-customer-satisfaction', 20, true),
  ('template-service-senior', 'metric-problem-solving', 20, true),
  ('template-service-senior', 'metric-professional-skills', 10, true),
  ('template-service-senior', 'metric-teamwork', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 项目经理：项目准时交付 30 + 预算控制 20 + 风险管理 15 + 任务完成 15 + 领导力 10 + 团队协作 10
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-pm', 'metric-project-on-time', 30, true),
  ('template-pm', 'metric-project-budget', 20, true),
  ('template-pm', 'metric-risk-management', 15, true),
  ('template-pm', 'metric-task-completion', 15, true),
  ('template-pm', 'metric-leadership', 10, true),
  ('template-pm', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 高级项目经理
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-pm-senior', 'metric-project-on-time', 25, true),
  ('template-pm-senior', 'metric-project-budget', 20, true),
  ('template-pm-senior', 'metric-risk-management', 20, true),
  ('template-pm-senior', 'metric-leadership', 15, true),
  ('template-pm-senior', 'metric-problem-solving', 10, true),
  ('template-pm-senior', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 研发工程师：研发进度 25 + 专利产出 20 + 技术突破 20 + 任务完成 15 + 专业能力 10 + 团队协作 10
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-rd', 'metric-rd-progress', 25, true),
  ('template-rd', 'metric-patent-output', 20, true),
  ('template-rd', 'metric-technology-breakthrough', 20, true),
  ('template-rd', 'metric-task-completion', 15, true),
  ('template-rd', 'metric-professional-skills', 10, true),
  ('template-rd', 'metric-teamwork', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- HR 经理
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-hr', 'metric-task-completion', 25, true),
  ('template-hr', 'metric-leadership', 20, true),
  ('template-hr', 'metric-team-performance', 20, true),
  ('template-hr', 'metric-communication', 15, true),
  ('template-hr', 'metric-teamwork', 10, true),
  ('template-hr', 'metric-initiative', 10, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 财务经理
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required) VALUES
  ('template-finance', 'metric-task-completion', 25, true),
  ('template-finance', 'metric-quality-rate', 25, true),
  ('template-finance', 'metric-cost-control', 20, true),
  ('template-finance', 'metric-documentation', 15, true),
  ('template-finance', 'metric-teamwork', 10, true),
  ('template-finance', 'metric-responsibility', 5, true)
ON CONFLICT (template_id, metric_id) DO UPDATE SET weight = EXCLUDED.weight;


-- ============================================
-- 7. 指标 - 部门关联

-- ============================================
INSERT INTO metric_departments (metric_id, department_id)
SELECT m.id, d.id
FROM performance_metrics m, departments d
WHERE m.code IN ('TASK_COMPLETION', 'QUALITY_RATE', 'EFFICIENCY', 'DEADLINE_COMPLIANCE', 'PROFESSIONAL_SKILLS', 'TEAMWORK', 'INITIATIVE')
ON CONFLICT (metric_id, department_id) DO NOTHING;

-- ============================================
-- 8. 指标 - 级别关联
-- ============================================
INSERT INTO metric_levels (metric_id, level)
SELECT m.id, l.level
FROM performance_metrics m, (VALUES ('junior'), ('intermediate'), ('senior'), ('director')) l(level)
ON CONFLICT (metric_id, level) DO NOTHING;

-- ============================================
-- 完成提示
-- ============================================
SELECT '✅ 核心部门、岗位、考核模板初始化完成！' AS result;
