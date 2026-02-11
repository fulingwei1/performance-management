"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employee_controller_1 = require("../controllers/employee.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 获取所有员工（需要认证）
router.get('/', auth_1.authenticate, employee_controller_1.employeeController.getAllEmployees);
// 获取所有经理（需要认证）
router.get('/managers', auth_1.authenticate, employee_controller_1.employeeController.getAllManagers);
// 获取当前经理的下属（需要经理权限）
router.get('/subordinates', auth_1.authenticate, (0, auth_1.requireRole)('manager'), employee_controller_1.employeeController.getSubordinates);
// 根据角色获取员工（需要认证）
router.get('/role/:role', auth_1.authenticate, employee_controller_1.employeeController.getEmployeesByRole);
// 根据ID获取员工（需要认证）
router.get('/:id', auth_1.authenticate, employee_controller_1.employeeController.getEmployeeById);
// 创建员工（需要HR或Admin权限）
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)('hr', 'admin'), employee_controller_1.employeeController.createEmployee);
// 更新员工（需要HR或Admin权限）
router.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr', 'admin'), employee_controller_1.employeeController.updateEmployee);
// 重置密码（需要HR或Admin权限）
router.put('/:id/reset-password', auth_1.authenticate, (0, auth_1.requireRole)('hr', 'admin'), employee_controller_1.employeeController.resetPassword);
// 启用/禁用用户（需要Admin权限）
router.put('/:id/toggle-status', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), employee_controller_1.employeeController.toggleStatus);
// 删除员工（需要HR或Admin权限）
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr', 'admin'), employee_controller_1.employeeController.deleteEmployee);
exports.default = router;
//# sourceMappingURL=employee.routes.js.map