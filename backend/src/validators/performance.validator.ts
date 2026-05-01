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

  body('employeeIssueTags')
    .optional()
    .isArray({ max: 10 }).withMessage('员工问题反馈标签最多10个'),

  body('employeeIssueTags.*')
    .optional()
    .isString().withMessage('员工问题反馈标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个员工问题反馈标签不能超过50个字符'),

  body('resourceNeedTags')
    .optional()
    .isArray({ max: 10 }).withMessage('资源诉求标签最多10个'),

  body('resourceNeedTags.*')
    .optional()
    .isString().withMessage('资源诉求标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个资源诉求标签不能超过50个字符'),
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

  body('evaluationKeywords')
    .optional()
    .isArray({ max: 20 }).withMessage('评价标签最多20个'),

  body('evaluationKeywords.*')
    .optional()
    .isString().withMessage('评价标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个评价标签不能超过50个字符'),

  body('issueTypeTags')
    .optional()
    .isArray({ max: 10 }).withMessage('问题类型标签最多10个'),

  body('issueTypeTags.*')
    .optional()
    .isString().withMessage('问题类型标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个问题类型标签不能超过50个字符'),

  body('highlightTags')
    .optional()
    .isArray({ max: 10 }).withMessage('亮点贡献标签最多10个'),

  body('highlightTags.*')
    .optional()
    .isString().withMessage('亮点贡献标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个亮点贡献标签不能超过50个字符'),

  body('workTypeTags')
    .optional()
    .isArray({ max: 10 }).withMessage('工作类型标签最多10个'),

  body('workTypeTags.*')
    .optional()
    .isString().withMessage('工作类型标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个工作类型标签不能超过50个字符'),

  body('improvementActionTags')
    .optional()
    .isArray({ max: 10 }).withMessage('改进动作标签最多10个'),

  body('improvementActionTags.*')
    .optional()
    .isString().withMessage('改进动作标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个改进动作标签不能超过50个字符'),

  body('issueAttributionTags')
    .optional()
    .isArray({ max: 5 }).withMessage('问题归因标签最多5个'),

  body('issueAttributionTags.*')
    .optional()
    .isString().withMessage('问题归因标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个问题归因标签不能超过50个字符'),

  body('workloadTags')
    .optional()
    .isArray({ max: 2 }).withMessage('工作负荷标签最多2个'),

  body('workloadTags.*')
    .optional()
    .isString().withMessage('工作负荷标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个工作负荷标签不能超过50个字符'),

  body('managerSuggestionTags')
    .optional()
    .isArray({ max: 2 }).withMessage('经理建议标签最多2个'),

  body('managerSuggestionTags.*')
    .optional()
    .isString().withMessage('经理建议标签必须为字符串')
    .isLength({ max: 50 }).withMessage('单个经理建议标签不能超过50个字符'),

  body('scoreEvidence')
    .optional()
    .isString().withMessage('评分事例说明必须为字符串')
    .isLength({ max: 2000 }).withMessage('评分事例说明不能超过2000个字符'),

  body('monthlyStarRecommended')
    .optional()
    .isBoolean().withMessage('每月之星推荐状态必须为布尔值'),

  body('monthlyStarCategory')
    .optional()
    .isString().withMessage('每月之星推荐类型必须为字符串')
    .isLength({ max: 50 }).withMessage('每月之星推荐类型不能超过50个字符'),

  body('monthlyStarReason')
    .optional()
    .isString().withMessage('每月之星推荐理由必须为字符串')
    .isLength({ max: 2000 }).withMessage('每月之星推荐理由不能超过2000个字符'),

  body('monthlyStarPublic')
    .optional()
    .isBoolean().withMessage('每月之星展示状态必须为布尔值'),
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
