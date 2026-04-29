/**
 * 进度监控路由
 * GET /api/progress/monitor/:month - 获取月度进度
 * GET /api/progress/monitor/months - 获取所有月份列表
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { ProgressMonitorService } from '../services/progressMonitor.service';

const router = Router();

// 获取月度进度快照
router.get(
  '/:month',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const month = req.params.month as string;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ success: false, message: '月份格式错误，应为 YYYY-MM' });
    }

    const progress = await ProgressMonitorService.getMonthProgress(month);
    return res.json({ success: true, data: progress });
  })
);

// 获取所有有记录的月份
router.get(
  '/months',
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const months = await ProgressMonitorService.listMonths();
    return res.json({ success: true, data: months });
  })
);

export default router;
