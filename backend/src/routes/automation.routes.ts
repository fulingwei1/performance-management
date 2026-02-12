import { Router } from 'express';
import { automationController } from '../controllers/automation.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 自动任务生成接口（供 cron 调用，需要认证）
router.post('/generate-monthly-tasks', authenticate, automationController.generateMonthlyTasks);
router.post('/generate-quarterly-tasks', authenticate, automationController.generateQuarterlyTasks);
router.post('/freeze-overdue-tasks', authenticate, automationController.freezeOverdueTasks);
router.post('/check-reminders', authenticate, automationController.checkDeadlineReminders);

// HR解冻接口
router.post('/unfreeze/:recordId', authenticate, requireRole('hr', 'admin'), automationController.unfreezeTask);
router.post('/batch-unfreeze', authenticate, requireRole('hr', 'admin'), automationController.batchUnfreeze);

export default router;
