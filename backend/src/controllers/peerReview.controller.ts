import { Request, Response } from 'express';
import {
  ReviewCycleModel,
  ReviewRelationshipModel,
  PeerReviewModel,
  ReviewStatisticsModel
} from '../models/peerReview.model';

/**
 * 互评周期管理
 */
export const PeerReviewCycleController = {
  /**
   * 创建互评周期
   * POST /api/peer-review/cycles
   */
  async createCycle(req: Request, res: Response) {
    try {
      const { name, description, start_date, end_date, review_type, is_anonymous } = req.body;
      
      // 验证必填字段
      if (!name || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段：name, start_date, end_date'
        });
      }
      
      // 验证日期
      if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({
          success: false,
          message: '结束日期必须晚于开始日期'
        });
      }
      
      const cycle = await ReviewCycleModel.create({
        name,
        description,
        start_date,
        end_date,
        status: 'draft',
        review_type: review_type || 'peer',
        is_anonymous: is_anonymous || false,
        created_by: (req as any).user?.id
      });
      
      res.status(201).json({
        success: true,
        message: '互评周期创建成功',
        data: cycle
      });
    } catch (error: any) {
      console.error('创建互评周期失败:', error);
      res.status(500).json({
        success: false,
        message: '创建互评周期失败',
        error: error.message
      });
    }
  },

  /**
   * 获取互评周期列表
   * GET /api/peer-review/cycles
   */
  async getCycles(req: Request, res: Response) {
    try {
      const { status, review_type } = req.query;
      
      const cycles = await ReviewCycleModel.findAll({
        status: typeof status === 'string' ? status : undefined,
        review_type: typeof review_type === 'string' ? review_type : undefined
      });
      
      res.json({
        success: true,
        data: cycles,
        total: cycles.length
      });
    } catch (error: any) {
      console.error('获取互评周期失败:', error);
      res.status(500).json({
        success: false,
        message: '获取互评周期失败',
        error: error.message
      });
    }
  },

  /**
   * 获取单个互评周期
   * GET /api/peer-review/cycles/:id
   */
  async getCycleById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const cycle = await ReviewCycleModel.findById(id);
      
      if (!cycle) {
        return res.status(404).json({
          success: false,
          message: '互评周期不存在'
        });
      }
      
      res.json({
        success: true,
        data: cycle
      });
    } catch (error: any) {
      console.error('获取互评周期失败:', error);
      res.status(500).json({
        success: false,
        message: '获取互评周期失败',
        error: error.message
      });
    }
  },

  /**
   * 更新互评周期
   * PUT /api/peer-review/cycles/:id
   */
  async updateCycle(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const success = await ReviewCycleModel.update(id, updates);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '互评周期不存在'
        });
      }
      
      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (error: any) {
      console.error('更新互评周期失败:', error);
      res.status(500).json({
        success: false,
        message: '更新互评周期失败',
        error: error.message
      });
    }
  },

  /**
   * 删除互评周期
   * DELETE /api/peer-review/cycles/:id
   */
  async deleteCycle(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const success = await ReviewCycleModel.delete(id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '互评周期不存在'
        });
      }
      
      res.json({
        success: true,
        message: '删除成功'
      });
    } catch (error: any) {
      console.error('删除互评周期失败:', error);
      res.status(500).json({
        success: false,
        message: '删除互评周期失败',
        error: error.message
      });
    }
  }
};

/**
 * 评价关系管理
 */
export const ReviewRelationshipController = {
  /**
   * 批量创建评价关系
   * POST /api/peer-review/relationships
   */
  async createRelationships(req: Request, res: Response) {
    try {
      const { cycle_id, relationships } = req.body;
      
      if (!cycle_id || !Array.isArray(relationships) || relationships.length === 0) {
        return res.status(400).json({
          success: false,
          message: '参数错误：需要 cycle_id 和 relationships 数组'
        });
      }
      
      // 验证周期是否存在
      const cycle = await ReviewCycleModel.findById(cycle_id);
      if (!cycle) {
        return res.status(404).json({
          success: false,
          message: '互评周期不存在'
        });
      }
      
      // 构建关系数据
      const relationshipsData = relationships.map(r => ({
        cycle_id,
        reviewer_id: r.reviewer_id,
        reviewee_id: r.reviewee_id,
        relationship_type: r.relationship_type || 'peer',
        department_id: r.department_id,
        weight: r.weight || 1.0,
        status: 'pending' as 'pending'
      }));
      
      const count = await ReviewRelationshipModel.createBatch(relationshipsData);
      
      res.status(201).json({
        success: true,
        message: `成功创建 ${count} 条评价关系`,
        count
      });
    } catch (error: any) {
      console.error('创建评价关系失败:', error);
      res.status(500).json({
        success: false,
        message: '创建评价关系失败',
        error: error.message
      });
    }
  },

  /**
   * 获取评价关系
   * GET /api/peer-review/relationships/:cycleId
   */
  async getRelationships(req: Request, res: Response) {
    try {
      const cycleId = parseInt(req.params.cycleId);
      const { reviewer_id, reviewee_id } = req.query;
      
      const relationships = await ReviewRelationshipModel.findByCycle(cycleId, {
        reviewer_id: reviewer_id && typeof reviewer_id === 'string' ? parseInt(reviewer_id) : undefined,
        reviewee_id: reviewee_id && typeof reviewee_id === 'string' ? parseInt(reviewee_id) : undefined
      });
      
      res.json({
        success: true,
        data: relationships,
        total: relationships.length
      });
    } catch (error: any) {
      console.error('获取评价关系失败:', error);
      res.status(500).json({
        success: false,
        message: '获取评价关系失败',
        error: error.message
      });
    }
  }
};

/**
 * 互评记录管理
 */
export const PeerReviewController = {
  /**
   * 提交互评
   * POST /api/peer-review/reviews
   */
  async submitReview(req: Request, res: Response) {
    try {
      const {
        relationship_id,
        cycle_id,
        reviewer_id,
        reviewee_id,
        teamwork_score,
        communication_score,
        professional_score,
        responsibility_score,
        innovation_score,
        strengths,
        improvements,
        overall_comment,
        is_anonymous
      } = req.body;
      
      // 验证必填字段
      if (!relationship_id || !cycle_id || !reviewer_id || !reviewee_id) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段'
        });
      }
      
      // 计算总分
      const scores = [
        teamwork_score,
        communication_score,
        professional_score,
        responsibility_score,
        innovation_score
      ].filter(s => typeof s === 'number');
      
      const total_score = scores.length > 0 
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : undefined;
      
      const review = await PeerReviewModel.create({
        relationship_id,
        cycle_id,
        reviewer_id,
        reviewee_id,
        teamwork_score,
        communication_score,
        professional_score,
        responsibility_score,
        innovation_score,
        total_score,
        strengths,
        improvements,
        overall_comment,
        is_anonymous: is_anonymous || false,
        submitted_at: new Date()
      });
      
      // 更新关系状态
      await ReviewRelationshipModel.updateStatus(relationship_id, 'completed');
      
      res.status(201).json({
        success: true,
        message: '互评提交成功',
        data: review
      });
    } catch (error: any) {
      console.error('提交互评失败:', error);
      res.status(500).json({
        success: false,
        message: '提交互评失败',
        error: error.message
      });
    }
  },

  /**
   * 获取互评记录
   * GET /api/peer-review/reviews/:cycleId
   */
  async getReviews(req: Request, res: Response) {
    try {
      const cycleId = parseInt(req.params.cycleId);
      const { reviewer_id, reviewee_id } = req.query;
      
      const reviews = await PeerReviewModel.findByCycle(cycleId, {
        reviewer_id: reviewer_id && typeof reviewer_id === 'string' ? parseInt(reviewer_id) : undefined,
        reviewee_id: reviewee_id && typeof reviewee_id === 'string' ? parseInt(reviewee_id) : undefined
      });
      
      res.json({
        success: true,
        data: reviews,
        total: reviews.length
      });
    } catch (error: any) {
      console.error('获取互评记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取互评记录失败',
        error: error.message
      });
    }
  },

  /**
   * 获取互评统计
   * GET /api/peer-review/statistics/:cycleId
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const cycleId = parseInt(req.params.cycleId);
      const { reviewee_id } = req.query;
      
      const statistics = await ReviewStatisticsModel.findByCycle(
        cycleId,
        reviewee_id && typeof reviewee_id === 'string' ? parseInt(reviewee_id) : undefined
      );
      
      res.json({
        success: true,
        data: statistics,
        total: statistics.length
      });
    } catch (error: any) {
      console.error('获取互评统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取互评统计失败',
        error: error.message
      });
    }
  }
};
