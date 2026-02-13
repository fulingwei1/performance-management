import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllLogs,
  getUserLogs,
  getTargetLogs,
  getStats,
} from '../controllers/auditLog.controller';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取所有审计日志（支持过滤）- 仅 HR/admin
router.get('/', getAllLogs);

// 获取统计信息 - 仅 HR/admin
router.get('/stats', getStats);

// 获取某用户的操作历史
router.get('/user/:userId', getUserLogs);

// 获取某对象的操作历史 - 仅 HR/admin
router.get('/target/:type/:id', getTargetLogs);

export default router;
