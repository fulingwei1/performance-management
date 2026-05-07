import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, settingsController.listSettings);
router.get('/assessment-scope', authenticate, settingsController.getAssessmentScope);
router.put('/assessment-scope', authenticate, requireRole('hr', 'admin'), settingsController.updateAssessmentScope);

export default router;
