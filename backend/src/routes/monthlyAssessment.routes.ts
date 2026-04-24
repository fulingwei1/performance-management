import express from 'express';
import * as assessmentController from '../controllers/monthlyAssessment.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// 月度评分管理
router.post('/monthly', authenticate, requireRole('manager', 'hr', 'admin'), assessmentController.createOrUpdateAssessment);
router.get('/employee/:employeeId', authenticate, assessmentController.getEmployeeAssessments);
router.get('/employee/:employeeId/month/:month', authenticate, assessmentController.getAssessmentByMonth);

export default router;
