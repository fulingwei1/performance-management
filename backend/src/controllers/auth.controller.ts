import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { EmployeeModel } from '../models/employee.model';
import { generateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const authController = {
  // 登录
  login: [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空'),
    body('role').isIn(['employee', 'manager', 'gm', 'hr', 'admin']).withMessage('角色类型错误'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      const { username, password, role } = req.body;

      // 查找员工（先尝试ID，再尝试姓名）
      let employee = await EmployeeModel.findById(username);
      if (!employee) {
        employee = await EmployeeModel.findByName(username);
      }

      if (!employee) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 验证角色
      if (employee.role !== role) {
        return res.status(401).json({
          success: false,
          message: `角色不匹配，用户角色是${employee.role}，但您选择了${role}`
        });
      }

      // 验证密码 - 统一使用 bcrypt 比较
      let isValidPassword = false;
      if (employee.password) {
        isValidPassword = await EmployeeModel.verifyPassword(password, employee.password);
      }

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 检查用户状态
      if ((employee as any).status === 'disabled') {
        return res.status(403).json({
          success: false,
          message: '该账号已被禁用，请联系管理员'
        });
      }

      // 生成JWT Token
      const token = generateToken({
        userId: employee.id,
        role: employee.role
      });

      // 返回用户信息（显式排除 password，避免泄露）
      const { id, name, department, subDepartment, role: userRole, level, managerId, avatar, createdAt, updatedAt } = employee;
      const userInfo = { id, userId: id, name, department, subDepartment, role: userRole, level, managerId, avatar, createdAt, updatedAt };

      res.json({
        success: true,
        data: {
          user: userInfo,
          token
        },
        message: '登录成功'
      });
    })
  ],

  // 获取当前用户信息
  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    const employee = await EmployeeModel.findById(req.user.userId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const { password: _, ...userInfo } = employee;
    res.json({
      success: true,
      data: userInfo
    });
  }),

  // 修改密码
  changePassword: [
    body('oldPassword').notEmpty().withMessage('原密码不能为空'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位'),

    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '未认证'
        });
      }

      const { oldPassword, newPassword } = req.body;

      // 获取员工信息（包含密码）
      const employee = await EmployeeModel.findById(req.user.userId);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证原密码
      const isValidPassword = await EmployeeModel.verifyPassword(oldPassword, employee.password!);

      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: '原密码错误'
        });
      }

      // 更新密码
      await EmployeeModel.updatePassword(req.user.userId, newPassword);

      res.json({
        success: true,
        message: '密码修改成功'
      });
    })
  ]
};
