import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AppealModel } from '../models/appeal.model';
import { PerformanceModel } from '../models/performance.model';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

export const appealController = {
  /**
   * 员工提交申诉
   * POST /api/appeals
   */
  create: [
    body('performanceRecordId').notEmpty().withMessage('绩效记录ID不能为空'),
    body('reason').notEmpty().withMessage('申诉原因不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '未认证'
        });
      }
      
      const { performanceRecordId, reason } = req.body;
      const employeeId = req.user.userId;
      
      // 检查绩效记录是否存在
      const performanceRecord = await PerformanceModel.findById(performanceRecordId);
      if (!performanceRecord) {
        return res.status(404).json({
          success: false,
          message: '绩效记录不存在'
        });
      }
      
      // 验证该绩效记录是否属于当前员工
      if (performanceRecord.employeeId !== employeeId) {
        return res.status(403).json({
          success: false,
          message: '您无权对此绩效记录提起申诉'
        });
      }
      
      // 检查是否已经提交过申诉
      const exists = await AppealModel.existsByPerformanceRecord(
        employeeId,
        performanceRecordId
      );
      
      if (exists) {
        return res.status(400).json({
          success: false,
          message: '您已对此绩效记录提交过申诉'
        });
      }
      
      // 创建申诉记录
      const appeal = await AppealModel.create({
        performanceRecordId,
        employeeId,
        reason,
        status: 'pending'
      });
      
      logger.info(`员工 ${employeeId} 提交申诉 ${appeal.id}`);
      
      res.json({
        success: true,
        data: appeal,
        message: '申诉提交成功'
      });
    })
  ],
  
  /**
   * 员工查看自己的申诉列表
   * GET /api/appeals/my
   */
  getMyAppeals: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }
    
    const appeals = await AppealModel.findByEmployeeId(req.user.userId);
    
    res.json({
      success: true,
      data: appeals
    });
  }),
  
  /**
   * HR查看所有申诉
   * GET /api/appeals
   * Query参数: status, department
   */
  getAllAppeals: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }
    
    const { status, department } = req.query;
    
    const filters: any = {};
    if (status) {
      filters.status = status as string;
    }
    if (department) {
      filters.department = department as string;
    }
    
    const appeals = await AppealModel.findAll(filters);
    
    res.json({
      success: true,
      data: appeals
    });
  }),
  
  /**
   * HR处理申诉
   * PUT /api/appeals/:id/review
   */
  review: [
    body('status')
      .isIn(['approved', 'rejected'])
      .withMessage('状态必须是 approved 或 rejected'),
    body('hrComment').optional().isString().withMessage('HR备注必须是字符串'),
    
    asyncHandler(async (req: Request, res: Response) => {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '未认证'
        });
      }
      
      const id = req.params.id as string;
      const { status, hrComment } = req.body;
      const hrId = req.user.userId;
      
      // 检查申诉是否存在
      const appeal = await AppealModel.findById(id);
      if (!appeal) {
        return res.status(404).json({
          success: false,
          message: '申诉记录不存在'
        });
      }
      
      // 检查申诉状态
      if (appeal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '该申诉已被处理'
        });
      }
      
      // 更新申诉状态
      const updated = await AppealModel.review(id, hrId, status, hrComment);
      
      logger.info(`HR ${hrId} 处理申诉 ${id}, 结果: ${status}`);
      
      res.json({
        success: true,
        data: updated,
        message: status === 'approved' ? '申诉已批准' : '申诉已拒绝'
      });
    })
  ],
  
  /**
   * 根据ID查看申诉详情
   * GET /api/appeals/:id
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }
    
    const id = req.params.id as string;
    const appeal = await AppealModel.findById(id);
    
    if (!appeal) {
      return res.status(404).json({
        success: false,
        message: '申诉记录不存在'
      });
    }
    
    // 权限检查：员工只能查看自己的申诉，HR/Admin可以查看所有
    const userRole = req.user.role;
    if (userRole === 'employee' || userRole === 'manager') {
      if (appeal.employeeId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: '无权查看此申诉'
        });
      }
    }
    
    res.json({
      success: true,
      data: appeal
    });
  })
};
