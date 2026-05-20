import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { SalaryIntegrationService } from '../services/salaryIntegration.service';

export const salaryIntegrationController = {
  /**
   * GET /api/integrations/salary/status
   * 只返回连接配置状态，不暴露 token。
   */
  getStatus: asyncHandler(async (_req: Request, res: Response) => {
    const baseUrl = (process.env.SALARY_SYSTEM_BASE_URL || process.env.SALARY_API_URL || '').trim();
    const hasToken = Boolean((process.env.SALARY_SYSTEM_PUSH_TOKEN || '').trim());

    res.json({
      success: true,
      data: {
        configured: Boolean(baseUrl && hasToken),
        hasBaseUrl: Boolean(baseUrl),
        hasPushToken: hasToken,
        baseUrl: baseUrl ? baseUrl.replace(/\/\/.*@/, '//***@') : '',
        pushRequiresAdminConfirmation: true,
        supportedPeriods: ['monthly', 'quarterly']
      }
    });
  }),

  /**
   * POST /api/salary-integration/push
   * 管理员选择按月或按季度推送绩效到薪资系统
   */
  pushByPeriod: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const { periodType, year, month, quarter } = req.body;
    if (periodType !== 'monthly' && periodType !== 'quarterly') {
      return res.status(400).json({ success: false, message: '请选择按月或按季度推送' });
    }
    if (!year) {
      return res.status(400).json({ success: false, message: '请提供有效的年份' });
    }

    const result = await SalaryIntegrationService.pushResults({
      periodType,
      year: Number(year),
      month: month ? Number(month) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      confirmedByAdmin: req.body.confirmedByAdmin === true,
      confirmedBy: req.user.userId,
    });
    res.status(result.requiresConfirmation ? 409 : 200).json(result);
  }),

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

    const result = await SalaryIntegrationService.pushQuarterlyResults(Number(year), Number(quarter), {
      confirmedByAdmin: req.body.confirmedByAdmin === true,
      confirmedBy: req.user.userId,
    });
    res.status(result.requiresConfirmation ? 409 : 200).json(result);
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

    const result = await SalaryIntegrationService.pushMonthlyResults(Number(year), Number(month), {
      confirmedByAdmin: req.body.confirmedByAdmin === true,
      confirmedBy: req.user.userId,
    });
    res.status(result.requiresConfirmation ? 409 : 200).json(result);
  })
};
