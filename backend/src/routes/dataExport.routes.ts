import { Router } from 'express';
import { exportPerformance, exportObjectives } from '../controllers/dataExport.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/performance', authenticate, requireRole('hr', 'gm', 'admin'), exportPerformance);
router.get('/objectives', authenticate, requireRole('hr', 'gm', 'admin'), exportObjectives);

export default router;
