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
  
  body('password')
    .notEmpty().withMessage('密码不能为空')
    .isLength({ min: 6 }).withMessage('密码至少6个字符'),
  
  body('managerId')
    .optional()
    .isLength({ max: 50 }).withMessage('经理ID不能超过50个字符'),
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
    .optional()
    .isLength({ max: 50 }).withMessage('经理ID不能超过50个字符'),
];

/**
 * 密码修改验证规则
 */
export const changePasswordValidation = [
  body('oldPassword')
    .notEmpty().withMessage('原密码不能为空'),
  
  body('newPassword')
    .notEmpty().withMessage('新密码不能为空')
    .isLength({ min: 6 }).withMessage('新密码至少6个字符')
    .custom((value, { req }) => {
      if (value === req.body.oldPassword) {
        throw new Error('新密码不能与原密码相同');
      }
      return true;
    }),
];
