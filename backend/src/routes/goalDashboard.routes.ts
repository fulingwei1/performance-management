import express from 'express';
import { authenticate } from '../middleware/auth';
import * as controller from '../controllers/goalDashboard.controller';

const router = express.Router();

router.get('/team-progress', authenticate, controller.getTeamProgress);
router.get('/progress-trend', authenticate, controller.getProgressTrend);

export default router;
