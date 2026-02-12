import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { changePasswordValidation } from '../validators/employee.validator';

const router = Router();

// 登录
router.post('/login', authController.login);

// 获取当前用户信息（需要认证）
router.get('/me', authenticate, authController.getCurrentUser);

// 修改密码（需要认证）
router.post('/change-password', authenticate, validate(changePasswordValidation), authController.changePassword);

export default router;
