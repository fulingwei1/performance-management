import { Router } from 'express';
import { satisfactionSurveyController } from '../controllers/satisfactionSurvey.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/current', authenticate, satisfactionSurveyController.getCurrent);
router.post('/current/ensure', authenticate, requireRole('hr', 'admin'), satisfactionSurveyController.ensureCurrent);

router.get('/', authenticate, requireRole('hr', 'admin'), satisfactionSurveyController.list);
router.get('/:id/stats', authenticate, requireRole('hr', 'admin'), satisfactionSurveyController.getStats);
router.post('/:id/responses', authenticate, satisfactionSurveyController.submitResponse);
router.post('/:id/open', authenticate, requireRole('hr', 'admin'), satisfactionSurveyController.open);
router.post('/:id/close', authenticate, requireRole('hr', 'admin'), satisfactionSurveyController.close);

export default router;
