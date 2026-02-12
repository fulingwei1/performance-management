/**
 * AI路由
 */

import express from 'express';
import {
  generateSelfSummary,
  generateNextMonthPlan,
  generateManagerComment,
  generateWorkArrangement,
  getMyAIUsage,
  getAllUsersAIUsage,
  generateGoalDecomposition,
  generateCompanyStrategy,
  generateCompanyKeyWorks,
  generateDepartmentKeyWorks,
  generateQuarterlySummary
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

/**
 * @route GET /api/ai/my-usage
 * @desc 查询我的AI使用统计
 * @access Private (所有登录用户)
 */
router.get('/my-usage', getMyAIUsage);

/**
 * @route GET /api/ai/all-usage
 * @desc 查询所有用户AI使用统计
 * @access Admin only
 */
router.get('/all-usage', getAllUsersAIUsage);

/**
 * @route POST /api/ai/goal-decomposition
 * @desc 生成目标拆解建议（基于公司战略和部门目标）
 * @access Employee/Manager
 */
router.post('/goal-decomposition', generateGoalDecomposition);

/**
 * @route POST /api/ai/company-strategy
 * @desc 生成公司战略
 * @access GM only
 */
router.post('/company-strategy', generateCompanyStrategy);

/**
 * @route POST /api/ai/company-key-works
 * @desc 生成公司年度重点工作
 * @access GM only
 */
router.post('/company-key-works', generateCompanyKeyWorks);

/**
 * @route POST /api/ai/department-key-works
 * @desc 生成部门年度重点工作
 * @access GM only
 */
router.post('/department-key-works', generateDepartmentKeyWorks);

/**
 * @route POST /api/ai/quarterly-summary
 * @desc 生成经理季度团队总结
 * @access Manager only
 */
router.post('/quarterly-summary', generateQuarterlySummary);

export default router;
