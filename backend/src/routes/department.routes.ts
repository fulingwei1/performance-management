import { Router } from 'express';
import { departmentController } from '../controllers/department.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/tree', authenticate, departmentController.getTree);
router.post('/', authenticate, requireRole('hr'), departmentController.create);
router.put('/:id', authenticate, requireRole('hr'), departmentController.update);
router.delete('/:id', authenticate, requireRole('hr'), departmentController.delete);
router.get('/:id/members', authenticate, departmentController.getMembers);
router.put('/:id/manager', authenticate, requireRole('hr'), departmentController.setManager);

export default router;
