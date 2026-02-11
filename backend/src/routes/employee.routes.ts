import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 获取所有员工（需要认证）
router.get('/', authenticate, employeeController.getAllEmployees);

// 获取所有经理（需要认证）
router.get('/managers', authenticate, employeeController.getAllManagers);

// 获取当前经理的下属（需要经理权限）
router.get('/subordinates', authenticate, requireRole('manager'), employeeController.getSubordinates);

// 根据角色获取员工（需要认证）
router.get('/role/:role', authenticate, employeeController.getEmployeesByRole);

// 根据ID获取员工（需要认证）
router.get('/:id', authenticate, employeeController.getEmployeeById);

// 创建员工（需要HR或Admin权限）
router.post('/', authenticate, requireRole('hr', 'admin'), employeeController.createEmployee);

// 更新员工（需要HR或Admin权限）
router.put('/:id', authenticate, requireRole('hr', 'admin'), employeeController.updateEmployee);

// 重置密码（需要HR或Admin权限）
router.put('/:id/reset-password', authenticate, requireRole('hr', 'admin'), employeeController.resetPassword);

// 启用/禁用用户（需要Admin权限）
router.put('/:id/toggle-status', authenticate, requireRole('admin', 'hr'), employeeController.toggleStatus);

// 删除员工（需要HR或Admin权限）
router.delete('/:id', authenticate, requireRole('hr', 'admin'), employeeController.deleteEmployee);

export default router;
