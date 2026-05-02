import express from 'express';
import * as assessmentController from '../controllers/monthlyAssessment.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// 获取当月考核列表
router.get('/monthly-list', authenticate, assessmentController.getMonthlyList);

// 员工自评提交
router.post('/self-assessment', authenticate, assessmentController.submitSelfAssessment);

// 主管评分提交
router.post('/submit-score', authenticate, requireRole('manager', 'hr', 'admin'), assessmentController.submitScore);

// 月度评分管理（兼容旧 API）
router.post('/monthly', authenticate, requireRole('manager', 'hr', 'admin'), assessmentController.createOrUpdateAssessment);
router.get('/employee/:employeeId', authenticate, assessmentController.getEmployeeAssessments);
router.get('/employee/:employeeId/month/:month', authenticate, assessmentController.getAssessmentByMonth);

export default router;
