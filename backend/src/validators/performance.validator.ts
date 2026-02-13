import { body } from 'express-validator';

/**
 * 工作总结提交验证规则
 * 支持两种格式：
 * 1. {month, summary, achievements, issues}
 * 2. {month, selfSummary, nextMonthPlan}
 */
export const submitSummaryValidation = [
  body('month')
    .notEmpty().withMessage('考核月份不能为空')
    .matches(/^\d{4}-\d{2}$/).withMessage('月份格式必须为YYYY-MM'),
  
  // 格式1字段（可选）
  body('summary')
    .optional()
    .isString().withMessage('工作总结必须为字符串')
    .isLength({ max: 5000 }).withMessage('工作总结不能超过5000个字符'),
  
  body('achievements')
    .optional()
    .isString().withMessage('主要成就必须为字符串')
    .isLength({ max: 5000 }).withMessage('主要成就不能超过5000个字符'),
  
  body('issues')
    .optional()
    .isString().withMessage('遇到的问题必须为字符串')
    .isLength({ max: 5000 }).withMessage('遇到的问题不能超过5000个字符'),
  
  // 格式2字段（可选）
  body('selfSummary')
    .optional()
    .isString().withMessage('工作总结必须为字符串')
    .isLength({ max: 5000 }).withMessage('工作总结不能超过5000个字符'),
  
  body('nextMonthPlan')
    .optional()
    .isString().withMessage('下月计划必须为字符串')
    .isLength({ max: 5000 }).withMessage('下月计划不能超过5000个字符'),
];

/**
 * 经理评分验证规则
 */
export const submitScoreValidation = [
  body('id')
    .notEmpty().withMessage('记录ID不能为空'),
  
  body('taskCompletion')
    .notEmpty().withMessage('任务完成度不能为空')
    .isFloat({ min: 0, max: 5 }).withMessage('任务完成度必须在0-5之间'),
  
  body('initiative')
    .notEmpty().withMessage('主动性不能为空')
    .isFloat({ min: 0, max: 5 }).withMessage('主动性必须在0-5之间'),
  
  body('projectFeedback')
    .notEmpty().withMessage('项目反馈不能为空')
    .isFloat({ min: 0, max: 5 }).withMessage('项目反馈必须在0-5之间'),
  
  body('qualityImprovement')
    .notEmpty().withMessage('质量改进不能为空')
    .isFloat({ min: 0, max: 5 }).withMessage('质量改进必须在0-5之间'),
  
  body('managerComment')
    .notEmpty().withMessage('经理评价不能为空')
    .isLength({ max: 2000 }).withMessage('经理评价不能超过2000个字符'),
  
  body('nextMonthWorkArrangement')
    .optional()
    .isLength({ max: 2000 }).withMessage('下月工作安排不能超过2000个字符'),
];

/**
 * 创建绩效记录验证规则（经理给未提交的员工创建）
 */
export const createRecordValidation = [
  body('employeeId')
    .notEmpty().withMessage('员工ID不能为空'),
  
  body('month')
    .notEmpty().withMessage('考核月份不能为空')
    .matches(/^\d{4}-\d{2}$/).withMessage('月份格式必须为YYYY-MM'),
];

/**
 * 生成任务验证规则
 */
export const generateTasksValidation = [
  body('month')
    .notEmpty().withMessage('月份不能为空')
    .matches(/^\d{4}-\d{2}$/).withMessage('月份格式必须为YYYY-MM'),
];
