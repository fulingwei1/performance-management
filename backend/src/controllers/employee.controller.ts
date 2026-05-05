import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import { EmployeeRole, EmployeeLevel } from '../types';
import { getOrgUnitKey, getPerformanceRankingConfig, isParticipatingRecord } from '../services/performanceRankingConfig.service';

function normalizeManagerId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

export const employeeController = {
  getAssessmentParticipation: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未认证' });
    }

    const currentEmployee = await EmployeeModel.findById(req.user.userId);
    if (!currentEmployee) {
      return res.status(404).json({ success: false, error: '员工不存在' });
    }

    const config = await getPerformanceRankingConfig();
    const selfParticipating = isParticipatingRecord(
      {
        employeeId: currentEmployee.id,
        department: currentEmployee.department,
        subDepartment: currentEmployee.subDepartment,
      },
      config
    );

    const selfUnitKey = getOrgUnitKey(currentEmployee);
    const responseData: Record<string, unknown> = {
      self: {
        employeeId: currentEmployee.id,
        name: currentEmployee.name,
        role: currentEmployee.role,
        department: currentEmployee.department,
        subDepartment: currentEmployee.subDepartment,
        unitKey: selfUnitKey,
        participating: selfParticipating,
      },
    };

    const subordinates = await EmployeeModel.findTeamForManager(req.user.userId);
    if (subordinates.length > 0) {
      const members = subordinates.map((employee) => {
        const participating = isParticipatingRecord(
          {
            employeeId: employee.id,
            department: employee.department,
            subDepartment: employee.subDepartment,
          },
          config
        );

        return {
          employeeId: employee.id,
          name: employee.name,
          department: employee.department,
          subDepartment: employee.subDepartment,
          unitKey: getOrgUnitKey(employee),
          participating,
        };
      });

      responseData.team = {
        totalCount: members.length,
        participatingCount: members.filter((member) => member.participating).length,
        excludedCount: members.filter((member) => !member.participating).length,
        members,
      };
    }

    res.json({
      success: true,
      data: responseData,
    });
  }),

  // 获取所有员工
  getAllEmployees: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未认证' });
    }
    const includeDisabled = req.query.includeDisabled === 'true' || req.query.status === 'all';
    const employees = await EmployeeModel.findAll();
    const role = req.user.role;
    const isPrivileged = role === 'hr' || role === 'gm' || role === 'admin';
    const scopedEmployees = includeDisabled && isPrivileged
      ? employees
      : (employees as any[]).filter((e) => !e.status || e.status === 'active');

    // 非特权用户仅返回“通讯录字段”（避免暴露直属关系、状态等管理字段）
    const toDirectory = (e: any) => ({
      id: e.id,
      name: e.name,
      department: e.department,
      subDepartment: e.subDepartment,
      role: e.role,
      level: e.level,
      avatar: e.avatar,
    });

    const sanitized = (scopedEmployees as any[]).map((e) => {
      const { password, idCardLast6Hash, ...rest } = e || {};
      const privilegedRest = {
        ...rest,
        hasIdCardLast6: Boolean(rest.hasIdCardLast6 || idCardLast6Hash),
      };
      return isPrivileged ? privilegedRest : toDirectory(rest);
    });
    res.json({
      success: true,
      data: sanitized
    });
  }),

  // 根据ID获取员工
  getEmployeeById: [
    param('id').notEmpty().withMessage('员工ID不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const employee = await EmployeeModel.findById(req.params.id as string);
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: '员工不存在'
        });
      }

      if (!req.user) {
        return res.status(401).json({ success: false, error: '未认证' });
      }

      const role = req.user.role;
      const isPrivileged = role === 'hr' || role === 'gm' || role === 'admin';
      const isSelf = req.user.userId === employee.id;
      const isManagerViewingSubordinate = role === 'manager' && employee.managerId === req.user.userId;
      if (!isPrivileged && !isSelf && !isManagerViewingSubordinate) {
        return res.status(403).json({ success: false, error: '无权访问该员工信息' });
      }

      // 移除敏感字段
      const { password, idCardLast6Hash, ...employeeWithoutSensitive } = employee as any;

      res.json({
        success: true,
        data: {
          ...employeeWithoutSensitive,
          hasIdCardLast6: Boolean(employeeWithoutSensitive.hasIdCardLast6 || idCardLast6Hash),
        }
      });
    })
  ],

  // 获取经理的下属
  getSubordinates: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }

    const subordinates = await EmployeeModel.findTeamForManager(req.user.userId);
    res.json({
      success: true,
      data: (subordinates as any[]).map((e) => {
        const { password, idCardLast6Hash, ...rest } = e || {};
        return rest;
      })
    });
  }),

  // 根据角色获取员工
  getEmployeesByRole: [
    param('role').isIn(['employee', 'manager', 'gm', 'hr', 'admin']).withMessage('角色类型错误'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const includeDisabled = req.query.includeDisabled === 'true' || req.query.status === 'all';
      const employees = await EmployeeModel.findByRole(req.params.role as EmployeeRole);
      const role = req.user?.role;
      const isPrivileged = role === 'hr' || role === 'gm' || role === 'admin';
      const toDirectory = (e: any) => ({
        id: e.id,
        name: e.name,
        department: e.department,
        subDepartment: e.subDepartment,
        role: e.role,
        level: e.level,
        avatar: e.avatar,
      });
      res.json({
        success: true,
        data: (employees as any[])
          .filter((e) => (includeDisabled && isPrivileged) || !e.status || e.status === 'active')
          .map((e) => {
          const { password, idCardLast6Hash, ...rest } = e || {};
          const privilegedRest = {
            ...rest,
            hasIdCardLast6: Boolean(rest.hasIdCardLast6 || idCardLast6Hash),
          };
          return isPrivileged ? privilegedRest : toDirectory(rest);
        })
      });
    })
  ],

  // 获取所有经理
  getAllManagers: asyncHandler(async (req: Request, res: Response) => {
    const managers = (await EmployeeModel.findByRole('manager'))
      .filter((e: any) => !e.status || e.status === 'active');
    const role = req.user?.role;
    const isPrivileged = role === 'hr' || role === 'gm' || role === 'admin';
    const toDirectory = (e: any) => ({
      id: e.id,
      name: e.name,
      department: e.department,
      subDepartment: e.subDepartment,
      role: e.role,
      level: e.level,
      avatar: e.avatar,
    });
    res.json({
      success: true,
      data: (managers as any[]).map((e) => {
        const { password, idCardLast6Hash, ...rest } = e || {};
        const privilegedRest = {
          ...rest,
          hasIdCardLast6: Boolean(rest.hasIdCardLast6 || idCardLast6Hash),
        };
        return isPrivileged ? privilegedRest : toDirectory(rest);
      })
    });
  }),

  // 创建员工
  createEmployee: [
    body('id').notEmpty().withMessage('员工ID不能为空'),
    body('name').notEmpty().withMessage('姓名不能为空'),
    body('department').notEmpty().withMessage('部门不能为空'),
    body('subDepartment').optional({ values: 'falsy' }).isLength({ max: 100 }).withMessage('子部门不能超过100个字符'),
    body('role').isIn(['employee', 'manager', 'gm', 'hr', 'admin']).withMessage('角色类型错误'),
    body('level').isIn(['senior', 'intermediate', 'junior', 'assistant']).withMessage('级别错误'),
    body('password').optional().isLength({ min: 8 }).withMessage('密码至少8位'),
    body('wecomUserId').optional().isLength({ max: 128 }).withMessage('企业微信用户ID不能超过128个字符'),
    body('idCardLast6')
      .optional()
      .isString()
      .matches(/^[0-9Xx]{6}$/)
      .withMessage('身份证后六位格式错误'),
    body().custom((_, { req }) => {
      if (!req.body.idCardLast6 && !req.body.password) {
        throw new Error('请提供身份证后六位；系统不再生成随机登录密码');
      }
      return true;
    }),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const { id, name, department, subDepartment, role, level, managerId, wecomUserId, password, idCardLast6 } = req.body;
      const normalizedManagerId = normalizeManagerId(managerId);

      // 检查ID是否已存在
      const existing = await EmployeeModel.findById(id);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: '员工ID已存在'
        });
      }

      const normalizedIdCardLast6 = typeof idCardLast6 === 'string'
        ? idCardLast6.trim().toUpperCase()
        : '';
      const providedPassword = typeof password === 'string' && password.trim() ? password.trim() : '';
      const loginPassword = normalizedIdCardLast6 || providedPassword;

      const employee = await EmployeeModel.create({
        id,
        name,
        department,
        subDepartment,
        role,
        level,
        managerId: normalizedManagerId ?? undefined,
        wecomUserId,
        password: loginPassword,
        idCardLast6: normalizedIdCardLast6 || undefined,
        mustChangePassword: false
      });

      res.status(201).json({
        success: true,
        data: (() => {
          const { password: _, idCardLast6Hash: __, ...rest } = employee as any;
          return rest;
        })(),
        message: normalizedIdCardLast6
          ? '员工创建成功，登录口令为身份证后六位'
          : '员工创建成功'
      });
    })
  ],

  // 更新员工
  updateEmployee: [
    param('id').notEmpty().withMessage('员工ID不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const { idCardLast6, ...restUpdates } = (req.body || {}) as any;
      if (Object.prototype.hasOwnProperty.call(restUpdates, 'managerId')) {
        restUpdates.managerId = normalizeManagerId(restUpdates.managerId);
      }
      if (idCardLast6) {
        const normalizedIdCardLast6 = String(idCardLast6).trim().toUpperCase();
        await EmployeeModel.updateIdCardLast6(req.params.id as string, normalizedIdCardLast6);
        await EmployeeModel.updatePassword(req.params.id as string, normalizedIdCardLast6, { mustChangePassword: false });
      }

      const employee = await EmployeeModel.update(req.params.id as string, restUpdates);
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: '员工不存在'
        });
      }

      res.json({
        success: true,
        data: (() => {
          const { password: _, idCardLast6Hash: __, ...rest } = employee as any;
          return rest;
        })(),
        message: '员工更新成功'
      });
    })
  ],

  // 重置密码
  resetPassword: [
    param('id').notEmpty().withMessage('员工ID不能为空'),
    body('idCardLast6')
      .optional()
      .isString()
      .matches(/^[0-9Xx]{6}$/)
      .withMessage('身份证后六位格式错误'),
    body('newPassword')
      .optional()
      .isLength({ min: 8 })
      .withMessage('新密码至少8位'),
    body().custom((_, { req }) => {
      const hasIdCardLast6 = typeof req.body?.idCardLast6 === 'string' && req.body.idCardLast6.trim();
      const hasNewPassword = typeof req.body?.newPassword === 'string' && req.body.newPassword.length > 0;
      if (hasIdCardLast6 && hasNewPassword) {
        throw new Error('设置新密码和重置为身份证后六位不能同时提交');
      }
      return true;
    }),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const employee = await EmployeeModel.findById(req.params.id as string);
      if (!employee) {
        return res.status(404).json({ success: false, message: '员工不存在' });
      }

      const idCardLast6 = typeof req.body?.idCardLast6 === 'string'
        ? req.body.idCardLast6.trim().toUpperCase()
        : '';
      const newPassword = typeof req.body?.newPassword === 'string'
        ? req.body.newPassword
        : '';

      if (newPassword) {
        const success = await EmployeeModel.updatePassword(
          req.params.id as string,
          newPassword,
          { mustChangePassword: false }
        );
        if (!success) {
          return res.status(500).json({ success: false, message: '设置密码失败' });
        }

        return res.json({
          success: true,
          message: '登录密码已设置'
        });
      }

      if (idCardLast6) {
        await EmployeeModel.updateIdCardLast6(req.params.id as string, idCardLast6);
        const success = await EmployeeModel.updatePassword(
          req.params.id as string,
          idCardLast6,
          { mustChangePassword: false }
        );
        if (!success) {
          return res.status(500).json({ success: false, message: '重置密码失败' });
        }

        return res.json({
          success: true,
          message: '登录口令已重置为身份证后六位'
        });
      }

      if (!employee.idCardLast6Hash) {
        return res.status(400).json({
          success: false,
          message: '该员工未录入身份证后六位，请先补录后再重置'
        });
      }

      await EmployeeModel.updateMustChangePassword(req.params.id as string, false);
      res.json({
        success: true,
        message: '该员工已使用档案中的身份证后六位登录，无需生成随机密码'
      });
    })
  ],

  // 启用/禁用用户
  toggleStatus: [
    param('id').notEmpty().withMessage('员工ID不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const employee = await EmployeeModel.findById(req.params.id as string);
      if (!employee) {
        return res.status(404).json({ success: false, message: '员工不存在' });
      }

      const currentStatus = (employee as any).status || 'active';
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      
      const updated = await EmployeeModel.update(req.params.id as string, { status: newStatus } as any);
      if (!updated) {
        return res.status(500).json({ success: false, message: '状态更新失败' });
      }

      res.json({ success: true, data: updated, message: newStatus === 'active' ? '用户已启用' : '用户已禁用' });
    })
  ],

  // 删除员工
  deleteEmployee: [
    param('id').notEmpty().withMessage('员工ID不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const success = await EmployeeModel.delete(req.params.id as string);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: '员工不存在'
        });
      }

      res.json({
        success: true,
        message: '员工删除成功'
      });
    })
  ]
};
