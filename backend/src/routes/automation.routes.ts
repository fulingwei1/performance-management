import { Router } from 'express';
import { automationController } from '../controllers/automation.controller';
import { authenticateOrAutomationService, requireRole } from '../middleware/auth';

const router = Router();

// 手动补跑入口：仅保留当前 HR 手动触发页实际使用的能力
router.get('/months', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.getMonths);
router.post('/generate-monthly-tasks', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.generateMonthlyTasks);
router.post('/auto-publish', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.autoPublish);
router.post('/check-reminders', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.checkDeadlineReminders);
router.post('/employee-task/generate', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.generateEmployeeTask);
router.delete('/employee-task', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.deleteEmployeeTask);
router.post('/employee-task/remind', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.remindEmployeeTask);
router.post('/employee-tasks/generate', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.batchGenerateEmployeeTasks);
router.delete('/employee-tasks', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.batchDeleteEmployeeTasks);
router.post('/employee-tasks/remind', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.batchRemindEmployeeTasks);

// 进度监控
router.get('/progress/:month', authenticateOrAutomationService, automationController.getProgress);

// 手动发布
router.post('/publish', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.publishMonth);

// 自动化日志
router.get('/logs', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.getAutomationLogs);

// 演示数据管理
router.get('/demo-data/status', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.getDemoDataStatus);
router.post('/demo-data/generate', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.generateDemoData);
router.delete('/demo-data', authenticateOrAutomationService, requireRole('hr', 'admin'), automationController.clearDemoData);

export default router;
