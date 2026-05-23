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
  const canManageTeam = hasActiveSubordinates;
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
      .withMessage('用户名不能为空')
      .isLength({ max: 50 })
      .withMessage('用户名最多50个字符'),
    body('idCardLast6')
      .exists({ checkFalsy: true })
      .withMessage('身份证后六位不能为空')
      .isString()
      .customSanitizer((value) => String(value || '').trim().replace(/\s+/g, ''))
      .matches(/^[0-9Xx]{6}$/)
      .withMessage('身份证后六位格式错误'),
    
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
      const idCardLast6 = (req.body.idCardLast6 ?? '').toString().trim().toUpperCase();

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
            loginMethod: 'idCard',
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
          loginMethod: 'idCard',
          loginIp,
          userAgent,
          success: false,
          failureReason: '用户不存在',
        });
        return res.status(401).json({
          success: false,
          message: '用户名或身份证后六位错误'
        });
      }

      // 统一登录口径：所有角色只使用“姓名/工号 + 身份证后六位”登录。
      // 不再兼容管理员自定义密码、员工自设密码或历史初始密码。
      const isValidPassword = Boolean(employee.idCardLast6Hash)
        && await EmployeeModel.verifyPassword(idCardLast6, employee.idCardLast6Hash as string);

      if (!isValidPassword) {
        // 记录登录失败日志（密码错误）
        await LoginLogModel.create({
          employeeId: employee.id,
          employeeName: employee.name,
          role: employee.role,
          department: employee.department,
          subDepartment: employee.subDepartment,
          loginMethod: 'idCard',
          loginIp,
          userAgent,
          success: false,
          failureReason: employee.idCardLast6Hash ? '身份证后六位错误' : '未录入身份证后六位',
        });
        return res.status(401).json({
          success: false,
          message: '用户名或身份证后六位错误'
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
          loginMethod: 'idCard',
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
        loginMethod: 'idCard',
        loginIp,
        userAgent,
        success: true,
      });

      if ((employee as any).mustChangePassword) {
        await EmployeeModel.updateMustChangePassword(employee.id, false);
        (employee as any).mustChangePassword = false;
      }

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
        mustChangePassword: false,
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
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '未认证'
        });
      }

      return res.status(410).json({
        success: false,
        message: '修改密码功能已停用；系统统一使用身份证后六位登录'
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
