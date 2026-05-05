import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { EmployeeModel } from '../models/employee.model';
import { LoginLogModel } from '../models/loginLog.model';
import { generateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { resolveSelfAssessmentEligibility } from '../services/selfAssessmentEligibility.service';

const roleLabelMap: Record<string, string> = {
  employee: '员工',
  manager: '部门经理',
  gm: '总经理',
  hr: '人力资源',
  admin: '系统管理员',
};

function buildRoleLabels(roles: string[]) {
  const labels: string[] = [];
  const hasAdmin = roles.includes('admin');
  const hasHr = roles.includes('hr');
  if (hasAdmin || hasHr) {
    labels.push(hasAdmin && hasHr ? 'HR/管理员' : roleLabelMap[hasAdmin ? 'admin' : 'hr']);
  }
  for (const role of roles) {
    if (role === 'admin' || role === 'hr') continue;
    labels.push(roleLabelMap[role] || role);
  }
  return labels;
}

async function buildEffectiveRoleInfo(employee: any) {
  const roles = new Set<string>();
  roles.add(employee.role);

  const subordinates = await EmployeeModel.findTeamForManager(employee.id);
  const hasActiveSubordinates = subordinates.length > 0;
  const managerCapableRole = ['manager', 'gm', 'hr', 'admin'].includes(employee.role);
  const canManageTeam = managerCapableRole && (hasActiveSubordinates || employee.role === 'manager');
  if (canManageTeam) roles.add('manager');
  const selfAssessmentEligibility = await resolveSelfAssessmentEligibility(employee);

  return {
    roles: Array.from(roles),
    roleLabels: buildRoleLabels(Array.from(roles)),
    capabilities: {
      canManageTeam,
      canManageSystem: roles.has('admin'),
      canSubmitSelfSummary: selfAssessmentEligibility.canSubmitSelfSummary,
    },
  };
}

export const authController = {
  // 登录
  login: [
    body('username')
      .customSanitizer((value) => String(value || '').trim().replace(/\s+/g, ''))
      .notEmpty()
      .withMessage('用户名不能为空'),
    // 兼容两种字段：idCardLast6（推荐）或 password（旧版）
    body('idCardLast6')
      .optional()
      .isString()
      .customSanitizer((value) => String(value || '').trim().replace(/\s+/g, ''))
      .matches(/^[0-9Xx]{6}$/)
      .withMessage('身份证后六位格式错误'),
    body('password')
      .optional()
      .isString()
      .customSanitizer((value) => String(value || '').trim()),
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

      const { username: rawUsername } = req.body as { username: string };
      const username = rawUsername.trim().replace(/\s+/g, '');
      const idCardLast6 = (req.body.idCardLast6 ?? '').toString();
      const password = (req.body.password ?? '').toString();

      // 获取请求信息用于日志
      const loginIp = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // 查找员工（先尝试工号/ID，再尝试姓名；若同名则要求使用工号登录）
      let employee = await EmployeeModel.findById(username);
      if (!employee) {
        const matches = await EmployeeModel.findAllByName(username);
        if (matches.length > 1) {
          // 记录登录失败日志（用户名不明确）
          await LoginLogModel.create({
            employeeId: username,
            employeeName: username,
            role: 'employee',
            department: '',
            subDepartment: '',
            loginMethod: idCardLast6 ? 'idCard' : 'password',
            loginIp,
            userAgent,
            success: false,
            failureReason: '存在同名用户',
          });
          return res.status(409).json({
            success: false,
            message: '存在同名用户，请使用工号登录'
          });
        }
        employee = matches.length === 1 ? matches[0] : null;
      }

      if (!employee) {
        // 记录登录失败日志（用户不存在）
        await LoginLogModel.create({
          employeeId: username,
          employeeName: username,
          role: 'employee',
          department: '',
          subDepartment: '',
          loginMethod: idCardLast6 ? 'idCard' : 'password',
          loginIp,
          userAgent,
          success: false,
          failureReason: '用户不存在',
        });
        return res.status(401).json({
          success: false,
          message: '用户名或登录口令错误'
        });
      }

      const idCardLoginSecret = idCardLast6.trim();
      const passwordLoginSecret = password.trim();
      const loginSecret = idCardLoginSecret || passwordLoginSecret;

      // 验证登录口令：身份证后六位和用户自设密码都可登录。
      // 如果员工修改了密码，不能因为存在 idCardLast6Hash 就跳过 password 校验。
      let isValidPassword = false;
      if (idCardLoginSecret && employee.idCardLast6Hash) {
        isValidPassword = await EmployeeModel.verifyPassword(idCardLoginSecret.toUpperCase(), employee.idCardLast6Hash);
      }
      if (!isValidPassword && employee.password) {
        isValidPassword = await EmployeeModel.verifyPassword(loginSecret, employee.password);
      }

      if (!isValidPassword) {
        // 记录登录失败日志（密码错误）
        await LoginLogModel.create({
          employeeId: employee.id,
          employeeName: employee.name,
          role: employee.role,
          department: employee.department,
          subDepartment: employee.subDepartment,
          loginMethod: idCardLast6 ? 'idCard' : 'password',
          loginIp,
          userAgent,
          success: false,
          failureReason: '密码错误',
        });
        return res.status(401).json({
          success: false,
          message: '用户名或登录口令错误'
        });
      }

      // 检查用户状态
      if ((employee as any).status === 'disabled') {
        // 记录登录失败日志（账号被禁用）
        await LoginLogModel.create({
          employeeId: employee.id,
          employeeName: employee.name,
          role: employee.role,
          department: employee.department,
          subDepartment: employee.subDepartment,
          loginMethod: idCardLast6 ? 'idCard' : 'password',
          loginIp,
          userAgent,
          success: false,
          failureReason: '账号被禁用',
        });
        return res.status(403).json({
          success: false,
          message: '该账号已被禁用，请联系管理员'
        });
      }

      // 记录登录成功日志
      await LoginLogModel.create({
        employeeId: employee.id,
        employeeName: employee.name,
        role: employee.role,
        department: employee.department,
        subDepartment: employee.subDepartment,
        loginMethod: idCardLast6 ? 'idCard' : 'password',
        loginIp,
        userAgent,
        success: true,
      });

      // 生成JWT Token
      const token = generateToken({
        userId: employee.id,
        role: employee.role
      });

      // 返回用户信息（显式排除 password，避免泄露）
      const {
        id,
        name,
        department,
        subDepartment,
        role: userRole,
        level,
        managerId,
        avatar,
        mustChangePassword,
        createdAt,
        updatedAt
      } = employee;
      const roleInfo = await buildEffectiveRoleInfo(employee);
      const userInfo = {
        id,
        userId: id,
        name,
        department,
        subDepartment,
        role: userRole,
        level,
        managerId,
        avatar,
        mustChangePassword,
        createdAt,
        updatedAt,
        ...roleInfo
      };

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

    const { password: _, idCardLast6Hash: __, ...baseUserInfo } = employee as any;
    const roleInfo = await buildEffectiveRoleInfo(employee);
    const userInfo = { ...baseUserInfo, userId: employee.id, ...roleInfo };
    res.json({
      success: true,
      data: userInfo
    });
  }),

  // 修改密码
  changePassword: [
    body('oldPassword').notEmpty().withMessage('原密码不能为空'),
    body('newPassword').isLength({ min: 8 }).withMessage('新密码至少8位'),

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
      if (!employee.password) {
        return res.status(400).json({
          success: false,
          message: '当前账号未设置密码，请联系HR重置临时密码'
        });
      }

      const isValidPassword = await EmployeeModel.verifyPassword(oldPassword, employee.password);

      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: '原密码错误'
        });
      }

      // 更新密码
      await EmployeeModel.updatePassword(req.user.userId, newPassword, { mustChangePassword: false });

      res.json({
        success: true,
        message: '密码修改成功'
      });
    })
  ],

  // 查询登录日志（管理员/HR）
  getLoginLogs: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    // 仅管理员和 HR 可以查看登录日志
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const { employeeId, keyword, startDate, endDate, success, page = 1, limit = 50 } = req.query as any;

    const result = await LoginLogModel.find({
      employeeId,
      keyword,
      startDate,
      endDate,
      success: success !== undefined ? success === 'true' : undefined,
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: result,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit, 10)),
      }
    });
  })
};
