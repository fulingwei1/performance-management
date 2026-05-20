import { Router } from 'express';
import { automationController } from '../controllers/automation.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 手动补跑入口：仅保留当前 HR 手动触发页实际使用的能力
router.post('/generate-monthly-tasks', authenticate, requireRole('hr', 'admin'), automationController.generateMonthlyTasks);
router.post('/auto-publish', authenticate, requireRole('hr', 'admin'), automationController.autoPublish);
router.post('/check-reminders', authenticate, requireRole('hr', 'admin'), automationController.checkDeadlineReminders);

// 进度监控
router.get('/progress/:month', authenticate, automationController.getProgress);

// 手动发布
router.post('/publish', authenticate, requireRole('hr', 'admin'), automationController.publishMonth);

// 自动化日志
router.get('/logs', authenticate, requireRole('hr', 'admin'), automationController.getAutomationLogs);

// 演示数据管理
router.get('/demo-data/status', authenticate, requireRole('hr', 'admin'), automationController.getDemoDataStatus);
router.post('/demo-data/generate', authenticate, requireRole('hr', 'admin'), automationController.generateDemoData);
router.delete('/demo-data', authenticate, requireRole('hr', 'admin'), automationController.clearDemoData);

export default router;
