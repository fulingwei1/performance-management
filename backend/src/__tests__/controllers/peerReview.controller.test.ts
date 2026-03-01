/**
 * PeerReview Controller 单元测试
 * 测试所有互评相关的 HTTP 端点
 */

import request from 'supertest';
import app from '../../index';
import {
  ReviewCycleModel,
  ReviewRelationshipModel,
  PeerReviewModel,
  ReviewStatisticsModel
} from '../../models/peerReview.model';

// Mock all model methods
jest.mock('../../models/peerReview.model');

const mockedCycleModel = ReviewCycleModel as jest.Mocked<typeof ReviewCycleModel>;
const mockedRelationshipModel = ReviewRelationshipModel as jest.Mocked<typeof ReviewRelationshipModel>;
const mockedReviewModel = PeerReviewModel as jest.Mocked<typeof PeerReviewModel>;
const mockedStatsModel = ReviewStatisticsModel as jest.Mocked<typeof ReviewStatisticsModel>;

describe('PeerReview Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== Cycle Management ====================
  describe('POST /api/peer-reviews/cycles - createCycle', () => {
    const validCycle = {
      name: '2026年Q1互评',
      description: '第一季度360度互评',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      review_type: 'peer',
      is_anonymous: false
    };

    it('应成功创建互评周期', async () => {
      mockedCycleModel.create.mockResolvedValue({ id: 1, ...validCycle, status: 'draft', created_by: undefined } as any);

      const res = await request(app)
        .post('/api/peer-reviews/cycles')
        .send(validCycle);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('互评周期创建成功');
      expect(res.body.data).toBeDefined();
      expect(mockedCycleModel.create).toHaveBeenCalledTimes(1);
    });

    it('缺少必填字段时应返回400', async () => {
      const res = await request(app)
        .post('/api/peer-reviews/cycles')
        .send({ name: '测试' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('缺少必填字段');
    });

    it('结束日期早于开始日期时应返回400', async () => {
      const res = await request(app)
        .post('/api/peer-reviews/cycles')
        .send({
          name: '测试周期',
          start_date: '2026-03-31',
          end_date: '2026-01-01'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('结束日期必须晚于开始日期');
    });

    it('Model抛出异常时应返回500', async () => {
      mockedCycleModel.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/peer-reviews/cycles')
        .send(validCycle);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/peer-reviews/cycles - getCycles', () => {
    it('应返回周期列表', async () => {
      const cycles = [
        { id: 1, name: 'Q1互评', status: 'active' },
        { id: 2, name: 'Q2互评', status: 'draft' }
      ];
      mockedCycleModel.findAll.mockResolvedValue(cycles as any);

      const res = await request(app).get('/api/peer-reviews/cycles');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('应支持按状态筛选', async () => {
      mockedCycleModel.findAll.mockResolvedValue([] as any);

      await request(app).get('/api/peer-reviews/cycles?status=active&review_type=peer');

      expect(mockedCycleModel.findAll).toHaveBeenCalledWith({
        status: 'active',
        review_type: 'peer'
      });
    });

    it('Model抛出异常时应返回500', async () => {
      mockedCycleModel.findAll.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/peer-reviews/cycles');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/peer-reviews/cycles/:id - getCycleById', () => {
    it('应返回单个周期', async () => {
      const cycle = { id: 1, name: 'Q1互评', status: 'active' };
      mockedCycleModel.findById.mockResolvedValue(cycle as any);

      const res = await request(app).get('/api/peer-reviews/cycles/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
    });

    it('周期不存在时应返回404', async () => {
      mockedCycleModel.findById.mockResolvedValue(null as any);

      const res = await request(app).get('/api/peer-reviews/cycles/999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('互评周期不存在');
    });
  });

  describe('PUT /api/peer-reviews/cycles/:id - updateCycle', () => {
    it('应成功更新周期', async () => {
      mockedCycleModel.update.mockResolvedValue(true);

      const res = await request(app)
        .put('/api/peer-reviews/cycles/1')
        .send({ name: '更新后的名称' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('更新成功');
    });

    it('周期不存在时应返回404', async () => {
      mockedCycleModel.update.mockResolvedValue(false);

      const res = await request(app)
        .put('/api/peer-reviews/cycles/999')
        .send({ name: '不存在' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/peer-reviews/cycles/:id - deleteCycle', () => {
    it('应成功删除周期', async () => {
      mockedCycleModel.delete.mockResolvedValue(true);

      const res = await request(app).delete('/api/peer-reviews/cycles/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('删除成功');
    });

    it('周期不存在时应返回404', async () => {
      mockedCycleModel.delete.mockResolvedValue(false);

      const res = await request(app).delete('/api/peer-reviews/cycles/999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ==================== Relationships ====================
  describe('POST /api/peer-reviews/relationships - createRelationships', () => {
    it('应成功批量创建评价关系', async () => {
      const cycle = { id: 1, name: 'Q1', status: 'draft' };
      mockedCycleModel.findById.mockResolvedValue(cycle as any);
      mockedRelationshipModel.createBatch.mockResolvedValue(2);

      const res = await request(app)
        .post('/api/peer-reviews/relationships')
        .send({
          cycle_id: 1,
          relationships: [
            { reviewer_id: 2, reviewee_id: 3 },
            { reviewer_id: 3, reviewee_id: 2 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
    });

    it('缺少参数时应返回400', async () => {
      const res = await request(app)
        .post('/api/peer-reviews/relationships')
        .send({ cycle_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('空relationships数组时应返回400', async () => {
      const res = await request(app)
        .post('/api/peer-reviews/relationships')
        .send({ cycle_id: 1, relationships: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('周期不存在时应返回404', async () => {
      mockedCycleModel.findById.mockResolvedValue(null as any);

      const res = await request(app)
        .post('/api/peer-reviews/relationships')
        .send({
          cycle_id: 999,
          relationships: [{ reviewer_id: 1, reviewee_id: 2 }]
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/peer-reviews/relationships/:cycleId - getRelationships', () => {
    it('应返回评价关系列表', async () => {
      const rels = [{ id: 1, cycle_id: 1, reviewer_id: 2, reviewee_id: 3 }];
      mockedRelationshipModel.findByCycle.mockResolvedValue(rels as any);

      const res = await request(app).get('/api/peer-reviews/relationships/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('应支持按reviewer_id筛选', async () => {
      mockedRelationshipModel.findByCycle.mockResolvedValue([] as any);

      await request(app).get('/api/peer-reviews/relationships/1?reviewer_id=2');

      expect(mockedRelationshipModel.findByCycle).toHaveBeenCalledWith(1, {
        reviewer_id: 2,
        reviewee_id: undefined
      });
    });
  });

  describe('DELETE /api/peer-reviews/relationships/:id - deleteRelationship', () => {
    it('应成功删除关系', async () => {
      mockedRelationshipModel.delete.mockResolvedValue(true);

      const res = await request(app).delete('/api/peer-reviews/relationships/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('关系不存在时应返回404', async () => {
      mockedRelationshipModel.delete.mockResolvedValue(false);

      const res = await request(app).delete('/api/peer-reviews/relationships/999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ==================== Reviews ====================
  describe('POST /api/peer-reviews/reviews - submitReview', () => {
    const validReview = {
      relationship_id: 1,
      cycle_id: 1,
      reviewer_id: 2,
      reviewee_id: 3,
      teamwork_score: 4.5,
      communication_score: 4.0,
      professional_score: 4.5,
      responsibility_score: 5.0,
      innovation_score: 3.5,
      strengths: '团队协作能力强',
      improvements: '加强创新',
      overall_comment: '整体优秀'
    };

    it('应成功提交互评', async () => {
      mockedReviewModel.create.mockResolvedValue({ id: 1, ...validReview } as any);
      mockedRelationshipModel.updateStatus.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/peer-reviews/reviews')
        .send(validReview);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('互评提交成功');
      expect(mockedRelationshipModel.updateStatus).toHaveBeenCalledWith(1, 'completed');
    });

    it('缺少必填字段时应返回400', async () => {
      const res = await request(app)
        .post('/api/peer-reviews/reviews')
        .send({ relationship_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Model抛出异常时应返回500', async () => {
      mockedReviewModel.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/peer-reviews/reviews')
        .send(validReview);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/peer-reviews/reviews/:cycleId - getReviews', () => {
    it('应返回互评记录列表', async () => {
      const reviews = [{ id: 1, cycle_id: 1, reviewer_id: 2 }];
      mockedReviewModel.findByCycle.mockResolvedValue(reviews as any);

      const res = await request(app).get('/api/peer-reviews/reviews/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });

    it('应支持按reviewee_id筛选', async () => {
      mockedReviewModel.findByCycle.mockResolvedValue([] as any);

      await request(app).get('/api/peer-reviews/reviews/1?reviewee_id=3');

      expect(mockedReviewModel.findByCycle).toHaveBeenCalledWith(1, {
        reviewer_id: undefined,
        reviewee_id: 3
      });
    });
  });

  // ==================== Statistics ====================
  describe('GET /api/peer-reviews/statistics/:cycleId - getStatistics', () => {
    it('应返回统计数据', async () => {
      const stats = [{ reviewee_id: 3, avg_score: 4.2, review_count: 5 }];
      mockedStatsModel.findByCycle.mockResolvedValue(stats as any);

      const res = await request(app).get('/api/peer-reviews/statistics/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('应支持按reviewee_id筛选', async () => {
      mockedStatsModel.findByCycle.mockResolvedValue([] as any);

      await request(app).get('/api/peer-reviews/statistics/1?reviewee_id=3');

      expect(mockedStatsModel.findByCycle).toHaveBeenCalledWith(1, 3);
    });

    it('Model抛出异常时应返回500', async () => {
      mockedStatsModel.findByCycle.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/peer-reviews/statistics/1');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
