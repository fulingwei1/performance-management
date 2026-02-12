import { Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { NotificationModel } from '../models/notification.model';
import { asyncHandler } from '../middleware/errorHandler';

export const notificationController = {
  // 获取我的消息列表
  getMyNotifications: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未授权'
      });
    }

    const readStatus = req.query.read;
    let read: boolean | undefined;
    
    if (readStatus === 'true') {
      read = true;
    } else if (readStatus === 'false') {
      read = false;
    }

    const notifications = await NotificationModel.findByUserId(userId, read);

    res.json({
      success: true,
      data: notifications
    });
  }),

  // 获取未读数量
  getUnreadCount: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未授权'
      });
    }

    const count = await NotificationModel.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  }),

  // 标记为已读
  markAsRead: [
    param('id').notEmpty().withMessage('消息ID不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const notificationId = req.params.id;
      
      // 验证消息是否属于当前用户
      const notification = await NotificationModel.findById(notificationId);
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          error: '消息不存在'
        });
      }

      if (notification.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权限操作此消息'
        });
      }

      await NotificationModel.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: '标记成功'
      });
    })
  ],

  // 全部标记为已读
  markAllAsRead: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未授权'
      });
    }

    const count = await NotificationModel.markAllAsRead(userId);

    res.json({
      success: true,
      message: '全部已读',
      data: { count }
    });
  }),

  // 根据ID获取消息详情
  getNotificationById: [
    param('id').notEmpty().withMessage('消息ID不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const notification = await NotificationModel.findById(req.params.id);
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          error: '消息不存在'
        });
      }

      if (notification.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权限查看此消息'
        });
      }

      res.json({
        success: true,
        data: notification
      });
    })
  ],
};
