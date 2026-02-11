import { Request, Response } from 'express';
import { GoalProgressModel } from '../models/goalProgress.model';
import { GoalProgress } from '../types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export class GoalProgressController {
  // 获取目标进度列表
  static async getAll(req: Request, res: Response) {
    try {
      const { employeeId, objectiveId, year, month } = req.query;
      
      const filters: any = {};
      if (employeeId) filters.employeeId = employeeId as string;
      if (objectiveId) filters.objectiveId = objectiveId as string;
      if (year) filters.year = parseInt(year as string);
      if (month) filters.month = parseInt(month as string);

      const progress = await GoalProgressModel.findAll(filters);
      res.json({ success: true, data: progress });
    } catch (error) {
      logger.error({ error }, '获取目标进度失败');
      res.status(500).json({ success: false, message: '获取目标进度失败' });
    }
  }

  // 获取单个目标进度
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const progress = await GoalProgressModel.findById(id as string);
      
      if (!progress) {
        return res.status(404).json({ success: false, message: '目标进度不存在' });
      }

      res.json({ success: true, data: progress });
    } catch (error) {
      logger.error({ error }, '获取目标进度失败');
      res.status(500).json({ success: false, message: '获取目标进度失败' });
    }
  }

  // 获取特定目标的特定月份进度
  static async getByObjectiveAndMonth(req: Request, res: Response) {
    try {
      const { objectiveId, year, month } = req.params;
      
      const progress = await GoalProgressModel.findByObjectiveAndMonth(
        objectiveId as string,
        parseInt(year as string),
        parseInt(month as string)
      );

      res.json({ success: true, data: progress });
    } catch (error) {
      logger.error({ error }, '获取目标进度失败');
      res.status(500).json({ success: false, message: '获取目标进度失败' });
    }
  }

  // 员工提交目标完成度
  static async submitEmployeeProgress(req: Request, res: Response) {
    try {
      const { objectiveId, year, month, completionRate, comment } = req.body;
      const employeeId = (req as any).user?.userId;

      if (!employeeId) {
        return res.status(401).json({ success: false, message: '未授权' });
      }

      // 检查是否已存在
      let progress = await GoalProgressModel.findByObjectiveAndMonth(
        objectiveId as string,
        year as number,
        month as number
      );

      if (progress) {
        // 更新
        progress = await GoalProgressModel.update(progress.id, {
          employeeCompletionRate: completionRate,
          employeeComment: comment,
          employeeSubmittedAt: new Date(),
          status: 'employee_submitted',
        });
      } else {
        // 创建
        const newProgress: GoalProgress = {
          id: uuidv4(),
          objectiveId,
          employeeId,
          year,
          month,
          employeeCompletionRate: completionRate,
          employeeComment: comment,
          employeeSubmittedAt: new Date(),
          status: 'employee_submitted',
        };
        progress = await GoalProgressModel.create(newProgress);
      }

      res.json({ success: true, data: progress, message: '提交成功' });
    } catch (error) {
      logger.error({ error }, '提交目标完成度失败');
      res.status(500).json({ success: false, message: '提交失败' });
    }
  }

  // 经理审核目标完成度
  static async reviewProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { completionRate, comment } = req.body;
      const managerId = (req as any).user?.userId;

      if (!managerId) {
        return res.status(401).json({ success: false, message: '未授权' });
      }

      const progress = await GoalProgressModel.update(id as string, {
        managerCompletionRate: completionRate,
        managerComment: comment,
        managerReviewedAt: new Date(),
        managerId,
        status: 'manager_reviewed',
      });

      if (!progress) {
        return res.status(404).json({ success: false, message: '目标进度不存在' });
      }

      res.json({ success: true, data: progress, message: '审核成功' });
    } catch (error) {
      logger.error({ error }, '审核目标完成度失败');
      res.status(500).json({ success: false, message: '审核失败' });
    }
  }

  // 批量获取员工的所有目标进度（用于月度汇报）
  static async getEmployeeMonthlyProgress(req: Request, res: Response) {
    try {
      const { employeeId, year, month } = req.params;

      const progress = await GoalProgressModel.findAll({
        employeeId: employeeId as string,
        year: parseInt(year as string),
        month: parseInt(month as string),
      });

      res.json({ success: true, data: progress });
    } catch (error) {
      logger.error({ error }, '获取员工月度进度失败');
      res.status(500).json({ success: false, message: '获取失败' });
    }
  }

  // 删除目标进度
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await GoalProgressModel.delete(id as string);

      if (!success) {
        return res.status(404).json({ success: false, message: '目标进度不存在' });
      }

      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      logger.error({ error }, '删除目标进度失败');
      res.status(500).json({ success: false, message: '删除失败' });
    }
  }
}
