import { Router } from 'express';
import { quarterlySummaryController } from '../controllers/quarterlySummary.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, requireRole('manager'), quarterlySummaryController.upsert);
router.get('/my', authenticate, requireRole('manager'), quarterlySummaryController.getMySummaries);

export default router;
