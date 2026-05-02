import { Router } from 'express';
import { assessmentCycleController } from '../controllers/assessmentCycle.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 考核周期管理
router.get('/', authenticate, assessmentCycleController.getAllCycles);
router.get('/active', authenticate, assessmentCycleController.getActiveCycle);
router.get('/calendar', authenticate, assessmentCycleController.getCalendar);
router.post('/', authenticate, requireRole('hr'), assessmentCycleController.createCycle);
router.post('/generate-monthly', authenticate, requireRole('hr'), assessmentCycleController.generateMonthlyCycles);

// 节假日管理（必须在 /:id 之前注册）
router.get('/holidays', authenticate, assessmentCycleController.getHolidays);
router.post('/holidays', authenticate, requireRole('hr'), assessmentCycleController.createHoliday);
router.delete('/holidays/:id', authenticate, requireRole('hr'), assessmentCycleController.deleteHoliday);
router.post('/holidays/import', authenticate, requireRole('hr'), assessmentCycleController.importHolidays);

// 参数化路由（放在最后）
router.get('/:id', authenticate, assessmentCycleController.getCycleById);
router.put('/:id', authenticate, requireRole('hr'), assessmentCycleController.updateCycle);
router.delete('/:id', authenticate, requireRole('hr'), assessmentCycleController.deleteCycle);
router.post('/:id/activate', authenticate, requireRole('hr'), assessmentCycleController.activateCycle);

export default router;
