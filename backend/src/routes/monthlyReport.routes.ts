import { Router } from 'express';
import { monthlyReportController } from '../controllers/monthlyReport.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, monthlyReportController.getAll);
router.post('/', authenticate, monthlyReportController.create);
router.get('/:id', authenticate, monthlyReportController.getById);
router.put('/:id', authenticate, monthlyReportController.update);
router.post('/:id/comment', authenticate, requireRole('manager', 'gm'), monthlyReportController.comment);

export default router;
