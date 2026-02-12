import { body } from 'express-validator';

/**
 * 晋升申请提交验证规则
 */
export const submitPromotionValidation = [
  body('targetLevel')
    .notEmpty().withMessage('目标级别不能为空')
    .isLength({ max: 50 }).withMessage('目标级别不能超过50个字符'),
  
  body('performanceSummary')
    .notEmpty().withMessage('绩效总结不能为空')
    .isLength({ max: 3000 }).withMessage('绩效总结不能超过3000个字符'),
  
  body('skillSummary')
    .notEmpty().withMessage('技能总结不能为空')
    .isLength({ max: 3000 }).withMessage('技能总结不能超过3000个字符'),
  
  body('competencySummary')
    .notEmpty().withMessage('胜任力总结不能为空')
    .isLength({ max: 3000 }).withMessage('胜任力总结不能超过3000个字符'),
  
  body('workSummary')
    .notEmpty().withMessage('工作成果总结不能为空')
    .isLength({ max: 3000 }).withMessage('工作成果总结不能超过3000个字符'),
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
