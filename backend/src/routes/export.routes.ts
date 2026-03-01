import { Router, Request, Response, NextFunction } from 'express';
import { exportController } from '../controllers/export.controller';
import { authenticate, requireRole, verifyToken } from '../middleware/auth';

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

router.get('/monthly-performance', authenticateWithTokenParam, requireRole('hr', 'gm'), exportController.exportMonthlyPerformance);

router.get('/annual-performance', authenticateWithTokenParam, requireRole('hr', 'gm'), exportController.exportAnnualPerformance);

router.get('/employees', authenticateWithTokenParam, requireRole('hr', 'gm'), exportController.exportEmployees);

export default router;