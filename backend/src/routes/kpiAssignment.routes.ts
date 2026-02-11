import { Router } from 'express';
import { kpiAssignmentController } from '../controllers/kpiAssignment.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, kpiAssignmentController.getAll);
router.get('/my', authenticate, kpiAssignmentController.getMy);
router.post('/', authenticate, requireRole('manager', 'gm', 'hr'), kpiAssignmentController.create);
router.put('/:id', authenticate, kpiAssignmentController.update);

export default router;
