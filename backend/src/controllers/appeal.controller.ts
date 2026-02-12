import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AppealModel } from '../models/appeal.model';
import { PerformanceModel } from '../models/performance.model';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const appealController = {
  // 员工提交申诉
  createAppeal: [
    body('performanceRecordId').notEmpty().withMessage('考核记录ID不能为空'),
    body('reason').notEmpty().withMessage('申诉理由不能为空')
      .isLength({ min: 10 }).withMessage('申诉理由至少10个字符'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未认证'
        });
      }

      const { performanceRecordId, reason } = req.body;

      // 验证考核记录是否存在
      const record = await PerformanceModel.findById(performanceRecordId);
      if (!record) {
        return res.status(404).json({
          success: false,
          error: '考核记录不存在'
        });
      }

      // 验证员工权限（只能对自己的考核记录申诉）
      if (record.employeeId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: '无权对此考核记录申诉'
        });
      }

      // 检查是否已有待处理的申诉
      const existingAppeals = await AppealModel.findAll({
        employeeId: req.user.userId,
        status: 'pending'
      });

      const hasPendingAppeal = existingAppeals.some(
        a => a.performanceRecordId === performanceRecordId
      );

      if (hasPendingAppeal) {
        return res.status(400).json({
          success: false,
          error: '该考核记录已有待处理的申诉'
        });
      }

      // 创建申诉
      const appeal = await AppealModel.create({
        id: uuidv4(),
        performanceRecordId,
        employeeId: req.user.userId,
        reason,
        status: 'pending'
      });

      res.status(201).json({
        success: true,
        data: appeal
      });
    })
  ],

  // 查询申诉列表（员工看自己，HR看全部）
  getAppeals: [
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未认证'
        });
      }

      let appeals;

      // HR可以看所有申诉
      if (req.user.role === 'hr' || req.user.role === 'admin') {
        const { status } = req.query;
        appeals = await AppealModel.findAll(
          status ? { status: status as string } : undefined
        );
      } else {
        // 员工只能看自己的申诉
        appeals = await AppealModel.findAll({
          employeeId: req.user.userId
        });
      }

      res.json({
        success: true,
        data: appeals
      });
    })
  ],

  // 根据ID获取申诉详情
  getAppealById: [
    param('id').notEmpty().withMessage('申诉ID不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未认证'
        });
      }

      const { id } = req.params;
      const appeal = await AppealModel.findById(id);

      if (!appeal) {
        return res.status(404).json({
          success: false,
          error: '申诉不存在'
        });
      }

      // 验证权限（员工只能看自己的，HR可以看全部）
      const isHR = req.user.role === 'hr' || req.user.role === 'admin';
      const isOwner = appeal.employeeId === req.user.userId;

      if (!isHR && !isOwner) {
        return res.status(403).json({
          success: false,
          error: '无权查看此申诉'
        });
      }

      res.json({
        success: true,
        data: appeal
      });
    })
  ],

  // HR处理申诉（批准/拒绝）
  reviewAppeal: [
    param('id').notEmpty().withMessage('申诉ID不能为空'),
    body('status').isIn(['approved', 'rejected']).withMessage('状态必须是approved或rejected'),
    body('hrComment').notEmpty().withMessage('HR评语不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未认证'
        });
      }

      // 验证HR权限
      if (req.user.role !== 'hr' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '无权处理申诉'
        });
      }

      const { id } = req.params;
      const { status, hrComment } = req.body;

      const appeal = await AppealModel.findById(id);
      if (!appeal) {
        return res.status(404).json({
          success: false,
          error: '申诉不存在'
        });
      }

      // 验证申诉状态
      if (appeal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: '该申诉已被处理'
        });
      }

      // 更新申诉
      const updated = await AppealModel.update(id, {
        status,
        hrComment,
        hrId: req.user.userId
      });

      res.json({
        success: true,
        data: updated
      });
    })
  ],

  // 删除申诉（仅允许删除自己的待处理申诉）
  deleteAppeal: [
    param('id').notEmpty().withMessage('申诉ID不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未认证'
        });
      }

      const { id } = req.params;
      const appeal = await AppealModel.findById(id);

      if (!appeal) {
        return res.status(404).json({
          success: false,
          error: '申诉不存在'
        });
      }

      // 验证权限（只能删除自己的待处理申诉）
      if (appeal.employeeId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: '无权删除此申诉'
        });
      }

      if (appeal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: '只能删除待处理的申诉'
        });
      }

      await AppealModel.delete(id);

      res.json({
        success: true,
        message: '申诉已删除'
      });
    })
  ]
};
