/**
 * 目标审批路由
 */

import express from 'express';
import {
  getPendingApprovals,
  approveObjective,
  rejectObjective,
  adjustObjective
} from '../controllers/goalApproval.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// 所有接口都需要认证
router.use(authenticate);

/**
 * @route GET /api/goal-approval/pending
 * @desc 获取待审批的目标列表
 * @access Manager
 */
router.get('/pending', getPendingApprovals);

/**
 * @route POST /api/goal-approval/approve
 * @desc 批准目标
 * @access Manager
 */
router.post('/approve', approveObjective);

/**
 * @route POST /api/goal-approval/reject
 * @desc 拒绝目标
 * @access Manager
 */
router.post('/reject', rejectObjective);

/**
 * @route POST /api/goal-approval/adjust
 * @desc 调整目标
 * @access Manager
 */
router.post('/adjust', adjustObjective);

export default router;
