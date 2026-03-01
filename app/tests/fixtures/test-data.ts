/**
 * E2E 测试数据夹具
 */

export const PEER_REVIEW_CYCLE = {
  name: '[E2E-TEST] 2026年Q1互评',
  description: 'E2E测试自动创建的互评周期',
  startDate: '2026-03-01',
  endDate: '2026-03-31',
};

export const PEER_REVIEW_SCORES = {
  workQuality: 4,       // 工作质量
  teamwork: 5,          // 团队协作
  communication: 4,     // 沟通能力
  innovation: 3,        // 创新能力
  responsibility: 5,    // 责任心
  comment: 'E2E测试评价：该同事工作认真负责，团队协作能力强。',
};

export const INTERVIEW_PLAN = {
  title: '[E2E-TEST] 2026年Q1绩效面谈',
  description: 'E2E测试自动创建的面谈计划',
  scheduledDate: '2026-03-15',
};

export const INTERVIEW_RECORD = {
  summary: '[E2E-TEST] 面谈记录摘要：员工表现良好，需要在项目管理方面加强。',
  achievements: '完成了3个重要项目，客户满意度提升20%',
  improvements: '项目管理能力需要提升，时间管理有待改善',
  nextSteps: '参加项目管理培训，制定个人发展计划',
};

export const IMPROVEMENT_PLAN = {
  title: '[E2E-TEST] 项目管理能力提升计划',
  description: '通过培训和实践提升项目管理能力',
  targetDate: '2026-06-30',
  actions: [
    '参加PMP认证培训',
    '独立负责一个中型项目',
    '每周阅读项目管理书籍',
  ],
};
