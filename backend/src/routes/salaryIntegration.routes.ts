import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { salaryIntegrationController } from '../controllers/salaryIntegration.controller';

const router = Router();

// 全部需要认证
router.use(authenticate);

// POST /api/salary-integration/push-quarterly — 推送季度绩效
router.post('/push-quarterly', salaryIntegrationController.pushQuarterly);

// POST /api/salary-integration/push-monthly — 推送月度绩效
router.post('/push-monthly', salaryIntegrationController.pushMonthly);

export default router;
