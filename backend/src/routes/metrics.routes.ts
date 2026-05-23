import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { metricsController } from '../controllers/metrics.controller';

const router = Router();

router.use(authenticate);
router.get('/', requireRole('manager', 'hr', 'gm', 'admin'), metricsController.getAll);
router.get('/templates', requireRole('manager', 'hr', 'gm', 'admin'), metricsController.getAll);

export default router;
