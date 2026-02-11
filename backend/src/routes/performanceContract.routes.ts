import { Router } from 'express';
import { performanceContractController } from '../controllers/performanceContract.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, performanceContractController.getAll);
router.post('/', authenticate, requireRole('manager', 'gm', 'hr'), performanceContractController.create);
router.get('/:id', authenticate, performanceContractController.getById);
router.put('/:id', authenticate, requireRole('manager', 'gm', 'hr'), performanceContractController.update);
router.post('/:id/sign', authenticate, performanceContractController.sign);

export default router;
