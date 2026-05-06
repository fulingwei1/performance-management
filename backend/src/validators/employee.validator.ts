import { body } from 'express-validator';

/**
 * 员工创建验证规则
 */
export const createEmployeeValidation = [
  body('id')
    .notEmpty().withMessage('员工ID不能为空')
    .isLength({ max: 50 }).withMessage('员工ID不能超过50个字符'),
  
  body('name')
    .notEmpty().withMessage('员工姓名不能为空')
    .isLength({ max: 100 }).withMessage('姓名不能超过100个字符'),
  
  body('department')
    .notEmpty().withMessage('部门不能为空')
    .isLength({ max: 100 }).withMessage('部门不能超过100个字符'),
  
  body('subDepartment')
    .optional()
    .isLength({ max: 100 }).withMessage('子部门不能超过100个字符'),
  
  body('role')
    .notEmpty().withMessage('角色不能为空')
    .isIn(['employee', 'manager', 'gm', 'hr', 'admin']).withMessage('角色值无效'),
  
  body('level')
    .optional()
    .isIn(['senior', 'intermediate', 'junior', 'assistant']).withMessage('级别值无效'),

  body('status')
    .optional()
    .isIn(['active', 'disabled']).withMessage('状态值无效'),
  
  // 统一登录口令：身份证后六位
  body('idCardLast6')
    .exists({ checkFalsy: true })
    .withMessage('请提供身份证后六位')
    .isString()
    .matches(/^[0-9Xx]{6}$/)
    .withMessage('身份证后六位格式错误'),
  
  body('managerId')
    .optional({ values: 'falsy' })
    .isLength({ max: 50 }).withMessage('经理ID不能超过50个字符'),

  body('wecomUserId')
    .optional()
    .isLength({ max: 128 }).withMessage('企业微信用户ID不能超过128个字符'),
];

/**
 * 员工更新验证规则
 */
export const updateEmployeeValidation = [
  body('name')
    .optional()
    .isLength({ max: 100 }).withMessage('姓名不能超过100个字符'),
  
  body('department')
    .optional()
    .isLength({ max: 100 }).withMessage('部门不能超过100个字符'),
  
  body('subDepartment')
    .optional()
    .isLength({ max: 100 }).withMessage('子部门不能超过100个字符'),
  
  body('role')
    .optional()
    .isIn(['employee', 'manager', 'gm', 'hr', 'admin']).withMessage('角色值无效'),
  
  body('level')
    .optional()
    .isIn(['senior', 'intermediate', 'junior', 'assistant']).withMessage('级别值无效'),
  
  body('managerId')
    .optional({ values: 'falsy' })
    .isLength({ max: 50 }).withMessage('经理ID不能超过50个字符'),

  body('wecomUserId')
    .optional()
    .isLength({ max: 128 }).withMessage('企业微信用户ID不能超过128个字符'),

  body('idCardLast6')
    .optional()
    .isString()
    .matches(/^[0-9Xx]{6}$/)
    .withMessage('身份证后六位格式错误'),
];
