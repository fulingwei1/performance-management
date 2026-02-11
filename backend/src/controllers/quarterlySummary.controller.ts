import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { QuarterlySummaryModel } from '../models/quarterlySummary.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';

const QUARTER_REGEX = /^\d{4}-Q[1-4]$/;

export const quarterlySummaryController = {
  upsert: [
    body('quarter').matches(QUARTER_REGEX).withMessage('季度格式应为 YYYY-Q1'),
    body('summary').notEmpty().withMessage('季度工作总结不能为空'),
    body('nextQuarterPlan').optional().isString(),
    body('status').optional().isIn(['draft', 'submitted']).withMessage('状态无效'),

    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      if (!req.user) {
        return res.status(401).json({ success: false, error: '未认证' });
      }

      const { userId, role } = req.user;
      if (role !== 'manager') {
        return res.status(403).json({ success: false, error: '权限不足' });
      }

      const employee = await EmployeeModel.findById(userId);
      if (!employee) {
        return res.status(404).json({ success: false, error: '用户不存在' });
      }

      const { quarter, summary, nextQuarterPlan } = req.body;
      const status = (req.body.status || 'submitted') as 'draft' | 'submitted';
      const nextPlanValue = (nextQuarterPlan || '').toString();

      if (status !== 'draft' && !nextPlanValue.trim()) {
        return res.status(400).json({ success: false, error: '下季度计划不能为空' });
      }

      const saved = await QuarterlySummaryModel.upsert({
        managerId: userId,
        managerName: employee.name || '',
        quarter,
        summary: summary.toString(),
        nextQuarterPlan: nextPlanValue,
        status
      });

      res.json({
        success: true,
        data: saved,
        message: '季度总结已保存'
      });
    })
  ],

  getMySummaries: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未认证' });
    }

    const { userId, role } = req.user;
    if (role !== 'manager') {
      return res.status(403).json({ success: false, error: '权限不足' });
    }

    const quarter = req.query.quarter as string | undefined;
    if (quarter && !QUARTER_REGEX.test(quarter)) {
      return res.status(400).json({ success: false, error: '季度格式应为 YYYY-Q1' });
    }

    const records = await QuarterlySummaryModel.findByManagerId(userId, quarter);
    res.json({ success: true, data: records });
  })
};
