import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 登录
router.post('/login', authController.login);

// 获取当前用户信息（需要认证）
router.get('/me', authenticate, authController.getCurrentUser);

// 修改密码已停用（统一使用身份证后六位登录），保留接口用于给旧前端明确提示
router.post('/change-password', authenticate, authController.changePassword);

// 查询登录日志（管理员/HR）
router.get('/login-logs', authenticate, authController.getLoginLogs);

export default router;
