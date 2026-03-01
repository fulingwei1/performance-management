const ExcelJS = require('./backend/node_modules/exceljs');

async function createProjectPlan() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Management Team';
  workbook.created = new Date();
  
  // Sheet 1: 项目总览
  const overviewSheet = workbook.addWorksheet('项目总览');
  
  // 标题
  overviewSheet.mergeCells('A1:H1');
  overviewSheet.getCell('A1').value = '绩效管理系统 - 项目计划（Phase 2 & 3）';
  overviewSheet.getCell('A1').font = { size: 18, bold: true };
  overviewSheet.getCell('A1').alignment = { horizontal: 'center' };
  overviewSheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  // 项目基本信息
  overviewSheet.getCell('A3').value = '项目名称:';
  overviewSheet.getCell('A3').font = { bold: true };
  overviewSheet.getCell('B3').value = '差异化考核系统';
  
  overviewSheet.getCell('A4').value = '当前版本:';
  overviewSheet.getCell('A4').font = { bold: true };
  overviewSheet.getCell('B4').value = 'v1.0.0 (Phase 1 完成)';
  
  overviewSheet.getCell('A5').value = '计划周期:';
  overviewSheet.getCell('A5').font = { bold: true };
  overviewSheet.getCell('B5').value = '7-8 周';
  
  overviewSheet.getCell('A6').value = '开始日期:';
  overviewSheet.getCell('A6').font = { bold: true };
  overviewSheet.getCell('B6').value = '2026-03-03（建议）';
  
  overviewSheet.getCell('A7').value = '预计完成:';
  overviewSheet.getCell('A7').font = { bold: true };
  overviewSheet.getCell('B7').value = '2026-04-28';
  
  // Phase概览
  overviewSheet.getCell('A9').value = 'Phase 概览';
  overviewSheet.getCell('A9').font = { size: 14, bold: true };
  
  overviewSheet.getRow(10).values = ['Phase', '周期', '重点', '状态'];
  overviewSheet.getRow(10).font = { bold: true };
  overviewSheet.getRow(10).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  
  overviewSheet.getRow(11).values = ['Phase 1', '1周', '核心功能+差异化评分', '✅ 已完成'];
  overviewSheet.getRow(12).values = ['Phase 2', '2-3周', '高级功能+技术优化+运维', '🔜 计划中'];
  overviewSheet.getRow(13).values = ['Phase 3', '3-4周', 'AI智能化+数据分析', '🔜 计划中'];
  
  // 设置列宽
  overviewSheet.columns = [
    { width: 15 },
    { width: 30 },
    { width: 40 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 }
  ];
  
  // Sheet 2: Phase 2 详细计划
  const phase2Sheet = workbook.addWorksheet('Phase 2 详细计划');
  
  // 标题
  phase2Sheet.mergeCells('A1:G1');
  phase2Sheet.getCell('A1').value = 'Phase 2: 高级功能（2-3周）';
  phase2Sheet.getCell('A1').font = { size: 16, bold: true };
  phase2Sheet.getCell('A1').alignment = { horizontal: 'center' };
  phase2Sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  };
  
  // 表头
  phase2Sheet.getRow(3).values = ['模块', '功能点', '工时估算', '优先级', '负责人', '开始日期', '完成日期'];
  phase2Sheet.getRow(3).font = { bold: true };
  phase2Sheet.getRow(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }
  };
  
  const phase2Data = [
    // 360度互评
    ['360度互评', '同事互评功能', '2天', 'P0', '待分配', '2026-03-03', '2026-03-04'],
    ['', '下属评上级', '1天', 'P1', '待分配', '2026-03-05', '2026-03-05'],
    ['', '跨部门协作评价', '1天', 'P1', '待分配', '2026-03-06', '2026-03-06'],
    ['', '匿名评价设置', '0.5天', 'P2', '待分配', '2026-03-07', '2026-03-07'],
    ['', '互评权重配置', '1天', 'P1', '待分配', '2026-03-07', '2026-03-07'],
    
    // 绩效面谈记录
    ['绩效面谈记录', '面谈计划安排', '1天', 'P1', '待分配', '2026-03-10', '2026-03-10'],
    ['', '面谈记录模板', '1天', 'P1', '待分配', '2026-03-11', '2026-03-11'],
    ['', '改进计划制定', '1天', 'P1', '待分配', '2026-03-12', '2026-03-12'],
    ['', '面谈历史查询', '0.5天', 'P2', '待分配', '2026-03-13', '2026-03-13'],
    ['', '跟进提醒', '1天', 'P2', '待分配', '2026-03-13', '2026-03-13'],
    
    // 个人发展计划
    ['个人发展计划(IDP)', '技能评估矩阵', '2天', 'P2', '待分配', '2026-03-14', '2026-03-17'],
    ['', '发展目标设定', '1天', 'P2', '待分配', '2026-03-17', '2026-03-17'],
    ['', '学习计划制定', '1天', 'P2', '待分配', '2026-03-18', '2026-03-18'],
    ['', '进度跟踪', '1天', 'P2', '待分配', '2026-03-19', '2026-03-19'],
    
    // 晋升申请流程
    ['晋升申请流程', '晋升资格检查', '1天', 'P1', '待分配', '2026-03-20', '2026-03-20'],
    ['', '申请表单', '1天', 'P1', '待分配', '2026-03-21', '2026-03-21'],
    ['', '多级审批流程', '2天', 'P0', '待分配', '2026-03-24', '2026-03-25'],
    
    // 单元测试
    ['单元测试', '后端Model测试', '2天', 'P0', '待分配', '2026-03-26', '2026-03-27'],
    ['', '后端Controller测试', '2天', 'P0', '待分配', '2026-03-27', '2026-03-28'],
    ['', '前端组件测试', '2天', 'P1', '待分配', '2026-03-31', '2026-04-01'],
    ['', 'E2E测试', '1天', 'P1', '待分配', '2026-04-02', '2026-04-02'],
    
    // 性能优化
    ['性能优化', '代码分割', '1天', 'P1', '待分配', '2026-04-03', '2026-04-03'],
    ['', '懒加载', '1天', 'P1', '待分配', '2026-04-04', '2026-04-04'],
    ['', 'Bundle优化', '1天', 'P2', '待分配', '2026-04-07', '2026-04-07'],
    
    // CI/CD
    ['CI/CD', 'GitHub Actions配置', '1天', 'P0', '待分配', '2026-04-08', '2026-04-08'],
    ['', '自动化测试', '1天', 'P0', '待分配', '2026-04-09', '2026-04-09'],
    ['', '自动化部署', '2天', 'P0', '待分配', '2026-04-10', '2026-04-11'],
    
    // 生产部署
    ['生产部署', 'Docker配置', '1天', 'P0', '待分配', '2026-04-14', '2026-04-14'],
    ['', '数据库迁移', '1天', 'P0', '待分配', '2026-04-15', '2026-04-15'],
    ['', '环境配置', '1天', 'P0', '待分配', '2026-04-16', '2026-04-16'],
    
    // 监控告警
    ['监控告警', 'Sentry集成', '1天', 'P1', '待分配', '2026-04-17', '2026-04-17'],
    ['', '告警配置', '1天', 'P1', '待分配', '2026-04-18', '2026-04-18'],
  ];
  
  phase2Data.forEach((row, index) => {
    phase2Sheet.getRow(index + 4).values = row;
  });
  
  // 设置列宽
  phase2Sheet.columns = [
    { width: 18 },
    { width: 25 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 15 },
    { width: 15 }
  ];
  
  // Sheet 3: Phase 3 详细计划
  const phase3Sheet = workbook.addWorksheet('Phase 3 详细计划');
  
  // 标题
  phase3Sheet.mergeCells('A1:G1');
  phase3Sheet.getCell('A1').value = 'Phase 3: 智能化（3-4周）';
  phase3Sheet.getCell('A1').font = { size: 16, bold: true };
  phase3Sheet.getCell('A1').alignment = { horizontal: 'center' };
  phase3Sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' }
  };
  
  // 表头
  phase3Sheet.getRow(3).values = ['模块', '功能点', '工时估算', '优先级', '负责人', '开始日期', '完成日期'];
  phase3Sheet.getRow(3).font = { bold: true };
  phase3Sheet.getRow(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF2CC' }
  };
  
  const phase3Data = [
    // AI评分建议
    ['AI评分建议', '历史数据分析', '2天', 'P1', '待分配', '2026-04-21', '2026-04-22'],
    ['', '评分推荐算法', '3天', 'P1', '待分配', '2026-04-23', '2026-04-25'],
    ['', '参考范围计算', '1天', 'P2', '待分配', '2026-04-28', '2026-04-28'],
    
    // 异常评分检测
    ['异常评分检测', '统计分析算法', '2天', 'P0', '待分配', '2026-04-29', '2026-04-30'],
    ['', '异常预警', '1天', 'P0', '待分配', '2026-05-01', '2026-05-01'],
    ['', '评分倾向分析', '1天', 'P1', '待分配', '2026-05-02', '2026-05-02'],
    
    // 绩效预测
    ['绩效预测', '时间序列模型', '3天', 'P2', '待分配', '2026-05-05', '2026-05-07'],
    ['', '高潜力员工识别', '2天', 'P1', '待分配', '2026-05-08', '2026-05-09'],
    ['', '风险预警', '1天', 'P1', '待分配', '2026-05-12', '2026-05-12'],
    
    // NLP评价生成
    ['NLP评价生成', 'GPT/Claude集成', '2天', 'P2', '待分配', '2026-05-13', '2026-05-14'],
    ['', '提示词工程', '2天', 'P2', '待分配', '2026-05-15', '2026-05-16'],
    ['', '多样化表述', '1天', 'P2', '待分配', '2026-05-19', '2026-05-19'],
    
    // 绩效趋势可视化
    ['绩效趋势可视化', '个人绩效曲线', '1天', 'P1', '待分配', '2026-05-20', '2026-05-20'],
    ['', '部门热力图', '2天', 'P1', '待分配', '2026-05-21', '2026-05-22'],
    ['', '评分分布图', '1天', 'P1', '待分配', '2026-05-23', '2026-05-23'],
    
    // 部门对比分析
    ['部门对比分析', '跨部门对比', '2天', 'P1', '待分配', '2026-05-26', '2026-05-27'],
    ['', '同岗位对比', '1天', 'P2', '待分配', '2026-05-28', '2026-05-28'],
    ['', '标杆分析', '2天', 'P2', '待分配', '2026-05-29', '2026-05-30'],
    
    // 个人成长轨迹
    ['个人成长轨迹', '成长曲线', '1天', 'P1', '待分配', '2026-06-02', '2026-06-02'],
    ['', '能力雷达图', '2天', 'P1', '待分配', '2026-06-03', '2026-06-04'],
    ['', '里程碑记录', '1天', 'P2', '待分配', '2026-06-05', '2026-06-05'],
    
    // 组织健康度
    ['组织健康度报告', '绩效分布分析', '2天', 'P2', '待分配', '2026-06-06', '2026-06-09'],
    ['', '离职风险预警', '2天', 'P1', '待分配', '2026-06-10', '2026-06-11'],
    ['', '改进建议生成', '2天', 'P2', '待分配', '2026-06-12', '2026-06-13'],
  ];
  
  phase3Data.forEach((row, index) => {
    phase3Sheet.getRow(index + 4).values = row;
  });
  
  // 设置列宽
  phase3Sheet.columns = [
    { width: 18 },
    { width: 25 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 15 },
    { width: 15 }
  ];
  
  // Sheet 4: 里程碑计划
  const milestoneSheet = workbook.addWorksheet('里程碑计划');
  
  milestoneSheet.mergeCells('A1:E1');
  milestoneSheet.getCell('A1').value = '项目里程碑';
  milestoneSheet.getCell('A1').font = { size: 16, bold: true };
  milestoneSheet.getCell('A1').alignment = { horizontal: 'center' };
  milestoneSheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF6B6B' }
  };
  
  milestoneSheet.getRow(3).values = ['里程碑', '日期', '交付物', '验收标准', '状态'];
  milestoneSheet.getRow(3).font = { bold: true };
  milestoneSheet.getRow(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE0E0' }
  };
  
  const milestones = [
    ['Phase 1 完成', '2026-03-01', '核心功能+文档', '测试100%通过', '✅ 完成'],
    ['Phase 2 Week 1', '2026-03-14', '360度互评+面谈记录', '功能测试通过', '🔜 计划'],
    ['Phase 2 Week 2', '2026-03-21', 'IDP+晋升流程', '用户验收通过', '🔜 计划'],
    ['Phase 2 Week 3', '2026-03-28', '单元测试+性能优化', '覆盖率>80%', '🔜 计划'],
    ['Phase 2 完成', '2026-04-18', '生产部署+监控', '系统稳定运行', '🔜 计划'],
    ['Phase 3 Week 1', '2026-05-02', 'AI评分+异常检测', '准确率>90%', '🔜 计划'],
    ['Phase 3 Week 2', '2026-05-16', '绩效预测+NLP', '预测偏差<10%', '🔜 计划'],
    ['Phase 3 Week 3', '2026-05-30', '可视化+对比分析', '图表渲染<1s', '🔜 计划'],
    ['Phase 3 完成', '2026-06-13', '组织健康度报告', '完整功能验收', '🔜 计划'],
  ];
  
  milestones.forEach((row, index) => {
    milestoneSheet.getRow(index + 4).values = row;
  });
  
  milestoneSheet.columns = [
    { width: 18 },
    { width: 15 },
    { width: 30 },
    { width: 25 },
    { width: 12 }
  ];
  
  // Sheet 5: 资源需求
  const resourceSheet = workbook.addWorksheet('资源需求');
  
  resourceSheet.mergeCells('A1:D1');
  resourceSheet.getCell('A1').value = '资源需求与分配';
  resourceSheet.getCell('A1').font = { size: 16, bold: true };
  resourceSheet.getCell('A1').alignment = { horizontal: 'center' };
  resourceSheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF9B59B6' }
  };
  
  resourceSheet.getRow(3).values = ['角色', '技能要求', '投入时间', '备注'];
  resourceSheet.getRow(3).font = { bold: true };
  
  const resources = [
    ['全栈开发', 'TypeScript + React + Node.js', '全职 6-8周', 'Phase 2&3核心开发'],
    ['后端开发', 'Node.js + PostgreSQL', '全职 4-5周', 'API开发+测试'],
    ['前端开发', 'React + TailwindCSS', '全职 4-5周', 'UI组件+交互'],
    ['测试工程师', 'Jest + Vitest + Playwright', '全职 2周', '单元测试+E2E'],
    ['DevOps工程师', 'Docker + CI/CD', '兼职 1周', '部署+监控'],
    ['数据科学家', 'Python + ML', '兼职 2-3周', 'AI模型开发'],
    ['UI/UX设计师', 'Figma', '兼职 1周', '界面优化'],
    ['产品经理', '需求分析', '兼职 持续', '需求评审+验收'],
  ];
  
  resources.forEach((row, index) => {
    resourceSheet.getRow(index + 4).values = row;
  });
  
  resourceSheet.columns = [
    { width: 18 },
    { width: 35 },
    { width: 18 },
    { width: 30 }
  ];
  
  // Sheet 6: 风险管理
  const riskSheet = workbook.addWorksheet('风险管理');
  
  riskSheet.mergeCells('A1:E1');
  riskSheet.getCell('A1').value = '风险识别与应对';
  riskSheet.getCell('A1').font = { size: 16, bold: true };
  riskSheet.getCell('A1').alignment = { horizontal: 'center' };
  riskSheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE74C3C' }
  };
  
  riskSheet.getRow(3).values = ['风险项', '影响', '概率', '应对措施', '负责人'];
  riskSheet.getRow(3).font = { bold: true };
  
  const risks = [
    ['技术债务累积', '高', '中', '每周代码review + 重构时间预留', 'Tech Lead'],
    ['测试覆盖不足', '高', '高', 'Phase 2优先补测试 + 强制覆盖率', '测试工程师'],
    ['性能问题', '中', '中', '定期性能测试 + Bundle分析', '前端开发'],
    ['AI模型准确率低', '中', '中', '充分训练数据 + 模型调优', '数据科学家'],
    ['部署失败', '高', '低', 'CI/CD自动化 + 回滚机制', 'DevOps'],
    ['需求变更', '中', '高', '敏捷迭代 + 变更评审流程', '产品经理'],
    ['资源不足', '高', '中', '优先级排序 + 外部支援', '项目经理'],
    ['用户反馈负面', '中', '低', '快速响应 + 持续改进', '全团队'],
  ];
  
  risks.forEach((row, index) => {
    riskSheet.getRow(index + 4).values = row;
  });
  
  riskSheet.columns = [
    { width: 20 },
    { width: 10 },
    { width: 10 },
    { width: 40 },
    { width: 15 }
  ];
  
  // 保存文件
  await workbook.xlsx.writeFile('绩效系统Phase2-3项目计划.xlsx');
  console.log('✅ Excel项目计划已生成：绩效系统Phase2-3项目计划.xlsx');
}

createProjectPlan().catch(console.error);
