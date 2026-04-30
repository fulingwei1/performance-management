import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/levelTemplateRule.controller';

const router = Router();

router.use(authenticate);

// 设置/更新规则（经理、HR、admin）
router.post('/', requireRole('manager', 'hr', 'admin'), ctrl.setRule);
router.post('/batch', requireRole('manager', 'hr', 'admin'), ctrl.batchSetRules);

// 静态路径在前
router.get('/', requireRole('manager', 'hr', 'admin'), ctrl.getAllRules);
router.get('/stats/coverage', requireRole('hr', 'admin'), ctrl.getCoverageStats);
router.get('/resolve/:employeeId', ctrl.resolveTemplate);

// 带参数路由
router.get('/:departmentType', ctrl.getByDepartmentType);

// 删除规则
router.delete('/:departmentType/:level', requireRole('hr', 'admin'), ctrl.deleteRule);

export default router;
