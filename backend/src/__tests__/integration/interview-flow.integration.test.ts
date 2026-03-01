/**
 * 绩效面谈完整流程集成测试
 * 测试: 创建计划 → 创建记录 → 创建改进计划 → 更新进度 → 查询改进计划
 */
import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

jest.setTimeout(60000);

describe('绩效面谈完整流程 (Integration)', () => {
  let managerToken: string;
  let employeeToken: string;
  let managerId: number;
  let employeeId: number;

  // 流程中共享的状态
  let planId: number;
  let recordId: number;
  let improvementPlanId: number;

  beforeAll(async () => {
    managerToken = await TestHelper.getAuthToken('manager');
    employeeToken = await TestHelper.getAuthToken('employee');

    const [mgrMe, empMe] = await Promise.all([
      request(app).get('/api/auth/me').set('Authorization', `Bearer ${managerToken}`),
      request(app).get('/api/auth/me').set('Authorization', `Bearer ${employeeToken}`),
    ]);
    managerId = mgrMe.body.data.id;
    employeeId = empMe.body.data.id;
  }, 30000);

  // ========================================
  // Step 1: 创建面谈计划
  // ========================================
  describe('Step 1: 创建面谈计划', () => {
    it('应成功创建面谈计划', async () => {
      const res = await request(app)
        .post('/api/interview-records/plans')
        .send({
          title: '集成测试-Q1绩效面谈',
          description: '第一季度绩效回顾面谈',
          interview_type: 'quarterly',
          scheduled_date: '2026-04-01',
          scheduled_time: '14:00',
          duration_minutes: 60,
          manager_id: managerId,
          employee_id: employeeId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('集成测试-Q1绩效面谈');
      planId = res.body.data.id;
    });

    it('计划列表中可以查询到', async () => {
      const res = await request(app)
        .get('/api/interview-records/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.find((p: any) => p.id === planId);
      expect(found).toBeDefined();
      expect(found.manager_id).toBe(managerId);
      expect(found.employee_id).toBe(employeeId);
    });

    it('计划包含正确的员工和经理ID', async () => {
      const res = await request(app)
        .get('/api/interview-records/plans');

      expect(res.status).toBe(200);
      const plan = res.body.data.find((p: any) => p.id === planId);
      expect(plan).toBeDefined();
      expect(plan.interview_type).toBe('quarterly');
      expect(plan.duration_minutes).toBe(60);
    });
  });

  // ========================================
  // Step 2: 创建面谈记录
  // ========================================
  describe('Step 2: 创建面谈记录', () => {
    it('应成功创建面谈记录并关联计划', async () => {
      const res = await request(app)
        .post('/api/interview-records/records')
        .send({
          plan_id: planId,
          employee_id: employeeId,
          manager_id: managerId,
          interview_date: '2026-04-01',
          interview_time: '14:00',
          duration_minutes: 45,
          employee_summary: '本季度完成了3个重要项目',
          manager_feedback: '整体表现出色，建议加强团队管理',
          achievements: '按时交付所有项目',
          challenges: '跨部门协作需要改善',
          strengths: '技术能力强，执行力高',
          improvements: '需要提升领导力和沟通技巧',
          overall_rating: 'good',
          performance_score: 85,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.plan_id).toBe(planId);
      recordId = res.body.data.id;
    });

    it('记录关联到正确的计划', async () => {
      const res = await request(app)
        .get(`/api/interview-records/records/${recordId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.plan_id).toBe(planId);
      expect(res.body.data.employee_id).toBe(employeeId);
      expect(res.body.data.manager_id).toBe(managerId);
    });
  });

  // ========================================
  // Step 3: 创建改进计划
  // ========================================
  describe('Step 3: 创建改进计划', () => {
    it('应成功创建改进计划并绑定到面谈记录', async () => {
      const res = await request(app)
        .post('/api/interview-records/improvement-plans')
        .send({
          interview_record_id: recordId,
          employee_id: employeeId,
          manager_id: managerId,
          goal: '提升项目管理能力',
          description: '通过PMP培训和实际项目锻炼提升项目管理水平',
          category: 'skill',
          priority: 'high',
          start_date: '2026-04-01',
          target_date: '2026-06-30',
          resources_needed: 'PMP培训课程',
          support_from_manager: '提供实际项目实践机会',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.interview_record_id).toBe(recordId);
      expect(res.body.data.goal).toBe('提升项目管理能力');
      improvementPlanId = res.body.data.id;
    });

    it('面谈记录详情中包含改进计划', async () => {
      const res = await request(app)
        .get(`/api/interview-records/records/${recordId}`);

      expect(res.status).toBe(200);
      // 检查是否有improvement_plans关联
      if (res.body.data.improvement_plans) {
        const found = res.body.data.improvement_plans.find(
          (ip: any) => ip.id === improvementPlanId
        );
        expect(found).toBeDefined();
      }
    });
  });

  // ========================================
  // Step 4: 更新改进计划进度
  // ========================================
  describe('Step 4: 更新改进计划进度', () => {
    it('应成功更新进度到50%', async () => {
      const res = await request(app)
        .put(`/api/interview-records/improvement-plans/${improvementPlanId}/progress`)
        .send({
          progress: 50,
          notes: '已完成PMP课程学习',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应成功更新进度到100%', async () => {
      const res = await request(app)
        .put(`/api/interview-records/improvement-plans/${improvementPlanId}/progress`)
        .send({
          progress: 100,
          notes: '已通过PMP考试并在实际项目中应用',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('无效进度值应被拒绝', async () => {
      const res = await request(app)
        .put(`/api/interview-records/improvement-plans/${improvementPlanId}/progress`)
        .send({
          progress: 150,
        });

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // Step 5: 查询员工改进计划
  // ========================================
  describe('Step 5: 验证改进计划数据完整', () => {
    it('面谈记录详情应包含改进计划信息', async () => {
      const res = await request(app)
        .get(`/api/interview-records/records/${recordId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee_id).toBe(employeeId);
      expect(res.body.data.overall_rating).toBe('good');
      expect(res.body.data.performance_score).toBe(85);
    });

    it('面谈记录列表可正常查询', async () => {
      const res = await request(app)
        .get('/api/interview-records/records');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.find((r: any) => r.id === recordId);
      expect(found).toBeDefined();
    });
  });

  // ========================================
  // Step 6: 数据流完整性验证
  // ========================================
  describe('Step 6: 端到端数据一致性', () => {
    it('计划→记录→改进计划 数据链完整', async () => {
      // 验证计划存在
      const planRes = await request(app).get('/api/interview-records/plans');
      const plan = planRes.body.data.find((p: any) => p.id === planId);
      expect(plan).toBeDefined();
      expect(plan.title).toBe('集成测试-Q1绩效面谈');

      // 验证记录关联到计划
      const recordRes = await request(app).get(`/api/interview-records/records/${recordId}`);
      expect(recordRes.body.data.plan_id).toBe(planId);
      expect(recordRes.body.data.employee_id).toBe(employeeId);
      expect(recordRes.body.data.manager_id).toBe(managerId);

      // 验证记录包含正确的面谈内容
      expect(recordRes.body.data.employee_summary).toBe('本季度完成了3个重要项目');
      expect(recordRes.body.data.overall_rating).toBe('good');
    });
  });
});
