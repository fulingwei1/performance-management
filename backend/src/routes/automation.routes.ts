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

// HR解冻接口
router.post('/unfreeze/:recordId', authenticate, requireRole('hr', 'admin'), automationController.unfreezeTask);
router.post('/batch-unfreeze', authenticate, requireRole('hr', 'admin'), automationController.batchUnfreeze);

export default router;
