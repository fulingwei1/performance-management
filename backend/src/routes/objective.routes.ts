import { Router } from 'express';
import { objectiveController } from '../controllers/objective.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, objectiveController.getAll);
router.get('/tree', authenticate, objectiveController.getTree);
router.post('/', authenticate, requireRole('manager', 'gm', 'hr'), objectiveController.create);
router.get('/:id', authenticate, objectiveController.getById);
router.put('/:id', authenticate, requireRole('manager', 'gm', 'hr'), objectiveController.update);
router.delete('/:id', authenticate, requireRole('manager', 'gm', 'hr'), objectiveController.delete);
router.put('/:id/progress', authenticate, objectiveController.updateProgress);
router.post('/:id/key-results', authenticate, requireRole('manager', 'gm', 'hr'), objectiveController.addKeyResult);

// 新增：员工确认目标
router.post('/:id/confirm', authenticate, objectiveController.confirmObjective);

// 新增：验证权重
router.post('/validate-weights', authenticate, objectiveController.validateWeights);

export default router;
