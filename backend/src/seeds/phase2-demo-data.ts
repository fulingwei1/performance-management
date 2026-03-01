/**
 * Phase 2 演示数据种子脚本
 * 为 360度互评 和 绩效面谈记录 生成完整演示数据
 * 
 * 使用方式: npm run seed:phase2
 * 清理方式: npm run seed:phase2:clean
 */

import { query } from '../config/database';

// ============================================================
// 员工ID映射（使用真实员工数据）
// ============================================================
const EMPLOYEES = {
  // 经理
  mgr_zhangbingbo: { id: 'm001', name: '张丙波', dept: '工程技术中心', sub: '新能源技术部' },
  mgr_songkui: { id: 'm002', name: '宋魁', dept: '营销中心', sub: '销售部' },
  mgr_chenliang: { id: 'm003', name: '陈亮', dept: '项目管理部', sub: '项目管理组' },
  mgr_gaoyong: { id: 'm004', name: '高勇', dept: '制造中心', sub: '生产部' },
  // GM
  gm_fulingwei: { id: 'gm001', name: '符凌维', dept: '总经办', sub: '总经办' },
  // HR
  hr_linzuoqian: { id: 'hr001', name: '林作倩', dept: '人力行政部', sub: '人事组' },
  // 员工
  emp_yaohong: { id: 'e001', name: '姚洪', dept: '营销中心', sub: '销售部' },
  emp_yeguifeng: { id: 'e002', name: '叶桂锋', dept: '工程技术中心', sub: '测试部' },
  emp_jizhonghua: { id: 'e005', name: '姬中华', dept: '工程技术中心', sub: '新能源技术部' },
  emp_huanghong: { id: 'e006', name: '黄鸿', dept: '工程技术中心', sub: '测试部' },
  emp_liliang: { id: 'e008', name: '李亮', dept: '制造中心', sub: '品质部' },
  emp_chengxiuqiang: { id: 'e011', name: '程修强', dept: '教育装备事业部', sub: '教育装备' },
  emp_wangweichao: { id: 'e012', name: '王伟超', dept: '工程技术中心', sub: '技术开发部' },
  emp_liupeifeng: { id: 'e013', name: '刘佩锋', dept: '工程技术中心', sub: '测试部' },
  emp_qianyingxuan: { id: 'e022', name: '钱颖萱', dept: '营销中心', sub: '商务部' },
  emp_zhangjianning: { id: 'e031', name: '张建卿', dept: '工程技术中心', sub: '技术开发部' },
  emp_luochang: { id: 'e033', name: '罗畅', dept: '工程技术中心', sub: '售前技术部' },
  emp_tianqiufa: { id: 'e034', name: '田求发', dept: '工程技术中心', sub: '技术开发部' },
};

// ============================================================
// 清理函数
// ============================================================
async function cleanPhase2Data(): Promise<void> {
  console.log('🧹 清理 Phase 2 演示数据...');
  
  // 按外键依赖顺序删除
  await query('DELETE FROM improvement_plans WHERE manager_id IN (SELECT id FROM employees WHERE id LIKE $1 OR id LIKE $2 OR id LIKE $3 OR id LIKE $4)', ['m%', 'e%', 'gm%', 'hr%']);
  await query('DELETE FROM interview_records WHERE manager_id IN (SELECT id FROM employees WHERE id LIKE $1 OR id LIKE $2 OR id LIKE $3 OR id LIKE $4)', ['m%', 'e%', 'gm%', 'hr%']);
  await query('DELETE FROM interview_plans WHERE 1=1', []);
  await query('DELETE FROM review_statistics WHERE 1=1', []);
  await query('DELETE FROM peer_reviews WHERE 1=1', []);
  await query('DELETE FROM review_relationships WHERE 1=1', []);
  await query('DELETE FROM review_cycles WHERE 1=1', []);
  
  console.log('✅ Phase 2 数据已清理');
}

// ============================================================
// 360度互评 - 种子数据
// ============================================================
async function seedReviewCycles(): Promise<{ q1CycleId: number; q4CycleId: number }> {
  console.log('\n📊 创建互评周期...');
  
  // 2025 Q4 互评周期（已完成）
  const q4Rows = await query(
    `INSERT INTO review_cycles (name, description, start_date, end_date, status, review_type, is_anonymous, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    ['2025年Q4同事互评', '2025年第四季度360度互评，覆盖全公司核心岗位', '2025-12-01', '2025-12-20', 'closed', 'peer', true, 1]
  );
  const q4CycleId = q4Rows[0].id;
  
  // 2026 Q1 互评周期（进行中）
  const q1Rows = await query(
    `INSERT INTO review_cycles (name, description, start_date, end_date, status, review_type, is_anonymous, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    ['2026年Q1同事互评', '2026年第一季度360度互评，重点关注跨部门协作', '2026-02-15', '2026-03-15', 'active', 'peer', true, 1]
  );
  const q1CycleId = q1Rows[0].id;
  
  console.log(`  ✅ 已创建 2 个互评周期 (Q4=${q4CycleId}, Q1=${q1CycleId})`);
  return { q1CycleId, q4CycleId };
}

async function seedReviewRelationships(q1CycleId: number, q4CycleId: number): Promise<Map<string, number>> {
  console.log('\n🔗 创建评价关系...');
  
  const relationships = [
    // === Q4 已完成周期 ===
    // 同事互评 (peer)
    { cycle: q4CycleId, reviewer: 'e002', reviewee: 'e013', type: 'peer', weight: 1.0, status: 'completed' },
    { cycle: q4CycleId, reviewer: 'e013', reviewee: 'e002', type: 'peer', weight: 1.0, status: 'completed' },
    { cycle: q4CycleId, reviewer: 'e012', reviewee: 'e034', type: 'peer', weight: 1.0, status: 'completed' },
    { cycle: q4CycleId, reviewer: 'e034', reviewee: 'e012', type: 'peer', weight: 1.0, status: 'completed' },
    // 下级评上级 (subordinate)
    { cycle: q4CycleId, reviewer: 'e005', reviewee: 'm001', type: 'subordinate', weight: 0.8, status: 'completed' },
    { cycle: q4CycleId, reviewer: 'e001', reviewee: 'm002', type: 'subordinate', weight: 0.8, status: 'completed' },
    // 跨部门协作 (cross_dept)
    { cycle: q4CycleId, reviewer: 'e033', reviewee: 'e022', type: 'cross_dept', weight: 0.6, status: 'completed' },
    
    // === Q1 进行中周期 ===
    // 同事互评 (peer)
    { cycle: q1CycleId, reviewer: 'e002', reviewee: 'e006', type: 'peer', weight: 1.0, status: 'completed' },
    { cycle: q1CycleId, reviewer: 'e006', reviewee: 'e002', type: 'peer', weight: 1.0, status: 'pending' },
    { cycle: q1CycleId, reviewer: 'e031', reviewee: 'e012', type: 'peer', weight: 1.0, status: 'completed' },
    { cycle: q1CycleId, reviewer: 'e012', reviewee: 'e031', type: 'peer', weight: 1.0, status: 'pending' },
    // 下级评上级 (subordinate)
    { cycle: q1CycleId, reviewer: 'e033', reviewee: 'm003', type: 'subordinate', weight: 0.8, status: 'completed' },
    // 跨部门协作 (cross_dept)
    { cycle: q1CycleId, reviewer: 'e001', reviewee: 'e008', type: 'cross_dept', weight: 0.6, status: 'pending' },
    { cycle: q1CycleId, reviewer: 'e022', reviewee: 'e033', type: 'cross_dept', weight: 0.6, status: 'completed' },
  ];

  const relMap = new Map<string, number>();
  
  for (const rel of relationships) {
    const rows = await query(
      `INSERT INTO review_relationships (cycle_id, reviewer_id, reviewee_id, relationship_type, weight, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [rel.cycle, rel.reviewer, rel.reviewee, rel.type, rel.weight, rel.status]
    );
    relMap.set(`${rel.cycle}-${rel.reviewer}-${rel.reviewee}`, rows[0].id);
  }
  
  console.log(`  ✅ 已创建 ${relationships.length} 条评价关系`);
  return relMap;
}

async function seedPeerReviews(q1CycleId: number, q4CycleId: number, relMap: Map<string, number>): Promise<void> {
  console.log('\n📝 创建互评记录...');
  
  const getRelId = (cycle: number, reviewer: string, reviewee: string) => {
    return relMap.get(`${cycle}-${reviewer}-${reviewee}`) || 0;
  };

  const reviews = [
    // === Q4 已完成 - 6条 ===
    {
      rel: getRelId(q4CycleId, 'e002', 'e013'), cycle: q4CycleId, reviewer: 'e002', reviewee: 'e013',
      teamwork: 4.0, communication: 3.5, professional: 4.5, responsibility: 4.0, innovation: 3.0,
      strengths: '专业技术扎实，测试方案设计合理，能独立完成复杂设备的功能验证。对测试流程的理解深入，多次发现关键缺陷。',
      improvements: '跨部门沟通时偶尔不够主动，建议在项目初期就与开发团队建立定期同步机制。',
      comment: '刘佩锋是测试部的核心骨干，专业能力突出，但在团队协作的主动性上还有提升空间。',
      submitted: '2025-12-15 14:30:00',
    },
    {
      rel: getRelId(q4CycleId, 'e013', 'e002'), cycle: q4CycleId, reviewer: 'e013', reviewee: 'e002',
      teamwork: 4.5, communication: 4.0, professional: 4.0, responsibility: 4.5, innovation: 3.5,
      strengths: '工作认真负责，测试文档编写规范。在紧急项目中主动加班，确保交付质量。善于总结经验并分享给团队。',
      improvements: '在新技术的学习上可以更积极一些，比如自动化测试框架的应用。',
      comment: '叶桂锋是一位可靠的团队成员，责任心强，技术扎实。建议多关注行业新趋势。',
      submitted: '2025-12-16 10:15:00',
    },
    {
      rel: getRelId(q4CycleId, 'e012', 'e034'), cycle: q4CycleId, reviewer: 'e012', reviewee: 'e034',
      teamwork: 3.5, communication: 3.0, professional: 4.5, responsibility: 4.0, innovation: 4.0,
      strengths: '技术开发能力强，代码质量高。在嵌入式系统开发上有独到见解，解决了多个技术难点。',
      improvements: '文档编写有时不够及时，希望能在完成开发后第一时间更新技术文档。沟通时语言可以更简洁。',
      comment: '田求发在技术上是团队的标杆，创新能力好，但在团队协作和文档方面还需加强。',
      submitted: '2025-12-14 16:45:00',
    },
    {
      rel: getRelId(q4CycleId, 'e034', 'e012'), cycle: q4CycleId, reviewer: 'e034', reviewee: 'e012',
      teamwork: 4.0, communication: 4.5, professional: 3.5, responsibility: 4.0, innovation: 3.0,
      strengths: '沟通能力优秀，能有效协调开发和测试之间的需求。工作态度积极，乐于帮助新同事。',
      improvements: '技术深度还可以进一步提升，特别是在硬件调试方面。建议多参与核心模块的开发。',
      comment: '王伟超是团队润滑剂型的人才，协调能力强，建议在技术深度上多投入。',
      submitted: '2025-12-17 09:30:00',
    },
    {
      rel: getRelId(q4CycleId, 'e005', 'm001'), cycle: q4CycleId, reviewer: 'e005', reviewee: 'm001',
      teamwork: 4.5, communication: 4.0, professional: 5.0, responsibility: 4.5, innovation: 4.0,
      strengths: '技术视野开阔，能准确把握新能源行业趋势。决策果断，在项目关键节点给予及时支持和指导。',
      improvements: '有时候对下属的工作细节关注不够，建议在关键项目上增加一对一沟通频次。',
      comment: '张丙波经理技术功底深厚，领导力强，是值得信赖的上级。希望能更多关注团队成员的成长。',
      submitted: '2025-12-18 11:00:00',
    },
    {
      rel: getRelId(q4CycleId, 'e001', 'm002'), cycle: q4CycleId, reviewer: 'e001', reviewee: 'm002',
      teamwork: 4.0, communication: 4.5, professional: 4.0, responsibility: 4.0, innovation: 3.5,
      strengths: '市场嗅觉敏锐，客户关系维护出色。能带领团队完成年度销售目标，激励手段多样化。',
      improvements: '内部流程管理有待优化，销售数据的及时性可以提高。建议建立更规范的客户拜访反馈机制。',
      comment: '宋魁经理在销售管理上经验丰富，团队凝聚力强。在内部管理精细化方面还有空间。',
      submitted: '2025-12-19 15:20:00',
    },
    {
      rel: getRelId(q4CycleId, 'e033', 'e022'), cycle: q4CycleId, reviewer: 'e033', reviewee: 'e022',
      teamwork: 3.5, communication: 4.5, professional: 3.5, responsibility: 4.0, innovation: 3.0,
      strengths: '商务流程熟练，合同审核细致，跨部门协调时态度友善。对客户需求的理解准确。',
      improvements: '对技术方案的理解深度不够，有时需要反复确认需求细节。建议加强技术基础知识的学习。',
      comment: '钱颖萱在商务工作上表现稳定，与技术部门的配合基本顺畅，建议提升技术理解力。',
      submitted: '2025-12-16 17:00:00',
    },
    
    // === Q1 进行中 - 3条已提交 ===
    {
      rel: getRelId(q1CycleId, 'e002', 'e006'), cycle: q1CycleId, reviewer: 'e002', reviewee: 'e006',
      teamwork: 4.0, communication: 3.5, professional: 3.0, responsibility: 4.0, innovation: 2.5,
      strengths: '工作踏实，执行力强，交代的任务都能按时完成。在日常测试工作中很少出错。',
      improvements: '主动性不够，很少提出改进建议。在复杂问题的分析上需要更多锻炼，建议多参与故障根因分析。',
      comment: '黄鸿作为测试部新人进步明显，基础工作扎实，但需要培养独立思考和主动学习的习惯。',
      submitted: '2026-02-28 10:30:00',
    },
    {
      rel: getRelId(q1CycleId, 'e031', 'e012'), cycle: q1CycleId, reviewer: 'e031', reviewee: 'e012',
      teamwork: 4.5, communication: 4.0, professional: 4.0, responsibility: 4.5, innovation: 3.5,
      strengths: '技术基础不错，学习能力强。在Q1的新能源项目中主动承担了核心模块的开发，表现超出预期。',
      improvements: '代码review的参与度可以提高，建议定期组织技术分享，带动团队技术氛围。',
      comment: '王伟超本季度表现亮眼，技术和态度都有明显提升，是重点培养对象。',
      submitted: '2026-03-01 09:15:00',
    },
    {
      rel: getRelId(q1CycleId, 'e033', 'm003'), cycle: q1CycleId, reviewer: 'e033', reviewee: 'm003',
      teamwork: 4.0, communication: 4.5, professional: 4.5, responsibility: 4.0, innovation: 4.0,
      strengths: '项目管理专业，沟通透明及时。遇到客户变更需求时能快速调整计划，减少团队受影响程度。',
      improvements: '对新工具的接受度可以更高一些，比如用甘特图替代Excel做项目排期。',
      comment: '陈亮经理的项目管理能力毋庸置疑，团队氛围好，建议在数字化工具应用上多尝试。',
      submitted: '2026-02-25 14:00:00',
    },
    {
      rel: getRelId(q1CycleId, 'e022', 'e033'), cycle: q1CycleId, reviewer: 'e022', reviewee: 'e033',
      teamwork: 4.0, communication: 3.5, professional: 4.0, responsibility: 4.5, innovation: 3.5,
      strengths: '售前技术支持专业、响应及时。在大客户招标中提供的技术方案质量高，多次帮助拿下关键订单。',
      improvements: '偶尔在时间预估上过于乐观，导致交付进度紧张。建议留出更多buffer。',
      comment: '罗畅在售前支持岗位上表现优秀，是商务团队最信赖的技术伙伴。',
      submitted: '2026-02-27 16:45:00',
    },
  ];

  let count = 0;
  for (const r of reviews) {
    const totalScore = ((r.teamwork + r.communication + r.professional + r.responsibility + r.innovation) / 5);
    await query(
      `INSERT INTO peer_reviews (
        relationship_id, cycle_id, reviewer_id, reviewee_id,
        teamwork_score, communication_score, professional_score, responsibility_score, innovation_score,
        total_score, strengths, improvements, overall_comment, is_anonymous, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        r.rel, r.cycle, r.reviewer, r.reviewee,
        r.teamwork, r.communication, r.professional, r.responsibility, r.innovation,
        Math.round(totalScore * 10) / 10, r.strengths, r.improvements, r.comment, true, r.submitted
      ]
    );
    count++;
  }
  
  console.log(`  ✅ 已创建 ${count} 条互评记录`);
}

async function seedReviewStatistics(q1CycleId: number, q4CycleId: number): Promise<void> {
  console.log('\n📈 更新互评统计...');
  
  // 手动计算统计数据（因为触发器可能不存在于PostgreSQL中）
  const cycles = [q4CycleId, q1CycleId];
  let count = 0;
  
  for (const cycleId of cycles) {
    const stats = await query(
      `SELECT 
        reviewee_id,
        COUNT(*) as total_reviews,
        COUNT(submitted_at) as completed_reviews,
        AVG(teamwork_score) as avg_teamwork,
        AVG(communication_score) as avg_communication,
        AVG(professional_score) as avg_professional,
        AVG(responsibility_score) as avg_responsibility,
        AVG(innovation_score) as avg_innovation,
        AVG(total_score) as avg_total_score
       FROM peer_reviews 
       WHERE cycle_id = $1 AND submitted_at IS NOT NULL
       GROUP BY reviewee_id`,
      [cycleId]
    );
    
    for (const s of stats) {
      await query(
        `INSERT INTO review_statistics (
          cycle_id, reviewee_id, total_reviews, completed_reviews,
          avg_teamwork, avg_communication, avg_professional, avg_responsibility, avg_innovation,
          avg_total_score, last_calculated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          cycleId, s.reviewee_id, s.total_reviews, s.completed_reviews,
          s.avg_teamwork, s.avg_communication, s.avg_professional, s.avg_responsibility, s.avg_innovation,
          s.avg_total_score
        ]
      );
      count++;
    }
  }
  
  console.log(`  ✅ 已创建 ${count} 条统计记录`);
}

// ============================================================
// 绩效面谈 - 种子数据
// ============================================================
async function seedInterviewPlans(): Promise<number[]> {
  console.log('\n📋 创建面谈计划...');
  
  const plans = [
    // 常规面谈 x2
    {
      title: '2026年Q1绩效面谈 - 叶桂锋',
      description: '2026年第一季度常规绩效回顾面谈',
      type: 'regular', date: '2026-03-10', time: '14:00', duration: 60,
      manager: 'm001', employee: 'e002', status: 'scheduled',
    },
    {
      title: '2026年Q1绩效面谈 - 王伟超',
      description: '2026年第一季度常规绩效回顾面谈，重点关注新能源项目表现',
      type: 'regular', date: '2026-02-20', time: '10:00', duration: 45,
      manager: 'm001', employee: 'e012', status: 'completed',
    },
    // 试用期转正
    {
      title: '试用期转正面谈 - 黄鸿',
      description: '黄鸿试用期满3个月转正评估面谈',
      type: 'probation', date: '2026-01-15', time: '15:00', duration: 45,
      manager: 'm001', employee: 'e006', status: 'completed',
    },
    // 晋升评估
    {
      title: '高级工程师晋升面谈 - 田求发',
      description: '田求发申请晋升高级工程师，评估其技术能力和领导潜力',
      type: 'promotion', date: '2026-02-25', time: '09:30', duration: 60,
      manager: 'm003', employee: 'e034', status: 'completed',
    },
    // 离职面谈
    {
      title: '离职面谈 - 程修强',
      description: '程修强提出离职，了解原因并收集反馈',
      type: 'exit', date: '2026-01-20', time: '11:00', duration: 30,
      manager: 'm002', employee: 'e011', status: 'completed',
    },
    // 额外 - 取消的
    {
      title: '2026年Q1绩效面谈 - 姬中华',
      description: '因出差推迟，待重新安排',
      type: 'regular', date: '2026-03-05', time: '14:00', duration: 45,
      manager: 'm001', employee: 'e005', status: 'cancelled',
    },
    // 额外 - 待安排
    {
      title: '年度绩效面谈 - 罗畅',
      description: '2025年度绩效回顾及2026年工作规划',
      type: 'regular', date: '2026-03-15', time: '10:00', duration: 60,
      manager: 'm003', employee: 'e033', status: 'scheduled',
    },
  ];

  const planIds: number[] = [];
  for (const p of plans) {
    const rows = await query(
      `INSERT INTO interview_plans (
        title, description, interview_type, scheduled_date, scheduled_time, duration_minutes,
        manager_id, employee_id, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [p.title, p.description, p.type, p.date, p.time, p.duration, p.manager, p.employee, p.status, 'hr001']
    );
    planIds.push(rows[0].id);
  }
  
  console.log(`  ✅ 已创建 ${plans.length} 条面谈计划`);
  return planIds;
}

async function seedInterviewRecords(planIds: number[]): Promise<number[]> {
  console.log('\n📄 创建面谈记录...');
  
  const records = [
    // 常规面谈记录 - 王伟超 (plan index 1)
    {
      planId: planIds[1], employee: 'e012', manager: 'm001',
      date: '2026-02-20', time: '10:00', duration: 50,
      summary: '本季度主要负责新能源项目的核心控制模块开发，独立完成了电池管理系统的软件架构设计和实现。同时协助测试团队完成了3轮系统集成测试。',
      feedback: '王伟超本季度表现优异，技术能力有明显提升。在新能源项目中展现了很强的学习能力和解决问题的能力。建议下季度可以开始承担一些技术方案评审的工作，逐步培养架构设计能力。',
      achievements: '1. 独立完成电池管理系统核心模块开发，提前2周交付\n2. 优化了自动化测试脚本，测试效率提升30%\n3. 编写技术文档12份，获得团队好评',
      challenges: '1. 多线程并发问题调试花费时间较长，后来通过系统学习并发编程解决\n2. 与硬件团队的接口对接初期沟通不畅，后来建立了每日站会机制',
      strengths: '学习能力强，技术进步快；工作态度认真，责任心强；善于总结和分享',
      improvements: '1. 架构设计能力需要提升\n2. 代码review的参与度需要提高\n3. 对业务需求的理解可以更深入',
      overallRating: 4.2, perfScore: 4.0, potentialScore: 4.5,
      nineBoxPerf: 'high' as const, nineBoxPot: 'high' as const,
      status: 'approved',
    },
    // 试用期转正 - 黄鸿 (plan index 2)
    {
      planId: planIds[2], employee: 'e006', manager: 'm001',
      date: '2026-01-15', time: '15:00', duration: 40,
      summary: '试用期3个月来主要从事功能测试和文档编写工作，完成了5个项目的测试用例设计和执行。对测试流程基本掌握，正在学习自动化测试。',
      feedback: '黄鸿在试用期内表现稳定，能按照要求完成基础测试任务。学习态度好，但主动性还需加强。建议转正后重点培养独立分析问题的能力，同时加快自动化测试技能的学习。',
      achievements: '1. 完成5个项目的功能测试，发现有效缺陷23个\n2. 编写测试用例文档8份\n3. 学习并掌握基本的TestBench操作',
      challenges: '1. 对产品业务逻辑理解不够深，测试覆盖度有欠缺\n2. 遇到复杂bug时排查效率较低',
      strengths: '工作认真、执行力强、学习态度好',
      improvements: '1. 需要提升测试分析和设计能力\n2. 加强对被测产品业务的理解\n3. 培养主动发现和解决问题的意识',
      overallRating: 3.5, perfScore: 3.5, potentialScore: 3.5,
      nineBoxPerf: 'medium' as const, nineBoxPot: 'medium' as const,
      status: 'approved',
    },
    // 晋升评估 - 田求发 (plan index 3)
    {
      planId: planIds[3], employee: 'e034', manager: 'm003',
      date: '2026-02-25', time: '09:30', duration: 55,
      summary: '过去一年在技术开发岗位上承担了3个重要项目的技术负责人角色，均顺利交付。在嵌入式开发、系统集成方面积累了丰富经验，开始指导2名新人。',
      feedback: '田求发技术能力扎实，项目经验丰富。在带新人方面有热情和耐心。推荐晋升高级工程师，同时建议加强技术文档的规范性和团队管理能力。',
      achievements: '1. 主导完成3个重要项目的技术开发，客户验收率100%\n2. 解决生产线PLC通讯故障，节约返修成本约15万元\n3. 指导2名新人，其中1人已能独立承担子模块开发\n4. 申请专利1项',
      challenges: '1. 跨部门技术协调时资源分配困难\n2. 新技术选型决策需要更多的前期调研',
      strengths: '技术功底深厚、问题解决能力强、有较好的技术指导能力',
      improvements: '1. 项目管理的系统性需要提升\n2. 技术文档的编写可以更规范\n3. 跨部门沟通的影响力需要加强',
      overallRating: 4.5, perfScore: 4.5, potentialScore: 4.0,
      nineBoxPerf: 'high' as const, nineBoxPot: 'high' as const,
      status: 'approved',
    },
    // 离职面谈 - 程修强 (plan index 4)
    {
      planId: planIds[4], employee: 'e011', manager: 'm002',
      date: '2026-01-20', time: '11:00', duration: 25,
      summary: '在公司工作3年，主要负责教育装备事业部的业务拓展。因个人职业发展规划调整，计划转行至互联网教育行业。',
      feedback: '程修强在任期间工作表现良好，对教育装备业务有深入理解。离职原因为个人职业转型，非公司管理问题。建议：1)与HR沟通完善离职交接流程；2)关注教育装备事业部人才补充。',
      achievements: '1. 累计开拓客户15家，贡献营收约200万\n2. 建立了教育装备行业客户关系网络\n3. 编写了教育装备产品选型指南',
      challenges: '1. 教育装备市场竞争激烈，毛利空间有限\n2. 事业部规模较小，发展空间受限',
      strengths: '客户关系维护能力强、行业理解深入、工作态度端正',
      improvements: 'N/A（离职面谈）',
      overallRating: 3.8, perfScore: 3.5, potentialScore: 3.0,
      nineBoxPerf: 'medium' as const, nineBoxPot: 'medium' as const,
      status: 'submitted',
    },
  ];

  const recordIds: number[] = [];
  for (const r of records) {
    const rows = await query(
      `INSERT INTO interview_records (
        plan_id, employee_id, manager_id, interview_date, interview_time, duration_minutes,
        employee_summary, manager_feedback, achievements, challenges, strengths, improvements,
        overall_rating, performance_score, potential_score, nine_box_performance, nine_box_potential,
        notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING id`,
      [
        r.planId, r.employee, r.manager, r.date, r.time, r.duration,
        r.summary, r.feedback, r.achievements, r.challenges, r.strengths, r.improvements,
        r.overallRating, r.perfScore, r.potentialScore, r.nineBoxPerf, r.nineBoxPot,
        null, r.status
      ]
    );
    recordIds.push(rows[0].id);
  }
  
  console.log(`  ✅ 已创建 ${records.length} 条面谈记录`);
  return recordIds;
}

async function seedImprovementPlans(recordIds: number[]): Promise<void> {
  console.log('\n🎯 创建改进计划...');
  
  const plans = [
    // 王伟超的改进计划 (recordIds[0])
    {
      recordId: recordIds[0], employee: 'e012', manager: 'm001',
      goal: '提升系统架构设计能力', category: 'skill', priority: 'high',
      description: '通过学习架构设计模式和参与方案评审，提升从模块级到系统级的架构思维能力。',
      startDate: '2026-03-01', targetDate: '2026-06-30',
      status: 'in_progress', progress: 30,
      resources: '推荐书目：《嵌入式系统设计模式》；参与每周技术方案评审会议',
      support: '安排每月1次架构设计指导，推荐参加Q2架构师培训',
    },
    {
      recordId: recordIds[0], employee: 'e012', manager: 'm001',
      goal: '提高Code Review参与度', category: 'behavior', priority: 'medium',
      description: '每周至少参与2次代码评审，输出review意见并记录学习要点。',
      startDate: '2026-03-01', targetDate: '2026-05-31',
      status: 'in_progress', progress: 50,
      resources: '开通GitLab代码审查权限',
      support: '在团队群里@提醒review任务',
    },
    // 黄鸿的改进计划 (recordIds[1])
    {
      recordId: recordIds[1], employee: 'e006', manager: 'm001',
      goal: '掌握自动化测试基础', category: 'skill', priority: 'high',
      description: '学习Python + pytest框架，完成至少3个项目的自动化测试脚本编写。',
      startDate: '2026-02-01', targetDate: '2026-05-31',
      status: 'in_progress', progress: 20,
      resources: 'Python自动化测试培训视频（已分享至网盘）；测试环境搭建手册',
      support: '安排叶桂锋作为mentor，每周1-2次辅导',
    },
    // 田求发的改进计划 (recordIds[2])
    {
      recordId: recordIds[2], employee: 'e034', manager: 'm003',
      goal: '完善技术文档规范', category: 'performance', priority: 'medium',
      description: '制定技术开发部文档模板，推动团队文档规范化。每个项目交付时确保文档完整度达90%以上。',
      startDate: '2026-01-01', targetDate: '2026-03-31',
      status: 'completed', progress: 100,
      resources: '参考行业文档模板库',
      support: '协调HR和品质部共同制定文档规范',
    },
    {
      recordId: recordIds[2], employee: 'e034', manager: 'm003',
      goal: '提升项目管理能力', category: 'skill', priority: 'medium',
      description: '学习PMP项目管理基础知识，在下一个主导项目中实践甘特图和风险管理。',
      startDate: '2026-03-01', targetDate: '2026-08-31',
      status: 'not_started', progress: 0,
      resources: 'PMP学习资料包；项目管理软件许可',
      support: '推荐参加Q3 PMP培训班',
    },
  ];

  let count = 0;
  for (const p of plans) {
    await query(
      `INSERT INTO improvement_plans (
        interview_record_id, employee_id, manager_id, goal, description, category, priority,
        start_date, target_date, status, progress_percentage, resources_needed, support_from_manager
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        p.recordId, p.employee, p.manager, p.goal, p.description, p.category, p.priority,
        p.startDate, p.targetDate, p.status, p.progress, p.resources, p.support
      ]
    );
    count++;
  }
  
  console.log(`  ✅ 已创建 ${count} 条改进计划`);
}

// ============================================================
// 主函数
// ============================================================
async function main(): Promise<void> {
  const isClean = process.argv.includes('--clean');
  
  if (isClean) {
    await cleanPhase2Data();
    process.exit(0);
  }

  console.log('🌱 Phase 2 演示数据种子脚本');
  console.log('================================\n');
  
  try {
    // 先清理旧数据
    await cleanPhase2Data();
    
    // 1. 互评周期
    const { q1CycleId, q4CycleId } = await seedReviewCycles();
    
    // 2. 评价关系
    const relMap = await seedReviewRelationships(q1CycleId, q4CycleId);
    
    // 3. 互评记录
    await seedPeerReviews(q1CycleId, q4CycleId, relMap);
    
    // 4. 互评统计
    await seedReviewStatistics(q1CycleId, q4CycleId);
    
    // 5. 面谈计划
    const planIds = await seedInterviewPlans();
    
    // 6. 面谈记录
    const recordIds = await seedInterviewRecords(planIds);
    
    // 7. 改进计划
    await seedImprovementPlans(recordIds);
    
    console.log('\n================================');
    console.log('🎉 Phase 2 演示数据生成完成！');
    console.log('================================');
    console.log('\n📊 数据摘要:');
    console.log('  - 互评周期: 2 个 (Q4已完成 + Q1进行中)');
    console.log('  - 评价关系: 15 条');
    console.log('  - 互评记录: 11 条 (7条Q4 + 4条Q1)');
    console.log('  - 面谈计划: 7 条');
    console.log('  - 面谈记录: 4 条');
    console.log('  - 改进计划: 5 条');
    
  } catch (error) {
    console.error('❌ 种子数据插入失败:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
