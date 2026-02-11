import { Router } from 'express';
import { departmentController } from '../controllers/department.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/tree', authenticate, departmentController.getTree);
router.post('/', authenticate, requireRole('hr', 'admin'), departmentController.create);
router.put('/:id', authenticate, requireRole('hr', 'admin'), departmentController.update);
router.delete('/:id', authenticate, requireRole('hr', 'admin'), departmentController.delete);
router.get('/:id/members', authenticate, departmentController.getMembers);
router.put('/:id/manager', authenticate, requireRole('hr', 'admin'), departmentController.setManager);

export default router;
