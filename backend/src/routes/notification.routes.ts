import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 获取我的消息列表（需要认证）
router.get('/', authenticate, notificationController.getMyNotifications);

// 获取未读数量（需要认证）
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// 全部标记为已读（需要认证）
router.put('/read-all', authenticate, notificationController.markAllAsRead);

// 根据ID获取消息详情（需要认证）
router.get('/:id', authenticate, notificationController.getNotificationById);

// 标记为已读（需要认证）
router.put('/:id/read', authenticate, notificationController.markAsRead);

export default router;
