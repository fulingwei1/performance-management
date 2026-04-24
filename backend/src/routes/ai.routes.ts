import express from 'express';
import {
  predictPerformance,
  getPromotionCandidates,
  getDepartmentPromotionStats,
  getPerformanceAnomalies,
  getAnomalyStats
} from '../controllers/ai.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// AI 绩效预测
router.post('/predict-performance', requireRole('manager', 'gm', 'hr', 'admin'), predictPerformance);

// 晋升推荐
router.get('/promotion-candidates', requireRole('hr', 'gm', 'admin'), getPromotionCandidates);
router.get('/department/:departmentId/promotion-stats', requireRole('hr', 'gm', 'admin'), getDepartmentPromotionStats);

// 异常检测
router.get('/performance-anomalies', requireRole('manager', 'gm', 'hr', 'admin'), getPerformanceAnomalies);
router.get('/anomaly-stats', requireRole('manager', 'gm', 'hr', 'admin'), getAnomalyStats);

export default router;
