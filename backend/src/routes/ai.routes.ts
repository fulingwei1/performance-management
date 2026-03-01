import express from 'express';
import {
  predictPerformance,
  getPromotionCandidates,
  getDepartmentPromotionStats,
  getPerformanceAnomalies,
  getAnomalyStats
} from '../controllers/ai.controller';

const router = express.Router();

// AI 绩效预测
router.post('/predict-performance', predictPerformance);

// 晋升推荐
router.get('/promotion-candidates', getPromotionCandidates);
router.get('/department/:departmentId/promotion-stats', getDepartmentPromotionStats);

// 异常检测
router.get('/performance-anomalies', getPerformanceAnomalies);
router.get('/anomaly-stats', getAnomalyStats);

export default router;
