import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { settingsController } from '../controllers/settings.controller';

const router = Router();

router.use(authenticate);

router.get('/', settingsController.getAll);
router.get('/:key', settingsController.getByKey);
router.put('/:key', requireRole('hr', 'admin'), settingsController.upsertByKey);
router.post('/:key', requireRole('hr', 'admin'), settingsController.upsertByKey);

export default router;
