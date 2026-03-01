import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getPerformanceDistribution,
  getDepartmentComparison,
  getPerformanceTrend,
  detectAnomalies,
  generateReport
} from '../controllers/analytics.controller';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

router.get('/performance-distribution', getPerformanceDistribution);
router.get('/department-comparison', getDepartmentComparison);
router.get('/performance-trend', getPerformanceTrend);
router.get('/anomaly-detection', detectAnomalies);
router.get('/report/export', generateReport);

export default router;
