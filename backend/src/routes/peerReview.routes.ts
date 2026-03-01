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
 * @swagger
 * /api/peer-reviews/cycles:
 *   post:
 *     tags: [360度互评 - 周期管理]
 *     summary: 创建互评周期
 *     description: 创建一个新的360度互评周期，仅HR可操作
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, start_date, end_date]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "2026年Q1互评"
 *               description:
 *                 type: string
 *                 example: "第一季度360度互评"
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-01"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-31"
 *               review_type:
 *                 type: string
 *                 enum: [peer, 360, upward, downward]
 *                 default: peer
 *               is_anonymous:
 *                 type: boolean
 *                 default: false
 *           example:
 *             name: "2026年Q1互评"
 *             description: "第一季度360度互评"
 *             start_date: "2026-01-01"
 *             end_date: "2026-03-31"
 *             review_type: "peer"
 *             is_anonymous: false
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "互评周期创建成功"
 *                 data:
 *                   $ref: '#/components/schemas/ReviewCycle'
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 服务器错误
 */
router.post('/cycles', PeerReviewCycleController.createCycle);

/**
 * @swagger
 * /api/peer-reviews/cycles:
 *   get:
 *     tags: [360度互评 - 周期管理]
 *     summary: 获取互评周期列表
 *     description: 获取所有互评周期，支持按状态和类型筛选
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, completed, cancelled]
 *         description: 按状态筛选
 *       - in: query
 *         name: review_type
 *         schema:
 *           type: string
 *           enum: [peer, 360, upward, downward]
 *         description: 按评价类型筛选
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReviewCycle'
 *                 total:
 *                   type: integer
 *             example:
 *               success: true
 *               data: []
 *               total: 0
 */
router.get('/cycles', PeerReviewCycleController.getCycles);

/**
 * @swagger
 * /api/peer-reviews/cycles/{id}:
 *   get:
 *     tags: [360度互评 - 周期管理]
 *     summary: 获取单个互评周期
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 周期ID
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ReviewCycle'
 *       404:
 *         description: 周期不存在
 */
router.get('/cycles/:id', PeerReviewCycleController.getCycleById);

/**
 * @swagger
 * /api/peer-reviews/cycles/{id}:
 *   put:
 *     tags: [360度互评 - 周期管理]
 *     summary: 更新互评周期
 *     description: 更新互评周期信息，仅HR可操作
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed, cancelled]
 *               review_type:
 *                 type: string
 *               is_anonymous:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "更新成功"
 *       404:
 *         description: 周期不存在
 */
router.put('/cycles/:id', PeerReviewCycleController.updateCycle);

/**
 * @swagger
 * /api/peer-reviews/cycles/{id}:
 *   delete:
 *     tags: [360度互评 - 周期管理]
 *     summary: 删除互评周期
 *     description: 删除互评周期，仅HR可操作
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "删除成功"
 *       404:
 *         description: 周期不存在
 */
router.delete('/cycles/:id', PeerReviewCycleController.deleteCycle);

// ========================================
// 评价关系管理
// ========================================

/**
 * @swagger
 * /api/peer-reviews/relationships:
 *   post:
 *     tags: [360度互评 - 评价关系]
 *     summary: 批量创建评价关系
 *     description: 为指定互评周期批量创建评价关系，仅HR可操作
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cycle_id, relationships]
 *             properties:
 *               cycle_id:
 *                 type: integer
 *                 example: 1
 *               relationships:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [reviewer_id, reviewee_id]
 *                   properties:
 *                     reviewer_id:
 *                       type: integer
 *                     reviewee_id:
 *                       type: integer
 *                     relationship_type:
 *                       type: string
 *                       enum: [peer, superior, subordinate, cross_department]
 *                       default: peer
 *                     department_id:
 *                       type: integer
 *                     weight:
 *                       type: number
 *                       default: 1.0
 *           example:
 *             cycle_id: 1
 *             relationships:
 *               - reviewer_id: 2
 *                 reviewee_id: 3
 *                 relationship_type: "peer"
 *               - reviewer_id: 3
 *                 reviewee_id: 2
 *                 relationship_type: "peer"
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "成功创建 2 条评价关系"
 *                 count:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 互评周期不存在
 */
router.post('/relationships', ReviewRelationshipController.createRelationships);

/**
 * @swagger
 * /api/peer-reviews/relationships/{cycleId}:
 *   get:
 *     tags: [360度互评 - 评价关系]
 *     summary: 获取评价关系
 *     description: 获取指定互评周期的评价关系列表
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 互评周期ID
 *       - in: query
 *         name: reviewer_id
 *         schema:
 *           type: integer
 *         description: 按评价人筛选
 *       - in: query
 *         name: reviewee_id
 *         schema:
 *           type: integer
 *         description: 按被评价人筛选
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReviewRelationship'
 *                 total:
 *                   type: integer
 */
router.get('/relationships/:cycleId', ReviewRelationshipController.getRelationships);

/**
 * @route DELETE /api/peer-review/relationships/:id
 * @desc 删除评价关系
 * @access Private (HR)
 */
router.delete('/relationships/:id', ReviewRelationshipController.deleteRelationship);

// ========================================
// 互评记录
// ========================================

/**
 * @swagger
 * /api/peer-reviews/reviews:
 *   post:
 *     tags: [360度互评 - 互评记录]
 *     summary: 提交互评
 *     description: 提交一条互评记录，包含各维度评分和评语
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [relationship_id, cycle_id, reviewer_id, reviewee_id]
 *             properties:
 *               relationship_id:
 *                 type: integer
 *               cycle_id:
 *                 type: integer
 *               reviewer_id:
 *                 type: integer
 *               reviewee_id:
 *                 type: integer
 *               teamwork_score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4.5
 *               communication_score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4.0
 *               professional_score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4.5
 *               responsibility_score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5.0
 *               innovation_score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 3.5
 *               strengths:
 *                 type: string
 *                 example: "团队协作能力强，沟通积极主动"
 *               improvements:
 *                 type: string
 *                 example: "可以加强创新思维"
 *               overall_comment:
 *                 type: string
 *                 example: "整体表现优秀"
 *               is_anonymous:
 *                 type: boolean
 *                 default: false
 *           example:
 *             relationship_id: 1
 *             cycle_id: 1
 *             reviewer_id: 2
 *             reviewee_id: 3
 *             teamwork_score: 4.5
 *             communication_score: 4.0
 *             professional_score: 4.5
 *             responsibility_score: 5.0
 *             innovation_score: 3.5
 *             strengths: "团队协作能力强"
 *             improvements: "可以加强创新思维"
 *             overall_comment: "整体表现优秀"
 *             is_anonymous: false
 *     responses:
 *       201:
 *         description: 提交成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "互评提交成功"
 *                 data:
 *                   $ref: '#/components/schemas/PeerReview'
 *       400:
 *         description: 缺少必填字段
 */
router.post('/reviews', PeerReviewController.submitReview);

/**
 * @swagger
 * /api/peer-reviews/reviews/{cycleId}:
 *   get:
 *     tags: [360度互评 - 互评记录]
 *     summary: 获取互评记录
 *     description: 获取指定周期的互评记录列表
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 互评周期ID
 *       - in: query
 *         name: reviewer_id
 *         schema:
 *           type: integer
 *         description: 按评价人筛选
 *       - in: query
 *         name: reviewee_id
 *         schema:
 *           type: integer
 *         description: 按被评价人筛选
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PeerReview'
 *                 total:
 *                   type: integer
 */
router.get('/reviews/:cycleId', PeerReviewController.getReviews);

/**
 * @swagger
 * /api/peer-reviews/statistics/{cycleId}:
 *   get:
 *     tags: [360度互评 - 统计]
 *     summary: 获取互评统计
 *     description: 获取指定周期的互评统计数据，包含各维度平均分
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 互评周期ID
 *       - in: query
 *         name: reviewee_id
 *         schema:
 *           type: integer
 *         description: 按被评价人筛选
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReviewStatistics'
 *                 total:
 *                   type: integer
 */
router.get('/statistics/:cycleId', PeerReviewController.getStatistics);

export default router;
