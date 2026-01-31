"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeController = void 0;
const express_validator_1 = require("express-validator");
const employee_model_1 = require("../models/employee.model");
const errorHandler_1 = require("../middleware/errorHandler");
exports.employeeController = {
    // 获取所有员工
    getAllEmployees: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const employees = await employee_model_1.EmployeeModel.findAll();
        res.json({
            success: true,
            data: employees
        });
    }),
    // 根据ID获取员工
    getEmployeeById: [
        (0, express_validator_1.param)('id').notEmpty().withMessage('员工ID不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const employee = await employee_model_1.EmployeeModel.findById(req.params.id);
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    error: '员工不存在'
                });
            }
            // 移除密码字段
            const { password, ...employeeWithoutPassword } = employee;
            res.json({
                success: true,
                data: employeeWithoutPassword
            });
        })
    ],
    // 获取经理的下属
    getSubordinates: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: '未认证'
            });
        }
        const subordinates = await employee_model_1.EmployeeModel.findByManagerId(req.user.userId);
        res.json({
            success: true,
            data: subordinates
        });
    }),
    // 根据角色获取员工
    getEmployeesByRole: [
        (0, express_validator_1.param)('role').isIn(['employee', 'manager', 'gm', 'hr']).withMessage('角色类型错误'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const employees = await employee_model_1.EmployeeModel.findByRole(req.params.role);
            res.json({
                success: true,
                data: employees
            });
        })
    ],
    // 获取所有经理
    getAllManagers: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const managers = await employee_model_1.EmployeeModel.findByRole('manager');
        res.json({
            success: true,
            data: managers
        });
    }),
    // 创建员工
    createEmployee: [
        (0, express_validator_1.body)('id').notEmpty().withMessage('员工ID不能为空'),
        (0, express_validator_1.body)('name').notEmpty().withMessage('姓名不能为空'),
        (0, express_validator_1.body)('department').notEmpty().withMessage('部门不能为空'),
        (0, express_validator_1.body)('subDepartment').notEmpty().withMessage('子部门不能为空'),
        (0, express_validator_1.body)('role').isIn(['employee', 'manager', 'gm', 'hr']).withMessage('角色类型错误'),
        (0, express_validator_1.body)('level').isIn(['senior', 'intermediate', 'junior', 'assistant']).withMessage('级别错误'),
        (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('密码至少6位'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const { id, name, department, subDepartment, role, level, managerId, password } = req.body;
            // 检查ID是否已存在
            const existing = await employee_model_1.EmployeeModel.findById(id);
            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: '员工ID已存在'
                });
            }
            const employee = await employee_model_1.EmployeeModel.create({
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
        (0, express_validator_1.param)('id').notEmpty().withMessage('员工ID不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const employee = await employee_model_1.EmployeeModel.update(req.params.id, req.body);
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
        (0, express_validator_1.param)('id').notEmpty().withMessage('员工ID不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const success = await employee_model_1.EmployeeModel.delete(req.params.id);
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
//# sourceMappingURL=employee.controller.js.map