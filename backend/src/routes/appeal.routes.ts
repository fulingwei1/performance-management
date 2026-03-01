import { Router } from 'express';
import { appealController } from '../controllers/appeal.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * 员工相关路由
 */
// 提交申诉
router.post('/', appealController.create);

// 查看自己的申诉列表
router.get('/my', appealController.getMyAppeals);

/**
 * HR相关路由
 */
// 查看所有申诉（需要HR或Admin权限）
router.get('/', requireRole('hr', 'admin', 'manager'), appealController.getAllAppeals);

// 处理申诉（需要HR或Admin权限）
router.put('/:id/review', requireRole('hr', 'admin', 'manager'), appealController.review);

/**
 * 通用路由
 */
// 查看申诉详情
router.get('/:id', appealController.getById);

export default router;
