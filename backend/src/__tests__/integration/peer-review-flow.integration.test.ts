/**
 * 360度互评完整流程集成测试
 * 测试: 创建周期 → 配置关系 → 提交互评 → 查看统计
 */
import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

jest.setTimeout(60000);

describe('360度互评完整流程 (Integration)', () => {
  let hrToken: string;
  let employeeToken: string;
  let managerToken: string;
  let hrId: number;
  let employeeId: number;
  let managerId: number;

  // 流程中共享的状态
  let cycleId: number;
  let relationshipIds: number[] = [];

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
    employeeToken = await TestHelper.getAuthToken('employee');
    managerToken = await TestHelper.getAuthToken('manager');

    // 获取用户ID
    const [hrMe, empMe, mgrMe] = await Promise.all([
      request(app).get('/api/auth/me').set('Authorization', `Bearer ${hrToken}`),
      request(app).get('/api/auth/me').set('Authorization', `Bearer ${employeeToken}`),
      request(app).get('/api/auth/me').set('Authorization', `Bearer ${managerToken}`),
    ]);
    hrId = hrMe.body.data.id;
    employeeId = empMe.body.data.id;
    managerId = mgrMe.body.data.id;
  }, 30000);

  // ========================================
  // Step 1: 创建互评周期
  // ========================================
  describe('Step 1: 创建互评周期', () => {
    it('应成功创建互评周期', async () => {
      const res = await request(app)
        .post('/api/peer-reviews/cycles')
        .send({
          name: '集成测试-2026Q1互评',
          description: '集成测试用互评周期',
          start_date: '2026-01-01',
          end_date: '2026-03-31',
          review_type: 'peer',
          is_anonymous: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('集成测试-2026Q1互评');
      cycleId = res.body.data.id;
    });

    it('创建后可以查询到该周期', async () => {
      const res = await request(app)
        .get(`/api/peer-reviews/cycles/${cycleId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(cycleId);
      expect(res.body.data.name).toBe('集成测试-2026Q1互评');
    });

    it('周期列表中包含新创建的周期', async () => {
      const res = await request(app)
        .get('/api/peer-reviews/cycles');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.find((c: any) => c.id === cycleId);
      expect(found).toBeDefined();
    });
  });

  // ========================================
  // Step 2: 配置评价关系
  // ========================================
  describe('Step 2: 配置评价关系', () => {
    it('应成功批量创建评价关系', async () => {
      const res = await request(app)
        .post('/api/peer-reviews/relationships')
        .send({
          cycle_id: cycleId,
          relationships: [
            { reviewer_id: managerId, reviewee_id: employeeId, relationship_type: 'superior' },
            { reviewer_id: employeeId, reviewee_id: managerId, relationship_type: 'subordinate' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
    });

    it('查询关系数量正确', async () => {
      const res = await request(app)
        .get(`/api/peer-reviews/relationships/${cycleId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);

      // 保存relationship IDs供后续使用
      relationshipIds = res.body.data.map((r: any) => r.id);
    });

    it('可以按评价人筛选关系', async () => {
      const res = await request(app)
        .get(`/api/peer-reviews/relationships/${cycleId}?reviewer_id=${managerId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].reviewer_id).toBe(managerId);
    });
  });

  // ========================================
  // Step 3: 提交互评
  // ========================================
  describe('Step 3: 提交互评', () => {
    it('经理评价员工应成功', async () => {
      const res = await request(app)
        .post('/api/peer-reviews/reviews')
        .send({
          relationship_id: relationshipIds[0],
          cycle_id: cycleId,
          reviewer_id: managerId,
          reviewee_id: employeeId,
          teamwork_score: 4.5,
          communication_score: 4.0,
          professional_score: 4.5,
          responsibility_score: 5.0,
          innovation_score: 3.5,
          strengths: '团队协作能力强',
          improvements: '可以加强创新思维',
          overall_comment: '整体表现优秀',
          is_anonymous: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('员工评价经理应成功', async () => {
      const res = await request(app)
        .post('/api/peer-reviews/reviews')
        .send({
          relationship_id: relationshipIds[1],
          cycle_id: cycleId,
          reviewer_id: employeeId,
          reviewee_id: managerId,
          teamwork_score: 4.0,
          communication_score: 4.5,
          professional_score: 5.0,
          responsibility_score: 4.5,
          innovation_score: 4.0,
          strengths: '领导力强',
          improvements: '希望更多一对一沟通',
          overall_comment: '很好的领导',
          is_anonymous: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('查询互评记录数量正确', async () => {
      const res = await request(app)
        .get(`/api/peer-reviews/reviews/${cycleId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  // ========================================
  // Step 4: 查看统计
  // ========================================
  describe('Step 4: 查看统计数据', () => {
    it('应返回周期统计数据', async () => {
      const res = await request(app)
        .get(`/api/peer-reviews/statistics/${cycleId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('可以按被评人筛选统计', async () => {
      const res = await request(app)
        .get(`/api/peer-reviews/statistics/${cycleId}?reviewee_id=${employeeId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // Step 5: 数据一致性验证
  // ========================================
  describe('Step 5: 数据一致性', () => {
    it('周期、关系、评价数据关联正确', async () => {
      // 获取周期
      const cycleRes = await request(app).get(`/api/peer-reviews/cycles/${cycleId}`);
      expect(cycleRes.body.data.id).toBe(cycleId);

      // 获取关系
      const relRes = await request(app).get(`/api/peer-reviews/relationships/${cycleId}`);
      expect(relRes.body.data.length).toBe(2);
      relRes.body.data.forEach((r: any) => {
        expect(r.cycle_id).toBe(cycleId);
      });

      // 获取评价
      const reviewRes = await request(app).get(`/api/peer-reviews/reviews/${cycleId}`);
      expect(reviewRes.body.data.length).toBe(2);
      reviewRes.body.data.forEach((r: any) => {
        expect(r.cycle_id).toBe(cycleId);
      });
    });
  });

  // ========================================
  // Cleanup: 删除测试数据
  // ========================================
  afterAll(async () => {
    if (cycleId) {
      await request(app).delete(`/api/peer-reviews/cycles/${cycleId}`);
    }
  });
});
