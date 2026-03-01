import { Router } from 'express';
import {
  InterviewPlanController,
  InterviewRecordController,
  ImprovementPlanController
} from '../controllers/interviewRecord.controller';

const router = Router();

// ========================================
// 面谈计划
// ========================================

/**
 * @route POST /api/interview-records/plans
 * @desc 创建面谈计划
 * @access Private (Manager/HR)
 */
router.post('/plans', InterviewPlanController.createPlan);

/**
 * @route GET /api/interview-records/plans
 * @desc 获取面谈计划列表
 * @access Private
 */
router.get('/plans', InterviewPlanController.getPlans);

/**
 * @route PUT /api/interview-records/plans/:id
 * @desc 更新面谈计划
 * @access Private (Manager/HR)
 */
router.put('/plans/:id', InterviewPlanController.updatePlan);

// ========================================
// 面谈记录
// ========================================

/**
 * @route POST /api/interview-records/records
 * @desc 创建面谈记录
 * @access Private (Manager)
 */
router.post('/records', InterviewRecordController.createRecord);

/**
 * @route GET /api/interview-records/records
 * @desc 获取面谈记录列表
 * @access Private
 */
router.get('/records', InterviewRecordController.getRecords);

/**
 * @route GET /api/interview-records/records/:id
 * @desc 获取面谈记录详情
 * @access Private
 */
router.get('/records/:id', InterviewRecordController.getRecordById);

// ========================================
// 改进计划
// ========================================

/**
 * @route POST /api/interview-records/improvement-plans
 * @desc 创建改进计划
 * @access Private (Manager)
 */
router.post('/improvement-plans', ImprovementPlanController.createPlan);

/**
 * @route PUT /api/interview-records/improvement-plans/:id/progress
 * @desc 更新改进计划进度
 * @access Private
 */
router.put('/improvement-plans/:id/progress', ImprovementPlanController.updateProgress);

/**
 * @route GET /api/interview-records/improvement-plans/employee/:employeeId
 * @desc 获取员工的改进计划
 * @access Private
 */
router.get('/improvement-plans/employee/:employeeId', ImprovementPlanController.getByEmployee);

export default router;
