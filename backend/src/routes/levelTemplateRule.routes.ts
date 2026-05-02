import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/levelTemplateRule.controller';

const router = Router();

router.use(authenticate);

// 设置/更新全局模板规则：只能由 HR/管理员维护，避免经理误改全公司模板匹配规则
router.post('/', requireRole('hr', 'admin'), ctrl.setRule);
router.post('/batch', requireRole('hr', 'admin'), ctrl.batchSetRules);

// 静态路径在前
router.get('/', requireRole('hr', 'admin'), ctrl.getAllRules);
router.get('/stats/coverage', requireRole('hr', 'admin'), ctrl.getCoverageStats);
router.get('/resolve/:employeeId', ctrl.resolveTemplate);

// 带参数路由
router.get('/:departmentType', requireRole('hr', 'admin'), ctrl.getByDepartmentType);

// 删除规则
router.delete('/:departmentType/:level', requireRole('hr', 'admin'), ctrl.deleteRule);

export default router;
