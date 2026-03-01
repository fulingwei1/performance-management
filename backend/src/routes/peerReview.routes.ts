import { Router } from 'express';
import {
  PeerReviewCycleController,
  ReviewRelationshipController,
  PeerReviewController
} from '../controllers/peerReview.controller';

const router = Router();

// ========================================
// 互评周期管理
// ========================================

/**
 * @route POST /api/peer-review/cycles
 * @desc 创建互评周期
 * @access Private (HR)
 */
router.post('/cycles', PeerReviewCycleController.createCycle);

/**
 * @route GET /api/peer-review/cycles
 * @desc 获取互评周期列表
 * @access Private
 */
router.get('/cycles', PeerReviewCycleController.getCycles);

/**
 * @route GET /api/peer-review/cycles/:id
 * @desc 获取单个互评周期
 * @access Private
 */
router.get('/cycles/:id', PeerReviewCycleController.getCycleById);

/**
 * @route PUT /api/peer-review/cycles/:id
 * @desc 更新互评周期
 * @access Private (HR)
 */
router.put('/cycles/:id', PeerReviewCycleController.updateCycle);

/**
 * @route DELETE /api/peer-review/cycles/:id
 * @desc 删除互评周期
 * @access Private (HR)
 */
router.delete('/cycles/:id', PeerReviewCycleController.deleteCycle);

// ========================================
// 评价关系管理
// ========================================

/**
 * @route POST /api/peer-review/relationships
 * @desc 批量创建评价关系
 * @access Private (HR)
 */
router.post('/relationships', ReviewRelationshipController.createRelationships);

/**
 * @route GET /api/peer-review/relationships/:cycleId
 * @desc 获取评价关系
 * @access Private
 */
router.get('/relationships/:cycleId', ReviewRelationshipController.getRelationships);

// ========================================
// 互评记录
// ========================================

/**
 * @route POST /api/peer-review/reviews
 * @desc 提交互评
 * @access Private
 */
router.post('/reviews', PeerReviewController.submitReview);

/**
 * @route GET /api/peer-review/reviews/:cycleId
 * @desc 获取互评记录
 * @access Private
 */
router.get('/reviews/:cycleId', PeerReviewController.getReviews);

/**
 * @route GET /api/peer-review/statistics/:cycleId
 * @desc 获取互评统计
 * @access Private
 */
router.get('/statistics/:cycleId', PeerReviewController.getStatistics);

export default router;
