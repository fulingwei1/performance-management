import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/templateBinding.controller';

const router = Router();

// 所有路由需认证
router.use(authenticate);

// 绑定操作
router.post('/', requireRole('hr', 'admin'), ctrl.bindTemplate);          // 单个绑定
router.post('/batch', requireRole('hr', 'admin'), ctrl.batchBind);        // 批量绑定

// 静态路径必须放在 :employeeId 之前
router.get('/my-team', ctrl.getMyTeamBindings);               // 经理查下属绑定
router.get('/all', requireRole('hr', 'admin'), ctrl.getAllBindings);      // HR 查所有绑定
router.get('/stats', requireRole('hr', 'admin'), ctrl.getBindingStats);   // 绑定统计

// 带参数路由
router.get('/resolve/:employeeId', ctrl.resolveTemplate);     // 解析最终模板
router.get('/employee/:employeeId', requireRole('hr', 'admin'), ctrl.getEmployeeBinding); // 查员工绑定
router.delete('/:employeeId', requireRole('hr', 'admin'), ctrl.unbindTemplate);           // 解除绑定

export default router;
