"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const export_controller_1 = require("../controllers/export.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/monthly-performance', auth_1.authenticate, (0, auth_1.requireRole)('hr'), export_controller_1.exportController.exportMonthlyPerformance);
router.get('/annual-performance', auth_1.authenticate, (0, auth_1.requireRole)('hr'), export_controller_1.exportController.exportAnnualPerformance);
router.get('/employees', auth_1.authenticate, (0, auth_1.requireRole)('hr'), export_controller_1.exportController.exportEmployees);
exports.default = router;
//# sourceMappingURL=export.routes.js.map