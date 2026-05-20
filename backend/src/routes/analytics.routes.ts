import { NextFunction, Request, Response, Router } from 'express';
import { authenticate, requireManagerCapability } from '../middleware/auth';
import { getReportSummary } from '../controllers/analytics.controller';

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

router.get('/report-summary', getReportSummary);

export default router;
