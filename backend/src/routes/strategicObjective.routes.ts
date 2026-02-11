import { Router } from 'express';
import { strategicObjectiveController } from '../controllers/strategicObjective.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, strategicObjectiveController.getAll);
router.post('/', authenticate, requireRole('gm', 'hr'), strategicObjectiveController.create);
router.get('/:id', authenticate, strategicObjectiveController.getById);
router.put('/:id', authenticate, requireRole('gm', 'hr'), strategicObjectiveController.update);
router.delete('/:id', authenticate, requireRole('gm', 'hr'), strategicObjectiveController.delete);
router.post('/:id/decompose', authenticate, requireRole('gm', 'hr'), strategicObjectiveController.decompose);

export default router;
