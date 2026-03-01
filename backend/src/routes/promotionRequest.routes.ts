import { Router, Request, Response, NextFunction } from 'express';
import { promotionRequestController } from '../controllers/promotionRequest.controller';
import { authenticate, requireRole, verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { 
  submitPromotionValidation, 
  reviewPromotionValidation 
} from '../validators/promotion.validator';

const router = Router();

const authenticateWithTokenParam = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }
    
    if (!token) {
      res.status(401).json({ success: false, message: '未提供认证令牌' });
      return;
    }
    
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: '认证令牌无效或已过期' });
  }
};

// 创建申请（员工/经理）
router.post('/', authenticate, requireRole('employee', 'manager'), validate(submitPromotionValidation), promotionRequestController.create);

// 获取我的申请
router.get('/my', authenticate, promotionRequestController.getMyRequests);

// 获取待审批（经理/总经理/HR）
router.get('/pending', authenticate, requireRole('manager', 'gm', 'hr'), promotionRequestController.getPending);

// 审批历史（分页）
router.get('/history', authenticate, requireRole('manager', 'gm', 'hr'), promotionRequestController.getHistory);

// 审批记录导出
router.get('/export', authenticateWithTokenParam, requireRole('manager', 'gm', 'hr'), promotionRequestController.exportRecords);

// 审批通过
router.post('/:id/approve', authenticate, requireRole('manager', 'gm', 'hr'), validate(reviewPromotionValidation), promotionRequestController.approve);

// 审批拒绝
router.post('/:id/reject', authenticate, requireRole('manager', 'gm', 'hr'), validate(reviewPromotionValidation), promotionRequestController.reject);

export default router;
