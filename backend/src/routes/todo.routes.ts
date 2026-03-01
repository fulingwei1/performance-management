import { Router } from 'express';
import { todoController } from '../controllers/todo.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/my', authenticate, todoController.getMyTodos);
router.get('/statistics', authenticate, todoController.getStatistics);
router.get('/summary', authenticate, todoController.getSummary);
router.put('/:id/complete', authenticate, todoController.markCompleted);

export default router;
