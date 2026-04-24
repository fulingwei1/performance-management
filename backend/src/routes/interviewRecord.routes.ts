import { Router } from 'express';
import {
  InterviewPlanController,
  InterviewRecordController,
  ImprovementPlanController
} from '../controllers/interviewRecord.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// ========================================
// 面谈计划
// ========================================

/**
 * @route POST /api/interview-records/plans
 * @desc 创建面谈计划
 * @access Private (Manager/HR)
 */
router.post('/plans', requireRole('manager', 'hr', 'admin'), InterviewPlanController.createPlan);

/**
 * @route GET /api/interview-records/plans
 * @desc 获取面谈计划列表
 * @access Private
 */
router.get('/plans', requireRole('manager', 'gm', 'hr', 'admin'), InterviewPlanController.getPlans);

/**
 * @route PUT /api/interview-records/plans/:id
 * @desc 更新面谈计划
 * @access Private (Manager/HR)
 */
router.put('/plans/:id', requireRole('manager', 'hr', 'admin'), InterviewPlanController.updatePlan);

// ========================================
// 面谈记录
// ========================================

/**
 * @route POST /api/interview-records/records
 * @desc 创建面谈记录
 * @access Private (Manager)
 */
router.post('/records', requireRole('manager', 'hr', 'admin'), InterviewRecordController.createRecord);

/**
 * @route GET /api/interview-records/records
 * @desc 获取面谈记录列表
 * @access Private
 */
router.get('/records', requireRole('manager', 'gm', 'hr', 'admin'), InterviewRecordController.getRecords);

/**
 * @route GET /api/interview-records/records/:id
 * @desc 获取面谈记录详情
 * @access Private
 */
router.get('/records/:id', requireRole('manager', 'gm', 'hr', 'admin'), InterviewRecordController.getRecordById);

// ========================================
// 改进计划
// ========================================

/**
 * @route POST /api/interview-records/improvement-plans
 * @desc 创建改进计划
 * @access Private (Manager)
 */
router.post('/improvement-plans', requireRole('manager', 'hr', 'admin'), ImprovementPlanController.createPlan);

/**
 * @route PUT /api/interview-records/improvement-plans/:id/progress
 * @desc 更新改进计划进度
 * @access Private
 */
router.put('/improvement-plans/:id/progress', requireRole('manager', 'hr', 'admin'), ImprovementPlanController.updateProgress);

/**
 * @route GET /api/interview-records/improvement-plans/employee/:employeeId
 * @desc 获取员工的改进计划
 * @access Private
 */
router.get('/improvement-plans/employee/:employeeId', requireRole('manager', 'gm', 'hr', 'admin'), ImprovementPlanController.getByEmployee);

export default router;
