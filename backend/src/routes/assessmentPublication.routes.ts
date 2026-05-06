import { Router } from 'express';
import { assessmentPublicationController } from '../controllers/assessmentPublication.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { body } from 'express-validator';

const router = Router();

// 发布验证规则
const publishValidation = [
  body('month')
    .notEmpty().withMessage('月份不能为空')
    .matches(/^\d{4}-\d{2}$/).withMessage('月份格式必须为YYYY-MM'),
  body('forceDistribution')
    .optional()
    .isBoolean().withMessage('2-7-1豁免标记必须为布尔值'),
  body('forceReason')
    .optional()
    .isString().withMessage('豁免原因必须为文本')
    .trim()
];

// 发布某月的考核结果（HR/Admin）
router.post('/',
  authenticate,
  requireRole('hr', 'admin'),
  validate(publishValidation),
  assessmentPublicationController.publish
);

router.post('/publish', 
  authenticate, 
  requireRole('hr', 'admin'), 
  validate(publishValidation),
  assessmentPublicationController.publish
);

// 取消发布（HR/Admin）
router.delete('/:month/unpublish', 
  authenticate, 
  requireRole('hr', 'admin'), 
  assessmentPublicationController.unpublish
);

// 检查某月是否已发布（所有认证用户）
router.get('/:month/status', 
  authenticate, 
  assessmentPublicationController.checkPublished
);

// 获取所有已发布的月份（所有认证用户）
router.get('/published', 
  authenticate, 
  assessmentPublicationController.getAllPublished
);

export default router;
