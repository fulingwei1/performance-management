import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { EmployeeModel } from '../models/employee.model';
import { generateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const authController = {
  // 登录
  login: [
    body('username').notEmpty().withMessage('用户名不能为空'),
    // 兼容两种字段：idCardLast6（推荐）或 password（旧版）
    body('idCardLast6')
      .optional()
      .isString()
      .matches(/^[0-9Xx]{6}$/)
      .withMessage('身份证后六位格式错误'),
    body('password').optional().isString(),
    body().custom((_, { req }) => {
      if (!req.body.idCardLast6 && !req.body.password) {
        throw new Error('身份证后六位不能为空');
      }
      return true;
    }),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      const { username } = req.body as { username: string };
      const idCardLast6 = (req.body.idCardLast6 ?? '').toString();
      const password = (req.body.password ?? '').toString();

      // 查找员工（先尝试工号/ID，再尝试姓名；若同名则要求使用工号登录）
      let employee = await EmployeeModel.findById(username);
      if (!employee) {
        const matches = await EmployeeModel.findAllByName(username);
        if (matches.length > 1) {
          return res.status(409).json({
            success: false,
            message: '存在同名用户，请使用工号登录'
          });
        }
        employee = matches.length === 1 ? matches[0] : null;
      }

      if (!employee) {
        return res.status(401).json({
          success: false,
          message: '用户名或登录口令错误'
        });
      }

      const loginSecret = (idCardLast6 || password || '').trim();

      // 验证登录口令 - 优先身份证后六位（若已配置），管理员可回退到密码
      let isValidPassword = false;
      if (employee.idCardLast6Hash) {
        isValidPassword = await EmployeeModel.verifyPassword(loginSecret.toUpperCase(), employee.idCardLast6Hash);
      } else if (employee.password) {
        isValidPassword = await EmployeeModel.verifyPassword(loginSecret, employee.password);
      }
      if (!isValidPassword && employee.role === 'admin' && employee.password) {
        isValidPassword = await EmployeeModel.verifyPassword(loginSecret, employee.password);
      }

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '用户名或登录口令错误'
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

    const { password: _, idCardLast6Hash: __, ...userInfo } = employee as any;
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
