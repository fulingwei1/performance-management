import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { SalaryIntegrationService } from '../services/salaryIntegration.service';

export const salaryIntegrationController = {
  /**
   * POST /api/salary-integration/push-quarterly
   * 推送季度绩效到薪资系统
   */
  pushQuarterly: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const { year, quarter } = req.body;
    if (!year || !quarter || quarter < 1 || quarter > 4) {
      return res.status(400).json({ success: false, message: '请提供有效的 year 和 quarter (1-4)' });
    }

    const result = await SalaryIntegrationService.pushQuarterlyResults(Number(year), Number(quarter));
    res.json(result);
  }),

  /**
   * POST /api/salary-integration/push-monthly
   * 推送月度绩效到薪资系统
   */
  pushMonthly: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const { year, month } = req.body;
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: '请提供有效的 year 和 month (1-12)' });
    }

    const result = await SalaryIntegrationService.pushMonthlyResults(Number(year), Number(month));
    res.json(result);
  })
};
