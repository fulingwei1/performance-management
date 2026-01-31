"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const metricLibrary_controller_1 = require("../controllers/metricLibrary.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 指标管理
router.get('/', auth_1.authenticate, metricLibrary_controller_1.metricLibraryController.getAllMetrics);
router.get('/export', auth_1.authenticate, (0, auth_1.requireRole)('hr'), metricLibrary_controller_1.metricLibraryController.exportMetrics);
router.get('/:id', auth_1.authenticate, metricLibrary_controller_1.metricLibraryController.getMetricById);
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)('hr'), metricLibrary_controller_1.metricLibraryController.createMetric);
router.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), metricLibrary_controller_1.metricLibraryController.updateMetric);
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), metricLibrary_controller_1.metricLibraryController.deleteMetric);
router.post('/import', auth_1.authenticate, (0, auth_1.requireRole)('hr'), metricLibrary_controller_1.metricLibraryController.importMetrics);
router.post('/initialize', auth_1.authenticate, (0, auth_1.requireRole)('hr'), metricLibrary_controller_1.metricLibraryController.initializeDefaultMetrics);
// 指标模板管理
router.get('/templates', auth_1.authenticate, metricLibrary_controller_1.metricLibraryController.getAllTemplates);
router.get('/templates/position/:positionId', auth_1.authenticate, metricLibrary_controller_1.metricLibraryController.getTemplateByPosition);
router.post('/templates', auth_1.authenticate, (0, auth_1.requireRole)('hr'), metricLibrary_controller_1.metricLibraryController.createTemplate);
exports.default = router;
//# sourceMappingURL=metricLibrary.routes.js.map