import { NextFunction, Request, Response, Router } from 'express';
import { authenticate, requireManagerCapability } from '../middleware/auth';
import {
  getPerformanceDistribution,
  getDepartmentComparison,
  getPerformanceTrend,
  detectAnomalies,
  generateReport,
  getReportSummary
} from '../controllers/analytics.controller';

const router = Router();
const requireAnalyticsAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '未认证' });
  }
  if (['gm', 'hr', 'admin'].includes(req.user.role)) {
    return next();
  }
  return requireManagerCapability(req, res, next);
};

// All analytics routes require authentication
router.use(authenticate);
router.use(requireAnalyticsAccess);

router.get('/performance-distribution', getPerformanceDistribution);
router.get('/report-summary', getReportSummary);
router.get('/department-comparison', getDepartmentComparison);
router.get('/performance-trend', getPerformanceTrend);
router.get('/anomaly-detection', detectAnomalies);
router.get('/report/export', generateReport);

export default router;
