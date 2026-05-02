import { Router } from 'express';
import { exportPerformance } from '../controllers/dataExport.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/performance', authenticate, requireRole('hr', 'gm', 'admin'), exportPerformance);

export default router;
