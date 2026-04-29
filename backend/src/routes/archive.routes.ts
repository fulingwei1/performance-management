/**
 * 归档管理路由
 * GET    /api/archives          - 归档列表
 * GET    /api/archives/:month   - 获取归档详情
 * POST   /api/archives/:month   - 手动归档
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { ArchiveService } from '../services/archive.service';

const router = Router();

// 归档列表
router.get(
  '/',
  authenticate,
  requireRole('hr', 'gm', 'admin'),
  asyncHandler(async (_req: Request, res: Response) => {
    const archives = await ArchiveService.listArchives();
    return res.json({ success: true, data: archives });
  })
);

// 获取指定月份归档详情
router.get(
  '/:month',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const month = req.params.month as string;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ success: false, message: '月份格式错误，应为 YYYY-MM' });
    }

    const archive = await ArchiveService.getArchiveByMonth(month);
    if (!archive) {
      return res.status(404).json({ success: false, message: `${month} 暂无归档数据` });
    }
    return res.json({ success: true, data: archive });
  })
);

// 手动归档（仅 HR/GM/Admin）
router.post(
  '/:month',
  authenticate,
  requireRole('hr', 'gm', 'admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const month = req.params.month as string;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ success: false, message: '月份格式错误，应为 YYYY-MM' });
    }

    const alreadyArchived = await ArchiveService.isArchived(month);
    if (alreadyArchived) {
      return res.status(409).json({ success: false, message: `${month} 已归档` });
    }

    const user = (req as any).user;
    const result = await ArchiveService.archiveMonth(month, user?.id);
    return res.json({ success: true, data: result });
  })
);

export default router;
