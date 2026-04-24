import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { performanceConfigController } from '../controllers/performanceConfig.controller';

const router = Router();

router.use(authenticate, requireRole('hr', 'admin'));

router.get('/ranking', performanceConfigController.getRankingConfig);
router.put('/ranking', performanceConfigController.updateRankingConfig);
router.get('/ranking/preview', performanceConfigController.previewMonth);
router.post('/ranking/recalculate', performanceConfigController.recalculateMonthRanks);

export default router;
