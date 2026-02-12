import { body } from 'express-validator';

/**
 * 目标创建验证规则
 */
export const createObjectiveValidation = [
  body('title')
    .notEmpty().withMessage('目标标题不能为空')
    .isLength({ max: 200 }).withMessage('标题不能超过200个字符'),
  
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('描述不能超过2000个字符'),
  
  body('ownerId')
    .notEmpty().withMessage('负责人不能为空'),
  
  body('year')
    .notEmpty().withMessage('年份不能为空')
    .isInt({ min: 2020, max: 2100 }).withMessage('年份必须在2020-2100之间'),
  
  body('type')
    .optional()
    .isIn(['company', 'department', 'individual']).withMessage('类型值无效'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('权重必须在0-100之间'),
  
  body('targetValue')
    .optional()
    .isNumeric().withMessage('目标值必须是数字'),
];

/**
 * 目标更新验证规则
 */
export const updateObjectiveValidation = [
  body('title')
    .optional()
    .isLength({ max: 200 }).withMessage('标题不能超过200个字符'),
  
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('描述不能超过2000个字符'),
  
  body('ownerId')
    .optional()
    .notEmpty().withMessage('负责人不能为空'),
  
  body('year')
    .optional()
    .isInt({ min: 2020, max: 2100 }).withMessage('年份必须在2020-2100之间'),
  
  body('type')
    .optional()
    .isIn(['company', 'department', 'individual']).withMessage('类型值无效'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('权重必须在0-100之间'),
  
  body('targetValue')
    .optional()
    .isNumeric().withMessage('目标值必须是数字'),
  
  body('actualValue')
    .optional()
    .isNumeric().withMessage('实际值必须是数字'),
  
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('进度必须在0-100之间'),
];
