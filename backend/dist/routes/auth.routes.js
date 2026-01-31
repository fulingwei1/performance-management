"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 登录
router.post('/login', auth_controller_1.authController.login);
// 获取当前用户信息（需要认证）
router.get('/me', auth_1.authenticate, auth_controller_1.authController.getCurrentUser);
// 修改密码（需要认证）
router.post('/change-password', auth_1.authenticate, auth_controller_1.authController.changePassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map