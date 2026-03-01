import express from 'express';
import * as assessmentController from '../controllers/monthlyAssessment.controller';

const router = express.Router();

// 月度评分管理
router.post('/monthly', assessmentController.createOrUpdateAssessment);
router.get('/employee/:employeeId', assessmentController.getEmployeeAssessments);
router.get('/employee/:employeeId/month/:month', assessmentController.getAssessmentByMonth);

export default router;
