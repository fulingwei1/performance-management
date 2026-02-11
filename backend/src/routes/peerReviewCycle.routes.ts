import { Router } from 'express';
import { peerReviewCycleController } from '../controllers/peerReviewCycle.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.post('/cycles', authenticate, requireRole('hr', 'admin'), peerReviewCycleController.createCycle);
router.get('/cycles', authenticate, peerReviewCycleController.getCycles);
router.get('/pending', authenticate, peerReviewCycleController.getPending);
router.post('/submit', authenticate, peerReviewCycleController.submit);
router.get('/results/:cycleId', authenticate, peerReviewCycleController.getResults);

export default router;
