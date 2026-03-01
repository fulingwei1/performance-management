import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 获取组织架构树（需要认证）
router.get('/tree', authenticate, organizationController.getOrgTree);

// 部门管理
router.get('/departments', authenticate, organizationController.getAllDepartments);
router.get('/departments/tree', authenticate, organizationController.getDepartmentTree);
router.get('/departments/:id', authenticate, organizationController.getDepartmentById);
router.post('/departments', authenticate, requireRole('hr'), organizationController.createDepartment);
router.put('/departments/:id', authenticate, requireRole('hr'), organizationController.updateDepartment);
router.delete('/departments/:id', authenticate, requireRole('hr'), organizationController.deleteDepartment);

// 岗位管理
router.get('/positions', authenticate, organizationController.getAllPositions);
router.get('/departments/:departmentId/positions', authenticate, organizationController.getPositionsByDepartment);
router.post('/positions', authenticate, requireRole('hr'), organizationController.createPosition);
router.put('/positions/:id', authenticate, requireRole('hr'), organizationController.updatePosition);
router.delete('/positions/:id', authenticate, requireRole('hr'), organizationController.deletePosition);

// 人员调动
router.post('/transfer', authenticate, requireRole('hr'), organizationController.transferEmployee);
router.get('/transfers', authenticate, organizationController.getTransferHistory);

export default router;
