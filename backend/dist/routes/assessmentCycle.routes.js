"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assessmentCycle_controller_1 = require("../controllers/assessmentCycle.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 考核周期管理
router.get('/', auth_1.authenticate, assessmentCycle_controller_1.assessmentCycleController.getAllCycles);
router.get('/active', auth_1.authenticate, assessmentCycle_controller_1.assessmentCycleController.getActiveCycle);
router.get('/calendar', auth_1.authenticate, assessmentCycle_controller_1.assessmentCycleController.getCalendar);
router.get('/:id', auth_1.authenticate, assessmentCycle_controller_1.assessmentCycleController.getCycleById);
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)('hr'), assessmentCycle_controller_1.assessmentCycleController.createCycle);
router.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), assessmentCycle_controller_1.assessmentCycleController.updateCycle);
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), assessmentCycle_controller_1.assessmentCycleController.deleteCycle);
router.post('/:id/activate', auth_1.authenticate, (0, auth_1.requireRole)('hr'), assessmentCycle_controller_1.assessmentCycleController.activateCycle);
router.post('/generate-monthly', auth_1.authenticate, (0, auth_1.requireRole)('hr'), assessmentCycle_controller_1.assessmentCycleController.generateMonthlyCycles);
// 节假日管理
router.get('/holidays', auth_1.authenticate, assessmentCycle_controller_1.assessmentCycleController.getHolidays);
router.post('/holidays', auth_1.authenticate, (0, auth_1.requireRole)('hr'), assessmentCycle_controller_1.assessmentCycleController.createHoliday);
router.delete('/holidays/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), assessmentCycle_controller_1.assessmentCycleController.deleteHoliday);
router.post('/holidays/import', auth_1.authenticate, (0, auth_1.requireRole)('hr'), assessmentCycle_controller_1.assessmentCycleController.importHolidays);
exports.default = router;
//# sourceMappingURL=assessmentCycle.routes.js.map