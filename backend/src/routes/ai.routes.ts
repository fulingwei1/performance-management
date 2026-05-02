import express from 'express';
import {
  predictPerformance,
  getPromotionCandidates,
  getDepartmentPromotionStats,
  getPerformanceAnomalies,
  getAnomalyStats,
  generateQuarterlySummary,
  generateGoalDecomposition,
  generateCompanyStrategy,
  generateCompanyKeyWorks,
  generateDepartmentKeyWorks,
  generateGoalConfirmationFeedback,
  generateGoalProgressComment,
  generateSelfSummary,
  generateNextMonthPlan,
  generateManagerComment,
  generateWorkArrangement
} from '../controllers/ai.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// AI 季度总结生成
router.post('/quarterly-summary', requireRole('manager', 'gm', 'hr', 'admin'), generateQuarterlySummary);

// AI 绩效预测
router.post('/predict-performance', requireRole('manager', 'gm', 'hr', 'admin'), predictPerformance);

// 晋升推荐
router.get('/promotion-candidates', requireRole('hr', 'gm', 'admin'), getPromotionCandidates);
router.get('/department/:departmentId/promotion-stats', requireRole('hr', 'gm', 'admin'), getDepartmentPromotionStats);

// 异常检测
router.get('/performance-anomalies', requireRole('manager', 'gm', 'hr', 'admin'), getPerformanceAnomalies);
router.get('/anomaly-stats', requireRole('manager', 'gm', 'hr', 'admin'), getAnomalyStats);

// AI 目标管理
router.post('/goal-decomposition', generateGoalDecomposition);
router.post('/company-strategy', requireRole('gm', 'admin'), generateCompanyStrategy);
router.post('/company-key-works', requireRole('gm', 'admin'), generateCompanyKeyWorks);
router.post('/department-key-works', requireRole('manager', 'gm', 'hr', 'admin'), generateDepartmentKeyWorks);
router.post('/goal-confirmation-feedback', generateGoalConfirmationFeedback);
router.post('/goal-progress-comment', generateGoalProgressComment);

// AI 月度考核辅助
router.post('/self-summary', generateSelfSummary);
router.post('/next-month-plan', generateNextMonthPlan);
router.post('/manager-comment', requireRole('manager', 'gm', 'hr', 'admin'), generateManagerComment);
router.post('/work-arrangement', requireRole('manager', 'gm', 'hr', 'admin'), generateWorkArrangement);

export default router;
