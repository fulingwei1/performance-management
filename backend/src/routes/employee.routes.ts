import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { employeeController } from '../controllers/employee.controller';
import { authenticate, requireManagerCapability, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { 
  createEmployeeValidation, 
  updateEmployeeValidation 
} from '../validators/employee.validator';

const router = Router();

const createEmployeeLimiter = rateLimit({
  windowMs: Number(process.env.EMPLOYEE_CREATE_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.EMPLOYEE_CREATE_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' && req.get('X-Test-Rate-Limit') !== 'true',
  message: { success: false, message: '员工创建过于频繁，请稍后再试' },
});

// 获取员工管理列表（仅 HR/总经理/Admin；普通员工和组长请使用 /subordinates 或个人接口）
router.get('/', authenticate, requireRole('hr', 'gm', 'admin'), employeeController.getAllEmployees);

// 获取所有经理（需要认证）
router.get('/managers', authenticate, employeeController.getAllManagers);

// 获取当前用户/经理的绩效参与状态（需要认证）
router.get('/assessment-participation', authenticate, employeeController.getAssessmentParticipation);

// 获取当前经理/兼任经理的下属
router.get('/subordinates', authenticate, requireManagerCapability, employeeController.getSubordinates);

// 根据角色获取员工（需要认证）
router.get('/role/:role', authenticate, employeeController.getEmployeesByRole);

// 根据ID获取员工（需要认证）
router.get('/:id', authenticate, employeeController.getEmployeeById);

// 创建员工（需要HR或Admin权限）
router.post('/', authenticate, requireRole('hr', 'admin'), createEmployeeLimiter, validate(createEmployeeValidation), employeeController.createEmployee);

// 更新员工（需要HR或Admin权限）
router.put('/:id', authenticate, requireRole('hr', 'admin'), validate(updateEmployeeValidation), employeeController.updateEmployee);

// 重置密码（需要HR或Admin权限）
router.put('/:id/reset-password', authenticate, requireRole('hr', 'admin'), employeeController.resetPassword);

// 启用/禁用用户（需要Admin权限）
router.put('/:id/toggle-status', authenticate, requireRole('admin', 'hr'), employeeController.toggleStatus);

// 删除员工（需要HR或Admin权限）
router.delete('/:id', authenticate, requireRole('hr', 'admin'), employeeController.deleteEmployee);

export default router;
