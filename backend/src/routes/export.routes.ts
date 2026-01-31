import { Router } from 'express';
import { exportController } from '../controllers/export.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/monthly-performance', authenticate, requireRole('hr'), exportController.exportMonthlyPerformance);

router.get('/annual-performance', authenticate, requireRole('hr'), exportController.exportAnnualPerformance);

router.get('/employees', authenticate, requireRole('hr'), exportController.exportEmployees);

export default router;