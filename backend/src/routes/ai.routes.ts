/**
 * AI路由
 */

import express from 'express';
import {
  generateSelfSummary,
  generateNextMonthPlan,
  generateManagerComment,
  generateWorkArrangement
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// 所有AI接口都需要认证
router.use(authenticate);

/**
 * @route POST /api/ai/self-summary
 * @desc 生成员工自评总结
 * @access Employee (自己)
 */
router.post('/self-summary', generateSelfSummary);

/**
 * @route POST /api/ai/next-month-plan
 * @desc 生成下月工作计划
 * @access Employee (自己)
 */
router.post('/next-month-plan', generateNextMonthPlan);

/**
 * @route POST /api/ai/manager-comment
 * @desc 生成经理综合评价
 * @access Manager
 */
router.post('/manager-comment', generateManagerComment);

/**
 * @route POST /api/ai/work-arrangement
 * @desc 生成下月工作安排
 * @access Manager
 */
router.post('/work-arrangement', generateWorkArrangement);

export default router;
