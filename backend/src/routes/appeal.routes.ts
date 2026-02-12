import { Router } from 'express';
import { appealController } from '../controllers/appeal.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 员工提交申诉
router.post('/', authenticate, appealController.createAppeal);

// 查询申诉列表（员工看自己，HR看全部）
router.get('/', authenticate, appealController.getAppeals);

// 根据ID获取申诉详情
router.get('/:id', authenticate, appealController.getAppealById);

// HR处理申诉（批准/拒绝）
router.put('/:id/review', authenticate, requireRole(['hr', 'admin']), appealController.reviewAppeal);

// 删除申诉（仅允许删除自己的待处理申诉）
router.delete('/:id', authenticate, appealController.deleteAppeal);

export default router;
