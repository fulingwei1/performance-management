import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { randomUUID } from 'crypto';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import { EmployeeRole, EmployeeLevel } from '../types';
import {
  getOrgUnitKey,
  getPerformanceRankingConfig,
  isParticipatingRecord,
} from '../services/performanceRankingConfig.service';
import {
  hasValidAssessorId,
  resolveSelfAssessmentEligibility,
} from '../services/selfAssessmentEligibility.service';

function normalizeManagerId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function isPrivilegedAccount(role?: string): boolean {
  return role === 'admin' || role === 'gm' || role === 'hr';
}

function buildDisabledLegacyPassword(): string {
  return `disabled-legacy-password-${randomUUID()}`;
}

async function validateManagerAssignment(employeeId: string, managerId: string | null | undefined): Promise<string | null> {
  if (managerId === undefined || managerId === null || managerId === '') return null;
  if (managerId === employeeId) return '直属上级不能设置为本人';

  const manager = await EmployeeModel.findById(managerId);
  if (!manager || (manager as any).status === 'disabled') {
    return '直属上级不存在或已禁用';
  }

  const allEmployees = (await EmployeeModel.findAll()) as any[];
  const managerByEmployee = new Map<string, string>();
  for (const employee of allEmployees) {
    const id = String(employee.id || '').trim();
    const parentId = String(employee.managerId || '').trim();
    // 兼容历史数据里“负责人 manager_id 指向自己”的顶层写法：
    // 这种自指不应让其下属的上级校验误判为循环，但新的自指设置仍在上面直接拦截。
    if (id && parentId && parentId !== id) managerByEmployee.set(id, parentId);
  }
  managerByEmployee.set(employeeId, managerId);

  const seen = new Set<string>();
  let cursor = employeeId;
  while (cursor) {
    if (seen.has(cursor)) return '直属上级关系存在循环引用';
    seen.add(cursor);
    cursor = managerByEmployee.get(cursor) || '';
  }

  return null;
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

    const selfEligibility = await resolveSelfAssessmentEligibility(currentEmployee);
    const selfParticipating = selfEligibility.canSubmitSelfSummary;

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

    const rankingConfig = await getPerformanceRankingConfig();
    const allEmployees = await EmployeeModel.findAll();
    const activeEmployeeIds = new Set(
      (allEmployees as any[])
        .filter((employee) => !employee.status || employee.status === 'active')
        .map((employee) => employee.id)
    );
    const subordinates = await EmployeeModel.findTeamForManager(req.user.userId);
    if (subordinates.length > 0) {
      const members = subordinates.map((employee) => {
        const participating = isParticipatingRecord(employee, rankingConfig)
          && hasValidAssessorId(employee, activeEmployeeIds);
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
    const page = Number.parseInt(String(req.query.page || ''), 10);
    const limit = Number.parseInt(String(req.query.limit || ''), 10);
    const shouldPaginate = Number.isInteger(page) && page > 0 && Number.isInteger(limit) && limit > 0;
    const safeLimit = shouldPaginate ? Math.min(limit, 200) : sanitized.length;
    const pagedData = shouldPaginate
      ? sanitized.slice((page - 1) * safeLimit, (page - 1) * safeLimit + safeLimit)
      : sanitized;

    res.json({
      success: true,
      data: pagedData,
      ...(shouldPaginate ? {
        pagination: {
          page,
          limit: safeLimit,
          total: sanitized.length,
          totalPages: Math.ceil(sanitized.length / safeLimit),
        }
      } : {})
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
    const employees = (await EmployeeModel.findAll() as any[])
      .filter((e: any) => !e.status || e.status === 'active');
    const subordinateManagerIds = new Set(
      employees
        .map((employee: any) => String(employee.managerId || '').trim())
        .filter(Boolean)
    );
    const managers = employees.filter((e: any) => (
      ['manager', 'gm', 'hr', 'admin'].includes(e.role)
      || subordinateManagerIds.has(e.id)
      || /总经理|副总|常务副总|部门经理|经理|主管|主任|部长|组长/.test(String(e.position || ''))
    ));
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
    body('wecomUserId').optional().isLength({ max: 128 }).withMessage('企业微信用户ID不能超过128个字符'),
    body('idCardLast6')
      .exists({ checkFalsy: true })
      .withMessage('请提供身份证后六位')
      .isString()
      .matches(/^[0-9Xx]{6}$/)
      .withMessage('身份证后六位格式错误'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const { id, name, department, subDepartment, role, level, managerId, wecomUserId, idCardLast6 } = req.body;
      if (req.user?.role !== 'admin' && isPrivilegedAccount(role)) {
        return res.status(403).json({
          success: false,
          message: '只有系统管理员可以创建 HR/总经理/管理员账号'
        });
      }
      const normalizedManagerId = normalizeManagerId(managerId);
      const managerError = await validateManagerAssignment(id, normalizedManagerId);
      if (managerError) {
        return res.status(400).json({ success: false, message: managerError });
      }

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

      const employee = await EmployeeModel.create({
        id,
        name,
        department,
        subDepartment,
        role,
        level,
        managerId: normalizedManagerId ?? undefined,
        wecomUserId,
        // password 列仅为兼容旧表结构保留；登录时不会再校验该字段。
        password: buildDisabledLegacyPassword(),
        idCardLast6: normalizedIdCardLast6,
        mustChangePassword: false
      });

      res.status(201).json({
        success: true,
        data: (() => {
          const { password: _, idCardLast6Hash: __, ...rest } = employee as any;
          return rest;
        })(),
        message: '员工创建成功，登录口令为身份证后六位'
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
      if (Object.prototype.hasOwnProperty.call(restUpdates, 'role') && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '只有系统管理员可以调整账号角色'
        });
      }
      const targetEmployee = await EmployeeModel.findById(req.params.id as string);
      if (!targetEmployee) {
        return res.status(404).json({
          success: false,
          error: '员工不存在'
        });
      }
      const protectedOrgFields = ['department', 'subDepartment'];
      const requestedProtectedOrgFields = protectedOrgFields.filter((field) => Object.prototype.hasOwnProperty.call(restUpdates, field));
      if (requestedProtectedOrgFields.length > 0 && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '部门/小组信息请通过人事档案导入维护'
        });
      }
      if (Object.prototype.hasOwnProperty.call(restUpdates, 'managerId')) {
        const targetRole = (targetEmployee as any).role;
        if (req.user?.role !== 'admin' && (req.user?.userId === targetEmployee.id || isPrivilegedAccount(targetRole))) {
          return res.status(403).json({
            success: false,
            message: '不能通过员工接口调整本人或特权账号的直属上级'
          });
        }
        restUpdates.managerId = normalizeManagerId(restUpdates.managerId);
        const managerError = await validateManagerAssignment(req.params.id as string, restUpdates.managerId);
        if (managerError) {
          return res.status(400).json({ success: false, message: managerError });
        }
      }
      if (idCardLast6) {
        const normalizedIdCardLast6 = String(idCardLast6).trim().toUpperCase();
        await EmployeeModel.updateIdCardLast6(req.params.id as string, normalizedIdCardLast6);
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
    body().custom((_, { req }) => {
      const hasIdCardLast6 = typeof req.body?.idCardLast6 === 'string' && req.body.idCardLast6.trim();
      const hasNewPassword = typeof req.body?.newPassword === 'string' && req.body.newPassword.trim().length > 0;
      if (hasNewPassword) {
        throw new Error('系统统一使用身份证后六位登录，不支持设置自定义密码');
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

      if (idCardLast6) {
        await EmployeeModel.updateIdCardLast6(req.params.id as string, idCardLast6);
        await EmployeeModel.updateMustChangePassword(req.params.id as string, false);

        return res.json({
          success: true,
          data: {
            id: employee.id,
            mustChangePassword: false,
            hasIdCardLast6: true,
            loginMethod: 'idCardLast6',
            temporaryPassword: '身份证后六位'
          },
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
        data: {
          id: employee.id,
          mustChangePassword: false,
          hasIdCardLast6: true,
          loginMethod: 'idCardLast6',
          temporaryPassword: '身份证后六位'
        },
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
      if (req.user?.userId === employee.id) {
        return res.status(403).json({ success: false, message: '不能启用或禁用自己的账号' });
      }
      if (req.user?.role !== 'admin' && isPrivilegedAccount(employee.role)) {
        return res.status(403).json({ success: false, message: '只有系统管理员可以启用或禁用 HR/总经理/管理员账号' });
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

      const employee = await EmployeeModel.findById(req.params.id as string);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: '员工不存在'
        });
      }
      if (req.user?.userId === employee.id) {
        return res.status(403).json({
          success: false,
          message: '不能删除自己的账号'
        });
      }
      if (req.user?.role !== 'admin' && isPrivilegedAccount(employee.role)) {
        return res.status(403).json({
          success: false,
          message: '只有系统管理员可以删除 HR/总经理/管理员账号'
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
