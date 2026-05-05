import { Router } from 'express';
import { automationController } from '../controllers/automation.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 自动化任务管理（供 cron 或手动触发）
router.post('/generate-monthly-tasks', authenticate, automationController.generateMonthlyTasks);
router.post('/generate-monthly-stats', authenticate, automationController.generateMonthlyStats);
router.post('/auto-publish', authenticate, automationController.autoPublish);
router.post('/check-reminders', authenticate, automationController.checkDeadlineReminders);
router.post('/push-quarter-results', authenticate, requireRole('hr', 'admin'), automationController.pushQuarterResults);

// 前端 MonthlyAutomation 统一触发入口别名
router.post('/trigger/generate-monthly-tasks', authenticate, requireRole('hr', 'admin'), automationController.generateMonthlyTasks);
router.post('/trigger/generate-monthly-stats', authenticate, requireRole('hr', 'admin'), automationController.generateMonthlyStats);
router.post('/trigger/auto-publish', authenticate, requireRole('hr', 'admin'), automationController.autoPublish);
router.post('/trigger/check-reminders', authenticate, requireRole('hr', 'admin'), automationController.checkDeadlineReminders);
router.post('/trigger/archive', authenticate, requireRole('hr', 'admin'), automationController.archiveMonth);

// 测试通知渠道连通性
router.post('/test-wecom', authenticate, requireRole('hr', 'admin'), automationController.testWecom);
router.post('/test-email', authenticate, requireRole('hr', 'admin'), automationController.testEmail);

// 归档管理
router.post('/archive', authenticate, requireRole('hr', 'admin'), automationController.archiveMonth);
router.get('/archives', authenticate, automationController.listArchives);

// 进度监控
router.get('/progress/:month', authenticate, automationController.getProgress);
router.get('/months', authenticate, automationController.listMonths);

// 手动发布
router.post('/publish', authenticate, requireRole('hr', 'admin'), automationController.publishMonth);

// 自动化日志
router.get('/logs', authenticate, requireRole('hr', 'admin'), automationController.getAutomationLogs);

// 演示数据管理
router.get('/demo-data/status', authenticate, requireRole('hr', 'admin'), automationController.getDemoDataStatus);
router.post('/demo-data/generate', authenticate, requireRole('hr', 'admin'), automationController.generateDemoData);
router.delete('/demo-data', authenticate, requireRole('hr', 'admin'), automationController.clearDemoData);

// HR解冻接口
router.post('/unfreeze/:recordId', authenticate, requireRole('hr', 'admin'), automationController.unfreezeTask);
router.post('/batch-unfreeze', authenticate, requireRole('hr', 'admin'), automationController.batchUnfreeze);

export default router;
