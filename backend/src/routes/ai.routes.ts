import express from 'express';
import {
  predictPerformance,
  getPromotionCandidates,
  getDepartmentPromotionStats,
  getPerformanceAnomalies,
  getAnomalyStats,
  getPredictionAlerts
} from '../controllers/ai.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// AI 绩效预测
router.post('/predict-performance', predictPerformance);

// 晋升推荐
router.get('/promotion-candidates', getPromotionCandidates);
router.get('/department/:departmentId/promotion-stats', getDepartmentPromotionStats);

// 异常检测
router.get('/performance-anomalies', getPerformanceAnomalies);
router.get('/anomaly-stats', getAnomalyStats);

// 预测预警
router.get('/risk-alerts', authenticate, requireRole('manager', 'hr', 'admin', 'gm'), getPredictionAlerts);

export default router;
