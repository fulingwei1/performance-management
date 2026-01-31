"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("../controllers/settings.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/assessment-scope', auth_1.authenticate, settings_controller_1.settingsController.getAssessmentScope);
router.put('/assessment-scope', auth_1.authenticate, (0, auth_1.requireRole)('hr'), settings_controller_1.settingsController.updateAssessmentScope);
exports.default = router;
//# sourceMappingURL=settings.routes.js.map