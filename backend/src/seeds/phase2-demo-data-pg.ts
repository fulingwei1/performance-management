/**
 * Phase 2 演示数据种子脚本 (PostgreSQL适配版)
 * 适配实际数据库表结构
 */

import { query } from '../config/database';

async function cleanData(): Promise<void> {
  console.log('🧹 清理旧数据...');
  await query('DELETE FROM improvement_plans', []);
  await query('DELETE FROM interview_records', []);
  await query('DELETE FROM interview_plans', []);
  await query('DELETE FROM review_statistics', []);
  await query('DELETE FROM peer_reviews WHERE id LIKE $1', ['seed_%']);
  await query('DELETE FROM review_relationships', []);
  await query('DELETE FROM review_cycles', []);
  console.log('✅ 清理完成');
}

async function seedReviewCycles(): Promise<{ q1Id: number; q4Id: number }> {
  console.log('\n📊 创建互评周期...');
  const q4 = await query(
    `INSERT INTO review_cycles (name, description, start_date, end_date, status, review_type, is_anonymous, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    ['2025年Q4同事互评', '2025年第四季度360度互评', '2025-12-01', '2025-12-20', 'closed', 'peer', true, 'hr001']
  );
  const q1 = await query(
    `INSERT INTO review_cycles (name, description, start_date, end_date, status, review_type, is_anonymous, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    ['2026年Q1同事互评', '2026年第一季度360度互评', '2026-02-15', '2026-03-15', 'active', 'peer', true, 'hr001']
  );
  console.log(`  ✅ 2个周期 (Q4=${q4[0].id}, Q1=${q1[0].id})`);
  return { q4Id: q4[0].id, q1Id: q1[0].id };
}

async function seedRelationships(q4Id: number, q1Id: number): Promise<void> {
  console.log('\n🔗 创建评价关系...');
  const rels = [
    [q4Id, 'e002', 'e013', 'peer', 1.0, 'completed'],
    [q4Id, 'e013', 'e002', 'peer', 1.0, 'completed'],
    [q4Id, 'e012', 'e034', 'peer', 1.0, 'completed'],
    [q4Id, 'e034', 'e012', 'peer', 1.0, 'completed'],
    [q4Id, 'e005', 'm001', 'subordinate', 0.8, 'completed'],
    [q4Id, 'e001', 'm002', 'subordinate', 0.8, 'completed'],
    [q4Id, 'e033', 'e022', 'cross_dept', 0.6, 'completed'],
    [q1Id, 'e002', 'e006', 'peer', 1.0, 'completed'],
    [q1Id, 'e006', 'e002', 'peer', 1.0, 'pending'],
    [q1Id, 'e031', 'e012', 'peer', 1.0, 'completed'],
    [q1Id, 'e012', 'e031', 'peer', 1.0, 'pending'],
    [q1Id, 'e033', 'm003', 'subordinate', 0.8, 'completed'],
    [q1Id, 'e001', 'e008', 'cross_dept', 0.6, 'pending'],
    [q1Id, 'e022', 'e033', 'cross_dept', 0.6, 'completed'],
  ];
  for (const r of rels) {
    await query(
      `INSERT INTO review_relationships (cycle_id, reviewer_id, reviewee_id, relationship_type, weight, status)
       VALUES ($1,$2,$3,$4,$5,$6)`, r
    );
  }
  console.log(`  ✅ ${rels.length} 条评价关系`);
}

async function seedPeerReviews(): Promise<void> {
  console.log('\n📝 创建互评记录...');
  // Adapt to actual peer_reviews schema: id, reviewer_id, reviewee_id, record_id, collaboration, professionalism, communication, comment, month
  const reviews = [
    ['seed_pr001', 'e002', 'e013', 'seed_rec001', 4.0, 4.5, 3.5, '刘佩锋专业技术扎实，测试方案设计合理。跨部门沟通时偶尔不够主动。', '2025-12'],
    ['seed_pr002', 'e013', 'e002', 'seed_rec002', 4.5, 4.0, 4.0, '叶桂锋工作认真负责，测试文档编写规范。在新技术学习上可以更积极。', '2025-12'],
    ['seed_pr003', 'e012', 'e034', 'seed_rec003', 3.5, 4.5, 3.0, '田求发技术开发能力强，代码质量高。文档编写有时不够及时。', '2025-12'],
    ['seed_pr004', 'e034', 'e012', 'seed_rec004', 4.0, 3.5, 4.5, '王伟超沟通能力优秀，工作态度积极。技术深度还可以进一步提升。', '2025-12'],
    ['seed_pr005', 'e005', 'm001', 'seed_rec005', 4.5, 5.0, 4.0, '张丙波经理技术视野开阔，决策果断。希望能更多关注团队成员的成长。', '2025-12'],
    ['seed_pr006', 'e001', 'm002', 'seed_rec006', 4.0, 4.0, 4.5, '宋魁经理市场嗅觉敏锐，客户关系维护出色。内部流程管理有待优化。', '2025-12'],
    ['seed_pr007', 'e033', 'e022', 'seed_rec007', 3.5, 3.5, 4.5, '钱颖萱商务流程熟练，合同审核细致。对技术方案的理解深度不够。', '2025-12'],
    ['seed_pr008', 'e002', 'e006', 'seed_rec008', 4.0, 3.0, 3.5, '黄鸿工作踏实执行力强，但主动性不够，复杂问题分析能力需锻炼。', '2026-02'],
    ['seed_pr009', 'e031', 'e012', 'seed_rec009', 4.5, 4.0, 4.0, '王伟超技术基础不错，学习能力强。代码review参与度可以提高。', '2026-03'],
    ['seed_pr010', 'e033', 'm003', 'seed_rec010', 4.0, 4.5, 4.5, '陈亮经理项目管理专业，沟通透明及时。对新工具的接受度可以更高。', '2026-02'],
    ['seed_pr011', 'e022', 'e033', 'seed_rec011', 4.0, 4.0, 3.5, '罗畅售前技术支持专业、响应及时。偶尔在时间预估上过于乐观。', '2026-02'],
  ];
  for (const r of reviews) {
    await query(
      `INSERT INTO peer_reviews (id, reviewer_id, reviewee_id, record_id, collaboration, professionalism, communication, comment, month)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, r
    );
  }
  console.log(`  ✅ ${reviews.length} 条互评记录`);
}

async function seedInterviewPlans(): Promise<number[]> {
  console.log('\n📋 创建面谈计划...');
  const plans = [
    ['2026年Q1绩效面谈 - 叶桂锋', '第一季度常规绩效回顾', 'regular', '2026-03-10', '14:00', 60, 'm001', 'e002', 'scheduled'],
    ['2026年Q1绩效面谈 - 王伟超', '重点关注新能源项目表现', 'regular', '2026-02-20', '10:00', 45, 'm001', 'e012', 'completed'],
    ['试用期转正面谈 - 黄鸿', '试用期满3个月转正评估', 'probation', '2026-01-15', '15:00', 45, 'm001', 'e006', 'completed'],
    ['高级工程师晋升面谈 - 田求发', '晋升评估技术能力和领导潜力', 'promotion', '2026-02-25', '09:30', 60, 'm003', 'e034', 'completed'],
    ['离职面谈 - 程修强', '了解离职原因并收集反馈', 'exit', '2026-01-20', '11:00', 30, 'm002', 'e011', 'completed'],
    ['2026年Q1绩效面谈 - 姬中华', '因出差推迟待重新安排', 'regular', '2026-03-05', '14:00', 45, 'm001', 'e005', 'cancelled'],
    ['年度绩效面谈 - 罗畅', '2025年度绩效回顾及2026年工作规划', 'regular', '2026-03-15', '10:00', 60, 'm003', 'e033', 'scheduled'],
  ];
  const ids: number[] = [];
  for (const p of plans) {
    const rows = await query(
      `INSERT INTO interview_plans (title, description, interview_type, scheduled_date, scheduled_time, duration_minutes, manager_id, employee_id, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [...p, 'hr001']
    );
    ids.push(rows[0].id);
  }
  console.log(`  ✅ ${plans.length} 条面谈计划`);
  return ids;
}

async function seedInterviewRecords(planIds: number[]): Promise<number[]> {
  console.log('\n📄 创建面谈记录...');
  const records = [
    {
      planId: planIds[1], emp: 'e012', mgr: 'm001', date: '2026-02-20', time: '10:00', dur: 50,
      summary: '本季度主要负责新能源项目核心控制模块开发，独立完成电池管理系统软件架构设计。',
      feedback: '表现优异，技术能力有明显提升。建议下季度承担技术方案评审工作。',
      achievements: '1. 电池管理系统核心模块提前2周交付\n2. 自动化测试效率提升30%\n3. 技术文档12份',
      challenges: '多线程并发调试耗时；与硬件团队接口对接初期沟通不畅',
      strengths: '学习能力强，技术进步快；工作认真，责任心强',
      improvements: '架构设计能力需提升；代码review参与度需提高',
      rating: 4.2, perf: 4.0, pot: 4.5, nbPerf: 'high', nbPot: 'high', status: 'approved',
    },
    {
      planId: planIds[2], emp: 'e006', mgr: 'm001', date: '2026-01-15', time: '15:00', dur: 40,
      summary: '试用期3个月完成5个项目的测试用例设计和执行，正在学习自动化测试。',
      feedback: '表现稳定，学习态度好，但主动性还需加强。建议重点培养独立分析问题的能力。',
      achievements: '1. 完成5个项目功能测试，发现有效缺陷23个\n2. 测试用例文档8份\n3. 掌握TestBench操作',
      challenges: '对产品业务逻辑理解不够深；复杂bug排查效率较低',
      strengths: '工作认真、执行力强、学习态度好',
      improvements: '提升测试分析设计能力；加强业务理解；培养主动发现问题意识',
      rating: 3.5, perf: 3.5, pot: 3.5, nbPerf: 'medium', nbPot: 'medium', status: 'approved',
    },
    {
      planId: planIds[3], emp: 'e034', mgr: 'm003', date: '2026-02-25', time: '09:30', dur: 55,
      summary: '过去一年承担3个重要项目技术负责人角色，在嵌入式开发、系统集成方面经验丰富，开始指导2名新人。',
      feedback: '技术能力扎实，项目经验丰富。推荐晋升高级工程师，建议加强文档规范性和管理能力。',
      achievements: '1. 3个重要项目100%客户验收\n2. 解决PLC通讯故障节约15万元\n3. 指导2名新人\n4. 申请专利1项',
      challenges: '跨部门技术协调资源分配困难；新技术选型需更多调研',
      strengths: '技术功底深厚、问题解决能力强、有技术指导能力',
      improvements: '项目管理系统性需提升；技术文档可更规范；跨部门影响力需加强',
      rating: 4.5, perf: 4.5, pot: 4.0, nbPerf: 'high', nbPot: 'high', status: 'approved',
    },
  ];
  const ids: number[] = [];
  for (const r of records) {
    const rows = await query(
      `INSERT INTO interview_records (plan_id, employee_id, manager_id, interview_date, interview_time, duration_minutes,
        employee_summary, manager_feedback, achievements, challenges, strengths, improvements,
        overall_rating, performance_score, potential_score, nine_box_performance, nine_box_potential, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
      [r.planId, r.emp, r.mgr, r.date, r.time, r.dur, r.summary, r.feedback, r.achievements,
       r.challenges, r.strengths, r.improvements, r.rating, r.perf, r.pot, r.nbPerf, r.nbPot, r.status]
    );
    ids.push(rows[0].id);
  }
  console.log(`  ✅ ${records.length} 条面谈记录`);
  return ids;
}

async function seedImprovementPlans(recordIds: number[]): Promise<void> {
  console.log('\n🎯 创建改进计划...');
  const plans = [
    [recordIds[0], 'e012', 'm001', '提升系统架构设计能力', '学习架构设计模式，参与方案评审', 'skill', 'high', '2026-03-01', '2026-06-30', 'in_progress', 30, '推荐书目+每周技术评审', '每月1次架构指导'],
    [recordIds[0], 'e012', 'm001', '提高Code Review参与度', '每周至少参与2次代码评审', 'behavior', 'medium', '2026-03-01', '2026-05-31', 'in_progress', 50, 'GitLab代码审查权限', '团队群提醒review任务'],
    [recordIds[1], 'e006', 'm001', '掌握自动化测试基础', '学习Python+pytest，完成3个项目自动化脚本', 'skill', 'high', '2026-02-01', '2026-05-31', 'in_progress', 20, 'Python培训视频+环境手册', '叶桂锋作为mentor每周辅导'],
    [recordIds[2], 'e034', 'm003', '完善技术文档规范', '制定文档模板，推动规范化', 'performance', 'medium', '2026-01-01', '2026-03-31', 'completed', 100, '行业文档模板库', '协调HR和品质部'],
    [recordIds[2], 'e034', 'm003', '提升项目管理能力', '学习PMP基础，实践甘特图和风险管理', 'skill', 'medium', '2026-03-01', '2026-08-31', 'not_started', 0, 'PMP学习资料+PM软件许可', '推荐Q3 PMP培训班'],
  ];
  for (const p of plans) {
    await query(
      `INSERT INTO improvement_plans (interview_record_id, employee_id, manager_id, goal, description, category, priority,
        start_date, target_date, status, progress_percentage, resources_needed, support_from_manager)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, p
    );
  }
  console.log(`  ✅ ${plans.length} 条改进计划`);
}

async function main() {
  console.log('🌱 Phase 2 演示数据 (PostgreSQL适配版)\n');
  try {
    await cleanData();
    const { q1Id, q4Id } = await seedReviewCycles();
    await seedRelationships(q4Id, q1Id);
    // Skip peer_reviews - requires performance_records FK, different schema than expected
    console.log('\n📝 互评记录跳过（需要performance_records外键）');
    const planIds = await seedInterviewPlans();
    const recordIds = await seedInterviewRecords(planIds);
    await seedImprovementPlans(recordIds);
    console.log('\n🎉 Phase 2 演示数据生成完成！');
  } catch (err) {
    console.error('❌ 失败:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
