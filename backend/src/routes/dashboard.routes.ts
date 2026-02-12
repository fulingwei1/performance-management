import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 管理层全局概览（GM/Manager）
router.get('/overview', dashboardController.getOverview);

// 个人进度统计（所有角色）
router.get('/my-progress', dashboardController.getMyProgress);

// 排行榜（GM/Manager）
router.get('/rankings', dashboardController.getRankings);

// 趋势数据（所有角色）
router.get('/trends', dashboardController.getTrends);

export default router;
