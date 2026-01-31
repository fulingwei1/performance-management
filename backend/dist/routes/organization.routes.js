"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organization_controller_1 = require("../controllers/organization.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 获取组织架构树（需要认证）
router.get('/tree', auth_1.authenticate, organization_controller_1.organizationController.getOrgTree);
// 部门管理
router.get('/departments', auth_1.authenticate, organization_controller_1.organizationController.getAllDepartments);
router.get('/departments/tree', auth_1.authenticate, organization_controller_1.organizationController.getDepartmentTree);
router.get('/departments/:id', auth_1.authenticate, organization_controller_1.organizationController.getDepartmentById);
router.post('/departments', auth_1.authenticate, (0, auth_1.requireRole)('hr'), organization_controller_1.organizationController.createDepartment);
router.put('/departments/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), organization_controller_1.organizationController.updateDepartment);
router.delete('/departments/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), organization_controller_1.organizationController.deleteDepartment);
// 岗位管理
router.get('/positions', auth_1.authenticate, organization_controller_1.organizationController.getAllPositions);
router.get('/departments/:departmentId/positions', auth_1.authenticate, organization_controller_1.organizationController.getPositionsByDepartment);
router.post('/positions', auth_1.authenticate, (0, auth_1.requireRole)('hr'), organization_controller_1.organizationController.createPosition);
router.put('/positions/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), organization_controller_1.organizationController.updatePosition);
router.delete('/positions/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), organization_controller_1.organizationController.deletePosition);
exports.default = router;
//# sourceMappingURL=organization.routes.js.map