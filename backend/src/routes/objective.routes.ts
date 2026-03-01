import { Router } from 'express';
import { objectiveController, submitObjectiveForApproval } from '../controllers/objective.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { 
  createObjectiveValidation, 
  updateObjectiveValidation 
} from '../validators/objective.validator';

const router = Router();

router.get('/', authenticate, objectiveController.getAll);
router.get('/tree', authenticate, objectiveController.getTree);
// 允许员工创建自己的目标(用于目标规划功能)
router.post('/', authenticate, requireRole('employee', 'manager', 'gm', 'hr', 'admin'), validate(createObjectiveValidation), objectiveController.create);
router.get('/:id', authenticate, objectiveController.getById);
router.put('/:id', authenticate, requireRole('employee', 'manager', 'gm', 'hr', 'admin'), validate(updateObjectiveValidation), objectiveController.update);
router.delete('/:id', authenticate, requireRole('manager', 'gm', 'hr', 'admin'), objectiveController.delete);
router.put('/:id/progress', authenticate, objectiveController.updateProgress);
router.post('/:id/key-results', authenticate, requireRole('manager', 'gm', 'hr', 'admin'), objectiveController.addKeyResult);

// 新增：提交目标审批
router.post('/:id/submit', authenticate, submitObjectiveForApproval);

// 新增：员工确认目标
router.post('/:id/confirm', authenticate, objectiveController.confirmObjective);

// 新增：验证权重
router.post('/validate-weights', authenticate, objectiveController.validateWeights);

export default router;
