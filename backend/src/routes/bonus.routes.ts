import { Router } from 'express';
import { bonusController } from '../controllers/bonus.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/config', authenticate, bonusController.getConfig);
router.put('/config', authenticate, requireRole('hr', 'admin'), bonusController.updateConfig);
router.post('/calculate', authenticate, requireRole('hr', 'admin'), bonusController.calculate);
router.get('/results', authenticate, bonusController.getResults);
router.put('/results/:id', authenticate, requireRole('hr', 'admin'), bonusController.updateResult);

export default router;
