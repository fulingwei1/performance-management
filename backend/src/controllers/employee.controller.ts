import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import { EmployeeRole, EmployeeLevel } from '../types';

export const employeeController = {
  // 获取所有员工
  getAllEmployees: asyncHandler(async (req: Request, res: Response) => {
    const employees = await EmployeeModel.findAll();
    res.json({
      success: true,
      data: employees
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

      // 移除密码字段
      const { password, ...employeeWithoutPassword } = employee as any;

      res.json({
        success: true,
        data: employeeWithoutPassword
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

    const subordinates = await EmployeeModel.findByManagerId(req.user.userId);
    res.json({
      success: true,
      data: subordinates
    });
  }),

  // 根据角色获取员工
  getEmployeesByRole: [
    param('role').isIn(['employee', 'manager', 'gm', 'hr']).withMessage('角色类型错误'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const employees = await EmployeeModel.findByRole(req.params.role as EmployeeRole);
      res.json({
        success: true,
        data: employees
      });
    })
  ],

  // 获取所有经理
  getAllManagers: asyncHandler(async (req: Request, res: Response) => {
    const managers = await EmployeeModel.findByRole('manager');
    res.json({
      success: true,
      data: managers
    });
  }),

  // 创建员工
  createEmployee: [
    body('id').notEmpty().withMessage('员工ID不能为空'),
    body('name').notEmpty().withMessage('姓名不能为空'),
    body('department').notEmpty().withMessage('部门不能为空'),
    body('subDepartment').notEmpty().withMessage('子部门不能为空'),
    body('role').isIn(['employee', 'manager', 'gm', 'hr']).withMessage('角色类型错误'),
    body('level').isIn(['senior', 'intermediate', 'junior', 'assistant']).withMessage('级别错误'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      const { id, name, department, subDepartment, role, level, managerId, password } = req.body;

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
        managerId,
        password
      });

      res.status(201).json({
        success: true,
        data: employee,
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

      const employee = await EmployeeModel.update(req.params.id as string, req.body);
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: '员工不存在'
        });
      }

      res.json({
        success: true,
        data: employee,
        message: '员工更新成功'
      });
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
