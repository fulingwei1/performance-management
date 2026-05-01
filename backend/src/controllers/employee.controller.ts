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

    const subordinates = (await EmployeeModel.findByManagerId(req.user.userId))
      .filter((employee: any) => !employee.status || employee.status === 'active');
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
      return isPrivileged ? rest : toDirectory(rest);
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
        data: employeeWithoutSensitive
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

    const subordinates = (await EmployeeModel.findByManagerId(req.user.userId))
      .filter((e: any) => !e.status || e.status === 'active');
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
          return isPrivileged ? rest : toDirectory(rest);
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
        return isPrivileged ? rest : toDirectory(rest);
      })
    });
  }),

  // 创建员工
  createEmployee: [
    body('id').notEmpty().withMessage('员工ID不能为空'),
    body('name').notEmpty().withMessage('姓名不能为空'),
    body('department').notEmpty().withMessage('部门不能为空'),
    body('subDepartment').notEmpty().withMessage('子部门不能为空'),
    body('role').isIn(['employee', 'manager', 'gm', 'hr', 'admin']).withMessage('角色类型错误'),
    body('level').isIn(['senior', 'intermediate', 'junior', 'assistant']).withMessage('级别错误'),
    body('password').optional().isLength({ min: 6 }).withMessage('密码至少6位'),
    body('wecomUserId').optional().isLength({ max: 128 }).withMessage('企业微信用户ID不能超过128个字符'),
    body('idCardLast6')
      .optional()
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

      const employee = await EmployeeModel.create({
        id,
        name,
        department,
        subDepartment,
        role,
        level,
        managerId: normalizedManagerId ?? undefined,
        wecomUserId,
        password: password || '123456',
        idCardLast6
      });

      res.status(201).json({
        success: true,
        data: (() => {
          const { password: _, idCardLast6Hash: __, ...rest } = employee as any;
          return rest;
        })(),
        message: '员工创建成功'
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
        await EmployeeModel.updateIdCardLast6(req.params.id as string, String(idCardLast6));
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
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const employee = await EmployeeModel.findById(req.params.id as string);
      if (!employee) {
        return res.status(404).json({ success: false, message: '员工不存在' });
      }

      const success = await EmployeeModel.updatePassword(req.params.id as string, '123456');
      if (!success) {
        return res.status(500).json({ success: false, message: '重置密码失败' });
      }

      res.json({ success: true, message: '密码已重置为默认密码(123456)' });
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
