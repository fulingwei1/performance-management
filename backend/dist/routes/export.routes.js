"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const export_controller_1 = require("../controllers/export.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const authenticateWithTokenParam = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        let token;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        else if (req.query.token && typeof req.query.token === 'string') {
            token = req.query.token;
        }
        if (!token) {
            res.status(401).json({ success: false, error: '未提供认证令牌' });
            return;
        }
        const decoded = (0, auth_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, error: '认证令牌无效或已过期' });
    }
};
router.get('/monthly-performance', authenticateWithTokenParam, (0, auth_1.requireRole)('hr', 'gm'), export_controller_1.exportController.exportMonthlyPerformance);
router.get('/annual-performance', authenticateWithTokenParam, (0, auth_1.requireRole)('hr', 'gm'), export_controller_1.exportController.exportAnnualPerformance);
router.get('/employees', authenticateWithTokenParam, (0, auth_1.requireRole)('hr', 'gm'), export_controller_1.exportController.exportEmployees);
exports.default = router;
//# sourceMappingURL=export.routes.js.map