import { Router } from 'express';
import { peerReviewController } from '../controllers/peerReview.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';
import { PeerReviewModel } from '../models/peerReview.model';
import logger from '../config/logger';

const router = Router();

// 获取我的360度评价（作为被评价人）
router.get('/my-reviews', authenticate, peerReviewController.getMyPeerReviews);

// 获取我的360度评价任务（作为评价人）
router.get('/my-tasks', authenticate, peerReviewController.getMyPeerReviewTasks);

// 提交360度评价
router.post('/submit', authenticate, peerReviewController.submitPeerReview);

// 分配360度评价任务（HR或经理操作）
router.post('/allocate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('[DEBUG] 分配360度评价任务 - 用户信息:', req.user);
    logger.info('[DEBUG] 请求体:', req.body);
    
    const user = req.user as any;
    
    if (!user) {
      logger.info('[DEBUG] 用户未认证');
      return res.status(401).json({ success: false, error: '未认证' });
    }
    
    logger.info('[DEBUG] 用户角色:', user.role);
    
    if (user.role !== 'hr' && user.role !== 'manager') {
      logger.info('[DEBUG] 权限检查失败，角色不是hr或manager');
      return res.status(403).json({ success: false, error: '无权操作' });
    }
    
    logger.info('[DEBUG] 权限检查通过，开始分配...');
    
    // 直接调用Model方法
    const { month, department } = req.body;
    const allocations = await PeerReviewModel.allocatePeerReviews(department, month);
    logger.info('[DEBUG] 分配结果:', allocations);
    
    return res.json({
      success: true,
      data: allocations,
      message: `已为部门${department}分配${allocations.length}个360度评价任务`
    });
  } catch (error: any) {
    logger.error('[ERROR] 分配360度评价任务失败:', error);
    return res.status(500).json({ success: false, error: error.message || '分配失败' });
  }
});

// 获取部门360度评价统计（经理）
router.get('/department-stats', authenticate, peerReviewController.getDepartmentPeerReviewStats);

// 获取部门的360度评价记录（经理）
router.get('/department-reviews', authenticate, peerReviewController.getDepartmentPeerReviews);

export default router;
