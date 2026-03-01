/**
 * PeerReview Model 单元测试
 * 测试 ReviewCycleModel, ReviewRelationshipModel, PeerReviewModel, ReviewStatisticsModel
 */

import { ReviewCycleModel, ReviewRelationshipModel, PeerReviewModel, ReviewStatisticsModel } from '../../models/peerReview.model';

// Mock the database query function
const mockQuery = jest.fn();
jest.mock('../../config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

describe('PeerReview Model', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  // ==================== ReviewCycleModel ====================
  describe('ReviewCycleModel', () => {
    const sampleCycle = {
      id: 1,
      name: '2026年Q1互评',
      description: '第一季度360互评',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      status: 'draft' as const,
      review_type: 'peer' as const,
      is_anonymous: true,
      created_by: 1,
    };

    it('should create a review cycle', async () => {
      mockQuery.mockResolvedValue([sampleCycle]);

      const { id, ...input } = sampleCycle;
      const result = await ReviewCycleModel.create(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO review_cycles');
      expect(result).toEqual(sampleCycle);
    });

    it('should find all cycles without filters', async () => {
      mockQuery.mockResolvedValue([sampleCycle]);

      const result = await ReviewCycleModel.findAll();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM review_cycles');
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
      expect(result).toEqual([sampleCycle]);
    });

    it('should find all cycles with status filter', async () => {
      mockQuery.mockResolvedValue([sampleCycle]);

      await ReviewCycleModel.findAll({ status: 'draft' });

      expect(mockQuery.mock.calls[0][0]).toContain('AND status =');
      expect(mockQuery.mock.calls[0][1]).toContain('draft');
    });

    it('should find all cycles with review_type filter', async () => {
      mockQuery.mockResolvedValue([]);

      await ReviewCycleModel.findAll({ review_type: 'upward' });

      expect(mockQuery.mock.calls[0][0]).toContain('AND review_type =');
      expect(mockQuery.mock.calls[0][1]).toContain('upward');
    });

    it('should find cycle by id', async () => {
      mockQuery.mockResolvedValue([sampleCycle]);

      const result = await ReviewCycleModel.findById(1);

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM review_cycles WHERE id = $1', [1]);
      expect(result).toEqual(sampleCycle);
    });

    it('should return null when cycle not found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await ReviewCycleModel.findById(999);

      expect(result).toBeNull();
    });

    it('should update a cycle', async () => {
      const mockResult: any = [];
      mockResult.affectedRows = 1;
      mockQuery.mockResolvedValue(mockResult);

      const result = await ReviewCycleModel.update(1, { status: 'active' });

      expect(mockQuery.mock.calls[0][0]).toContain('UPDATE review_cycles SET');
      expect(mockQuery.mock.calls[0][0]).toContain('updated_at = NOW()');
    });

    it('should return false when updating with no fields', async () => {
      const result = await ReviewCycleModel.update(1, {});

      expect(mockQuery).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should delete a cycle', async () => {
      const mockResult: any = [];
      mockResult.affectedRows = 1;
      mockQuery.mockResolvedValue(mockResult);

      await ReviewCycleModel.delete(1);

      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM review_cycles WHERE id = $1', [1]);
    });
  });

  // ==================== ReviewRelationshipModel ====================
  describe('ReviewRelationshipModel', () => {
    const sampleRelationship = {
      id: 1,
      cycle_id: 1,
      reviewer_id: 10,
      reviewee_id: 20,
      relationship_type: 'peer' as const,
      department_id: 5,
      weight: 1.0,
      status: 'pending' as const,
    };

    it('should create batch relationships', async () => {
      const mockResult: any = [];
      mockResult.affectedRows = 2;
      mockQuery.mockResolvedValue(mockResult);

      const { id, ...input } = sampleRelationship;
      const result = await ReviewRelationshipModel.createBatch([input, input]);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO review_relationships');
      // 14 params for 2 relationships (7 each)
      expect(mockQuery.mock.calls[0][1]).toHaveLength(14);
    });

    it('should return 0 for empty batch', async () => {
      const result = await ReviewRelationshipModel.createBatch([]);

      expect(mockQuery).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should find relationships by cycle', async () => {
      mockQuery.mockResolvedValue([sampleRelationship]);

      const result = await ReviewRelationshipModel.findByCycle(1);

      expect(mockQuery.mock.calls[0][0]).toContain('WHERE cycle_id = $1');
      expect(result).toEqual([sampleRelationship]);
    });

    it('should find relationships with reviewer filter', async () => {
      mockQuery.mockResolvedValue([]);

      await ReviewRelationshipModel.findByCycle(1, { reviewer_id: 10 });

      expect(mockQuery.mock.calls[0][0]).toContain('AND reviewer_id =');
    });

    it('should find relationships with reviewee filter', async () => {
      mockQuery.mockResolvedValue([]);

      await ReviewRelationshipModel.findByCycle(1, { reviewee_id: 20 });

      expect(mockQuery.mock.calls[0][0]).toContain('AND reviewee_id =');
    });

    it('should update relationship status', async () => {
      const mockResult: any = [];
      mockResult.affectedRows = 1;
      mockQuery.mockResolvedValue(mockResult);

      await ReviewRelationshipModel.updateStatus(1, 'completed');

      expect(mockQuery.mock.calls[0][0]).toContain('UPDATE review_relationships SET status =');
      expect(mockQuery.mock.calls[0][1]).toEqual(['completed', 1]);
    });

    it('should handle null department_id in batch create', async () => {
      const mockResult: any = [];
      mockResult.affectedRows = 1;
      mockQuery.mockResolvedValue(mockResult);

      const input = {
        cycle_id: 1,
        reviewer_id: 10,
        reviewee_id: 20,
        relationship_type: 'peer' as const,
        weight: 1.0,
        status: 'pending' as const,
      };

      await ReviewRelationshipModel.createBatch([input]);

      // department_id should be null
      expect(mockQuery.mock.calls[0][1][4]).toBeNull();
    });
  });

  // ==================== PeerReviewModel ====================
  describe('PeerReviewModel', () => {
    const sampleReview = {
      id: 1,
      relationship_id: 1,
      cycle_id: 1,
      reviewer_id: 10,
      reviewee_id: 20,
      teamwork_score: 4.5,
      communication_score: 4.0,
      professional_score: 4.2,
      responsibility_score: 4.8,
      innovation_score: 3.9,
      total_score: 4.28,
      strengths: '团队协作好',
      improvements: '需加强创新',
      overall_comment: '整体表现良好',
      is_anonymous: true,
      submitted_at: new Date('2026-03-01'),
    };

    it('should create a peer review', async () => {
      mockQuery.mockResolvedValue([sampleReview]);

      const { id, ...input } = sampleReview;
      const result = await PeerReviewModel.create(input);

      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO peer_reviews');
      expect(result).toEqual(sampleReview);
    });

    it('should find reviews by cycle', async () => {
      mockQuery.mockResolvedValue([sampleReview]);

      const result = await PeerReviewModel.findByCycle(1);

      expect(mockQuery.mock.calls[0][0]).toContain('WHERE cycle_id = $1');
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
      expect(result).toEqual([sampleReview]);
    });

    it('should find reviews with reviewer filter', async () => {
      mockQuery.mockResolvedValue([sampleReview]);

      await PeerReviewModel.findByCycle(1, { reviewer_id: 10 });

      expect(mockQuery.mock.calls[0][0]).toContain('AND reviewer_id =');
      expect(mockQuery.mock.calls[0][1]).toEqual([1, 10]);
    });

    it('should find reviews with reviewee filter', async () => {
      mockQuery.mockResolvedValue([]);

      await PeerReviewModel.findByCycle(1, { reviewee_id: 20 });

      expect(mockQuery.mock.calls[0][0]).toContain('AND reviewee_id =');
    });

    it('should find reviews with both filters', async () => {
      mockQuery.mockResolvedValue([]);

      await PeerReviewModel.findByCycle(1, { reviewer_id: 10, reviewee_id: 20 });

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('AND reviewer_id =');
      expect(sql).toContain('AND reviewee_id =');
      expect(mockQuery.mock.calls[0][1]).toEqual([1, 10, 20]);
    });

    it('should handle review with minimal scores', async () => {
      const minReview = {
        relationship_id: 1,
        cycle_id: 1,
        reviewer_id: 10,
        reviewee_id: 20,
        is_anonymous: false,
      };
      mockQuery.mockResolvedValue([{ id: 2, ...minReview }]);

      const result = await PeerReviewModel.create(minReview);

      expect(result.id).toBe(2);
    });
  });

  // ==================== ReviewStatisticsModel ====================
  describe('ReviewStatisticsModel', () => {
    const sampleStats = {
      id: 1,
      cycle_id: 1,
      reviewee_id: 20,
      total_reviews: 5,
      completed_reviews: 3,
      avg_teamwork: 4.2,
      avg_communication: 4.0,
      avg_professional: 3.8,
      avg_responsibility: 4.5,
      avg_innovation: 3.5,
      avg_total_score: 4.0,
    };

    it('should find statistics by cycle', async () => {
      mockQuery.mockResolvedValue([sampleStats]);

      const result = await ReviewStatisticsModel.findByCycle(1);

      expect(mockQuery.mock.calls[0][0]).toContain('WHERE cycle_id = $1');
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY avg_total_score DESC');
      expect(result).toEqual([sampleStats]);
    });

    it('should find statistics by cycle and reviewee', async () => {
      mockQuery.mockResolvedValue([sampleStats]);

      const result = await ReviewStatisticsModel.findByCycle(1, 20);

      expect(mockQuery.mock.calls[0][0]).toContain('AND reviewee_id =');
      expect(mockQuery.mock.calls[0][1]).toEqual([1, 20]);
      expect(result).toEqual([sampleStats]);
    });

    it('should return empty array when no stats found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await ReviewStatisticsModel.findByCycle(999);

      expect(result).toEqual([]);
    });
  });
});
