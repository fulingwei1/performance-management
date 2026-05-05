import express from 'express';
import * as assessmentController from '../controllers/monthlyAssessment.controller';
import { NextFunction, Request, Response } from 'express';
import { authenticate, requireManagerCapability } from '../middleware/auth';

const router = express.Router();

const requireAssessmentScoringAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '未认证' });
  }
  if (['gm', 'hr', 'admin'].includes(req.user.role)) {
    return next();
  }
  return requireManagerCapability(req, res, next);
};

// 获取当月考核列表
router.get('/monthly-list', authenticate, assessmentController.getMonthlyList);

// 员工自评提交
router.post('/self-assessment', authenticate, assessmentController.submitSelfAssessment);

// 主管评分提交
router.post('/submit-score', authenticate, requireAssessmentScoringAccess, assessmentController.submitScore);

// 月度评分管理（兼容旧 API）
router.post('/monthly', authenticate, requireAssessmentScoringAccess, assessmentController.createOrUpdateAssessment);
router.get('/employee/:employeeId', authenticate, assessmentController.getEmployeeAssessments);
router.get('/employee/:employeeId/month/:month', authenticate, assessmentController.getAssessmentByMonth);

export default router;
