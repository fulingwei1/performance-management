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
 * @swagger
 * /api/interview-records/plans:
 *   post:
 *     tags: [绩效面谈 - 面谈计划]
 *     summary: 创建面谈计划
 *     description: 创建绩效面谈计划，仅经理或HR可操作
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, interview_type, scheduled_date, manager_id, employee_id]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Q1绩效面谈"
 *               description:
 *                 type: string
 *                 example: "第一季度绩效回顾面谈"
 *               interview_type:
 *                 type: string
 *                 enum: [quarterly, annual, probation, improvement, special]
 *                 example: "quarterly"
 *               scheduled_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-04-01"
 *               scheduled_time:
 *                 type: string
 *                 example: "14:00"
 *               duration_minutes:
 *                 type: integer
 *                 default: 60
 *               manager_id:
 *                 type: integer
 *                 example: 1
 *               employee_id:
 *                 type: integer
 *                 example: 5
 *               department_id:
 *                 type: integer
 *               template_id:
 *                 type: integer
 *           example:
 *             title: "Q1绩效面谈"
 *             description: "第一季度绩效回顾"
 *             interview_type: "quarterly"
 *             scheduled_date: "2026-04-01"
 *             scheduled_time: "14:00"
 *             duration_minutes: 60
 *             manager_id: 1
 *             employee_id: 5
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
 *                   example: "面谈计划创建成功"
 *                 data:
 *                   $ref: '#/components/schemas/InterviewPlan'
 *       400:
 *         description: 缺少必填字段
 */
router.post('/plans', InterviewPlanController.createPlan);

/**
 * @swagger
 * /api/interview-records/plans:
 *   get:
 *     tags: [绩效面谈 - 面谈计划]
 *     summary: 获取面谈计划列表
 *     parameters:
 *       - in: query
 *         name: manager_id
 *         schema:
 *           type: integer
 *         description: 按经理筛选
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *         description: 按员工筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         description: 按状态筛选
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
 *                     $ref: '#/components/schemas/InterviewPlan'
 *                 total:
 *                   type: integer
 */
router.get('/plans', InterviewPlanController.getPlans);

/**
 * @swagger
 * /api/interview-records/plans/{id}:
 *   put:
 *     tags: [绩效面谈 - 面谈计划]
 *     summary: 更新面谈计划
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduled_date:
 *                 type: string
 *                 format: date
 *               scheduled_time:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, cancelled]
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
 *         description: 计划不存在
 */
router.put('/plans/:id', InterviewPlanController.updatePlan);

// ========================================
// 面谈记录
// ========================================

/**
 * @swagger
 * /api/interview-records/records:
 *   post:
 *     tags: [绩效面谈 - 面谈记录]
 *     summary: 创建面谈记录
 *     description: 创建绩效面谈记录，仅经理可操作
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employee_id, manager_id, interview_date]
 *             properties:
 *               plan_id:
 *                 type: integer
 *               employee_id:
 *                 type: integer
 *               manager_id:
 *                 type: integer
 *               interview_date:
 *                 type: string
 *                 format: date
 *               interview_time:
 *                 type: string
 *               duration_minutes:
 *                 type: integer
 *               employee_summary:
 *                 type: string
 *                 example: "本季度完成了3个重要项目"
 *               manager_feedback:
 *                 type: string
 *                 example: "整体表现出色，建议加强团队管理"
 *               achievements:
 *                 type: string
 *               challenges:
 *                 type: string
 *               strengths:
 *                 type: string
 *               improvements:
 *                 type: string
 *               overall_rating:
 *                 type: string
 *                 enum: [excellent, good, average, below_average, poor]
 *               performance_score:
 *                 type: number
 *               potential_score:
 *                 type: number
 *               nine_box_performance:
 *                 type: string
 *               nine_box_potential:
 *                 type: string
 *               notes:
 *                 type: string
 *           example:
 *             plan_id: 1
 *             employee_id: 5
 *             manager_id: 1
 *             interview_date: "2026-04-01"
 *             interview_time: "14:00"
 *             duration_minutes: 45
 *             employee_summary: "本季度完成了3个重要项目"
 *             manager_feedback: "整体表现出色"
 *             overall_rating: "good"
 *             performance_score: 85
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
 *                   example: "面谈记录创建成功"
 *                 data:
 *                   $ref: '#/components/schemas/InterviewRecord'
 *       400:
 *         description: 缺少必填字段
 */
router.post('/records', InterviewRecordController.createRecord);

/**
 * @swagger
 * /api/interview-records/records:
 *   get:
 *     tags: [绩效面谈 - 面谈记录]
 *     summary: 获取面谈记录列表
 *     parameters:
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *         description: 按员工筛选
 *       - in: query
 *         name: manager_id
 *         schema:
 *           type: integer
 *         description: 按经理筛选
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
 *                     $ref: '#/components/schemas/InterviewRecord'
 *                 total:
 *                   type: integer
 */
router.get('/records', InterviewRecordController.getRecords);

/**
 * @swagger
 * /api/interview-records/records/{id}:
 *   get:
 *     tags: [绩效面谈 - 面谈记录]
 *     summary: 获取面谈记录详情
 *     description: 获取单个面谈记录详情，包含关联的改进计划
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *                   allOf:
 *                     - $ref: '#/components/schemas/InterviewRecord'
 *                     - type: object
 *                       properties:
 *                         improvement_plans:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ImprovementPlan'
 *       404:
 *         description: 记录不存在
 */
router.get('/records/:id', InterviewRecordController.getRecordById);

// ========================================
// 改进计划
// ========================================

/**
 * @swagger
 * /api/interview-records/improvement-plans:
 *   post:
 *     tags: [绩效面谈 - 改进计划]
 *     summary: 创建改进计划
 *     description: 基于面谈记录创建员工改进计划
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [interview_record_id, employee_id, manager_id, goal]
 *             properties:
 *               interview_record_id:
 *                 type: integer
 *               employee_id:
 *                 type: integer
 *               manager_id:
 *                 type: integer
 *               goal:
 *                 type: string
 *                 example: "提升项目管理能力"
 *               description:
 *                 type: string
 *                 example: "通过PMP培训和实际项目锻炼提升"
 *               category:
 *                 type: string
 *                 enum: [performance, skill, behavior, knowledge]
 *                 default: performance
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 *                 default: medium
 *               start_date:
 *                 type: string
 *                 format: date
 *               target_date:
 *                 type: string
 *                 format: date
 *               resources_needed:
 *                 type: string
 *               support_from_manager:
 *                 type: string
 *           example:
 *             interview_record_id: 1
 *             employee_id: 5
 *             manager_id: 1
 *             goal: "提升项目管理能力"
 *             description: "通过PMP培训和实际项目锻炼"
 *             category: "skill"
 *             priority: "high"
 *             start_date: "2026-04-01"
 *             target_date: "2026-06-30"
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
 *                   example: "改进计划创建成功"
 *                 data:
 *                   $ref: '#/components/schemas/ImprovementPlan'
 *       400:
 *         description: 缺少必填字段
 */
router.post('/improvement-plans', ImprovementPlanController.createPlan);

/**
 * @swagger
 * /api/interview-records/improvement-plans/{id}/progress:
 *   put:
 *     tags: [绩效面谈 - 改进计划]
 *     summary: 更新改进计划进度
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 改进计划ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [progress]
 *             properties:
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 50
 *               notes:
 *                 type: string
 *                 example: "已完成PMP课程学习"
 *           example:
 *             progress: 50
 *             notes: "已完成PMP课程学习"
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
 *                   example: "进度更新成功"
 *       400:
 *         description: 进度值无效（必须0-100）
 *       404:
 *         description: 改进计划不存在
 */
router.put('/improvement-plans/:id/progress', ImprovementPlanController.updateProgress);

/**
 * @swagger
 * /api/interview-records/improvement-plans/employee/{employeeId}:
 *   get:
 *     tags: [绩效面谈 - 改进计划]
 *     summary: 获取员工的改进计划
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 员工ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [not_started, in_progress, completed, cancelled]
 *         description: 按状态筛选
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
 *                     $ref: '#/components/schemas/ImprovementPlan'
 *                 total:
 *                   type: integer
 */
router.get('/improvement-plans/employee/:employeeId', ImprovementPlanController.getByEmployee);

export default router;
