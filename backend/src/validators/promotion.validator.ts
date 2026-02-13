import { body } from 'express-validator';

/**
 * 晋升申请提交验证规则
 * 注意：不在这里验证，而是在控制器中进行详细验证
 */
export const submitPromotionValidation = [
  // 空数组，实际验证在控制器中处理
];

/**
 * 晋升审批验证规则
 */
export const reviewPromotionValidation = [
  body('review')
    .notEmpty().withMessage('审批意见不能为空')
    .isLength({ max: 1000 }).withMessage('审批意见不能超过1000个字符'),
  
  body('approved')
    .notEmpty().withMessage('审批结果不能为空')
    .isBoolean().withMessage('审批结果必须是布尔值'),
];
