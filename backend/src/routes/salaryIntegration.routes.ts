import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { salaryIntegrationController } from '../controllers/salaryIntegration.controller';

const router = Router();

// 全部需要认证
router.use(authenticate);

// POST /api/salary-integration/salary-forecast — 经理评分时只读查看绩效工资预测
router.post('/salary-forecast', requireRole('manager', 'hr', 'admin', 'gm'), salaryIntegrationController.getSalaryForecast);

// POST /api/salary-integration/push — 按月/按季度推送绩效
router.post('/push', requireRole('hr', 'admin'), salaryIntegrationController.pushByPeriod);

// POST /api/salary-integration/push-quarterly — 推送季度绩效
router.post('/push-quarterly', requireRole('hr', 'admin'), salaryIntegrationController.pushQuarterly);

// POST /api/salary-integration/push-monthly — 推送月度绩效
router.post('/push-monthly', requireRole('hr', 'admin'), salaryIntegrationController.pushMonthly);

export default router;
