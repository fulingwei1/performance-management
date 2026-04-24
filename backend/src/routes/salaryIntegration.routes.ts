import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { salaryIntegrationController } from '../controllers/salaryIntegration.controller';

const router = Router();

const quarterValidation = [
  body('quarter')
    .notEmpty()
    .withMessage('季度不能为空')
    .matches(/^\d{4}-Q[1-4]$/)
    .withMessage('季度格式应为 YYYY-Q1'),
];

// 计算季度绩效结果，并推送到薪资系统（HR/Admin）
router.post(
  '/push-quarter-results',
  authenticate,
  requireRole('hr', 'admin'),
  validate(quarterValidation),
  salaryIntegrationController.pushQuarterResults
);

export default router;
