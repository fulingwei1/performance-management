import { Router } from 'express';
import { performanceInterviewController } from '../controllers/performanceInterview.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, performanceInterviewController.getAll);
router.post('/', authenticate, requireRole('manager', 'gm', 'hr'), performanceInterviewController.create);
router.get('/:id', authenticate, performanceInterviewController.getById);
router.put('/:id', authenticate, requireRole('manager', 'gm', 'hr'), performanceInterviewController.update);

export default router;
