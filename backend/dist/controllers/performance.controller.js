"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceController = void 0;
const express_validator_1 = require("express-validator");
const performance_model_1 = require("../models/performance.model");
const employee_model_1 = require("../models/employee.model");
const errorHandler_1 = require("../middleware/errorHandler");
const helpers_1 = require("../utils/helpers");
exports.performanceController = {
    // 获取当前用户的绩效记录
    getMyRecords: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: '未认证'
            });
        }
        const records = await performance_model_1.PerformanceModel.findByEmployeeId(req.user.userId);
        res.json({
            success: true,
            data: records
        });
    }),
    // 获取经理的评分记录（下属）
    // 支持 ?month=2026-01 查询单月
    // 支持 ?months=3 查询最近N个月
    // 不传参数返回所有历史数据
    getTeamRecords: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: '未认证'
            });
        }
        const { month, months } = req.query;
        let records = await performance_model_1.PerformanceModel.findByAssessorId(req.user.userId, month);
        // 如果指定了months参数，过滤最近N个月的数据
        if (months && !month) {
            const monthCount = parseInt(months, 10);
            if (!isNaN(monthCount) && monthCount > 0) {
                const now = new Date();
                const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
                const cutoffMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
                records = records.filter(r => r.month >= cutoffMonth);
            }
        }
        res.json({
            success: true,
            data: records
        });
    }),
    // 获取某月份的所有记录
    getRecordsByMonth: [
        (0, express_validator_1.param)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误，应为YYYY-MM'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const records = await performance_model_1.PerformanceModel.findByMonth(req.params.month);
            res.json({
                success: true,
                data: records
            });
        })
    ],
    // 获取全公司所有记录（总经理/HR用）
    getAllRecords: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: '未认证'
            });
        }
        const { months } = req.query;
        let records = await performance_model_1.PerformanceModel.findAll();
        // 如果指定了months参数，过滤最近N个月的数据
        if (months) {
            const monthCount = parseInt(months, 10);
            if (!isNaN(monthCount) && monthCount > 0) {
                const now = new Date();
                const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
                const cutoffMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
                records = records.filter(r => r.month >= cutoffMonth);
            }
        }
        res.json({
            success: true,
            data: records
        });
    }),
    // 根据ID获取记录
    getRecordById: [
        (0, express_validator_1.param)('id').notEmpty().withMessage('记录ID不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const record = await performance_model_1.PerformanceModel.findById(req.params.id);
            if (!record) {
                return res.status(404).json({
                    success: false,
                    error: '记录不存在'
                });
            }
            res.json({
                success: true,
                data: record
            });
        })
    ],
    // 员工提交工作总结
    submitSummary: [
        (0, express_validator_1.body)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
        (0, express_validator_1.body)('selfSummary').notEmpty().withMessage('工作总结不能为空'),
        (0, express_validator_1.body)('nextMonthPlan').notEmpty().withMessage('下月计划不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: '未认证'
                });
            }
            const { month, selfSummary, nextMonthPlan } = req.body;
            // 获取员工信息
            const employee = await employee_model_1.EmployeeModel.findById(req.user.userId);
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    error: '员工不存在'
                });
            }
            // 检查是否已经提交过该月份 - 如果存在则更新
            const existing = await performance_model_1.PerformanceModel.findByEmployeeIdAndMonth(employee.id, month);
            if (existing) {
                // 如果已经被经理评分，则不允许修改
                if (existing.status === 'scored' || existing.status === 'completed') {
                    return res.status(400).json({
                        success: false,
                        error: '该记录已被评分，无法修改'
                    });
                }
                // 更新已有记录
                const updated = await performance_model_1.PerformanceModel.update(existing.id, {
                    selfSummary,
                    nextMonthPlan,
                    status: 'submitted',
                    updatedAt: new Date()
                });
                return res.json({
                    success: true,
                    data: updated,
                    message: '工作总结更新成功'
                });
            }
            // 确定分组
            const groupType = (0, helpers_1.getGroupType)(employee.level);
            // 生成记录ID
            const recordId = `rec-${employee.id}-${month}`;
            const record = await performance_model_1.PerformanceModel.saveSummary({
                id: recordId,
                employeeId: employee.id,
                assessorId: employee.managerId || '',
                month,
                selfSummary,
                nextMonthPlan,
                groupType
            });
            res.status(201).json({
                success: true,
                data: record,
                message: '工作总结提交成功'
            });
        })
    ],
    // 创建空记录（经理给未提交的员工评分时使用）
    createEmptyRecord: [
        (0, express_validator_1.body)('employeeId').notEmpty().withMessage('员工ID不能为空'),
        (0, express_validator_1.body)('month').notEmpty().withMessage('月份不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: '未认证'
                });
            }
            const { employeeId, month } = req.body;
            // 获取员工信息
            const employee = await employee_model_1.EmployeeModel.findById(employeeId);
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    error: '员工不存在'
                });
            }
            // 确定分组
            const groupType = (0, helpers_1.getGroupType)(employee.level);
            // 生成记录ID
            const recordId = `rec-${employee.id}-${month}`;
            // 创建空记录
            const record = await performance_model_1.PerformanceModel.saveSummary({
                id: recordId,
                employeeId: employee.id,
                assessorId: employee.managerId || '',
                month,
                selfSummary: '',
                nextMonthPlan: '',
                groupType
            });
            res.json({
                success: true,
                data: record,
                message: '空记录创建成功'
            });
        })
    ],
    // 经理评分
    submitScore: [
        (0, express_validator_1.body)('id').notEmpty().withMessage('记录ID不能为空'),
        (0, express_validator_1.body)('taskCompletion').isFloat({ min: 0.5, max: 1.5 }).withMessage('任务完成分数范围0.5-1.5'),
        (0, express_validator_1.body)('initiative').isFloat({ min: 0.5, max: 1.5 }).withMessage('主动性分数范围0.5-1.5'),
        (0, express_validator_1.body)('projectFeedback').isFloat({ min: 0.5, max: 1.5 }).withMessage('项目反馈分数范围0.5-1.5'),
        (0, express_validator_1.body)('qualityImprovement').isFloat({ min: 0.5, max: 1.5 }).withMessage('质量改进分数范围0.5-1.5'),
        (0, express_validator_1.body)('managerComment').notEmpty().withMessage('评语不能为空'),
        (0, express_validator_1.body)('nextMonthWorkArrangement').notEmpty().withMessage('工作安排不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: '未认证'
                });
            }
            const { id, taskCompletion, initiative, projectFeedback, qualityImprovement, managerComment, nextMonthWorkArrangement } = req.body;
            // 计算总分
            const totalScore = taskCompletion * 0.4 +
                initiative * 0.3 +
                projectFeedback * 0.2 +
                qualityImprovement * 0.1;
            const record = await performance_model_1.PerformanceModel.submitScore({
                id,
                taskCompletion,
                initiative,
                projectFeedback,
                qualityImprovement,
                totalScore: parseFloat(totalScore.toFixed(2)),
                level: (0, helpers_1.scoreToLevel)(totalScore),
                managerComment,
                nextMonthWorkArrangement
            });
            if (!record) {
                return res.status(404).json({
                    success: false,
                    error: '记录不存在'
                });
            }
            // 更新排名
            await performance_model_1.PerformanceModel.updateRanks(record.month);
            res.json({
                success: true,
                data: record,
                message: '评分提交成功'
            });
        })
    ],
    // 删除记录
    deleteRecord: [
        (0, express_validator_1.param)('id').notEmpty().withMessage('记录ID不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const success = await performance_model_1.PerformanceModel.delete(req.params.id);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    error: '记录不存在'
                });
            }
            res.json({
                success: true,
                message: '记录删除成功'
            });
        })
    ],
    // 按月份删除记录（HR）
    deleteRecordsByMonth: [
        (0, express_validator_1.param)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误，应为YYYY-MM'),
        (0, express_validator_1.body)('confirm').notEmpty().withMessage('请填写确认信息'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const month = req.params.month;
            const { confirm, force } = req.body;
            // 必须输入目标月份作为确认
            if (confirm !== month) {
                return res.status(400).json({
                    success: false,
                    error: '确认信息不匹配，请输入要删除的月份（YYYY-MM）'
                });
            }
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const isPastMonth = month < currentMonth;
            if (isPastMonth && !force) {
                return res.status(400).json({
                    success: false,
                    error: '删除历史月份需要二次确认（force=true）'
                });
            }
            const deletedCount = await performance_model_1.PerformanceModel.deleteByMonth(month);
            res.json({
                success: true,
                message: `已删除 ${month} 共 ${deletedCount} 条绩效记录`,
                data: { month, deletedCount }
            });
        })
    ],
    // 删除全部记录（HR）
    deleteAllRecords: [
        (0, express_validator_1.body)('confirm').notEmpty().withMessage('请填写确认信息'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const { confirm, force } = req.body;
            if (confirm !== 'DELETE ALL' || !force) {
                return res.status(400).json({
                    success: false,
                    error: '删除全部记录需要输入 "DELETE ALL" 并二次确认（force=true）'
                });
            }
            const deletedCount = await performance_model_1.PerformanceModel.deleteAll();
            res.json({
                success: true,
                message: `已删除全部绩效记录，共 ${deletedCount} 条`,
                data: { deletedCount }
            });
        })
    ],
    // HR批量生成绩效任务
    generateTasks: [
        (0, express_validator_1.body)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误，应为YYYY-MM'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const { month } = req.body;
            // 获取所有需要考评的员工（员工+经理，排除总经理和HR）
            const allEmployees = await employee_model_1.EmployeeModel.findAll();
            const assessableEmployees = allEmployees.filter((e) => e.role === 'employee' || e.role === 'manager');
            const validIds = new Set(allEmployees.map((e) => e.id));
            let createdCount = 0;
            let skippedCount = 0;
            for (const employee of assessableEmployees) {
                // 检查是否已存在记录
                const existing = await performance_model_1.PerformanceModel.findByEmployeeIdAndMonth(employee.id, month);
                if (existing) {
                    skippedCount++;
                    continue;
                }
                // 确定分组和考评人
                const groupType = (0, helpers_1.getGroupType)(employee.level);
                // 员工的考评人是其经理；经理的考评人是总经理。
                // 若员工 managerId 缺失/无效，为避免外键失败，回退到 gm001。
                let assessorId = 'gm001';
                if (employee.role === 'employee') {
                    if (employee.managerId && validIds.has(employee.managerId)) {
                        assessorId = employee.managerId;
                    }
                }
                const recordId = `rec-${employee.id}-${month}`;
                await performance_model_1.PerformanceModel.saveSummary({
                    id: recordId,
                    employeeId: employee.id,
                    assessorId,
                    month,
                    selfSummary: '',
                    nextMonthPlan: '',
                    groupType
                });
                createdCount++;
            }
            res.json({
                success: true,
                message: `成功生成 ${createdCount} 条绩效任务，跳过 ${skippedCount} 条已存在记录`,
                data: { createdCount, skippedCount, total: assessableEmployees.length }
            });
        })
    ],
    // 获取绩效统计数据（用于导出）
    getStatsByMonth: [
        (0, express_validator_1.param)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误，应为YYYY-MM'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            const records = await performance_model_1.PerformanceModel.findByMonth(req.params.month);
            const employees = await employee_model_1.EmployeeModel.findAll();
            // 创建员工映射
            const employeeMap = new Map();
            employees.forEach((emp) => employeeMap.set(emp.id, emp));
            // 按部门统计
            const deptStats = new Map();
            records.forEach((r) => {
                const emp = employeeMap.get(r.employeeId);
                const dept = emp?.department || '未知部门';
                if (!deptStats.has(dept)) {
                    deptStats.set(dept, { department: dept, scores: [], employees: [] });
                }
                const deptData = deptStats.get(dept);
                if (r.totalScore > 0) {
                    deptData.scores.push(r.totalScore);
                }
                deptData.employees.push({
                    name: emp?.name || r.employeeName,
                    subDepartment: emp?.subDepartment || '',
                    employeeLevel: emp?.level || '',
                    totalScore: r.totalScore,
                    status: r.status,
                    scoreLevel: r.level
                });
            });
            // 转换为数组
            const stats = Array.from(deptStats.values()).map(dept => ({
                department: dept.department,
                totalEmployees: dept.employees.length,
                scoredCount: dept.scores.length,
                averageScore: dept.scores.length > 0
                    ? parseFloat((dept.scores.reduce((a, b) => a + b, 0) / dept.scores.length).toFixed(2))
                    : 0,
                excellentCount: dept.scores.filter(s => s >= 1.2).length,
                goodCount: dept.scores.filter(s => s >= 1.0 && s < 1.2).length,
                normalCount: dept.scores.filter(s => s >= 0.8 && s < 1.0).length,
                needImprovementCount: dept.scores.filter(s => s < 0.8).length,
                employees: dept.employees
            }));
            res.json({
                success: true,
                data: {
                    month: req.params.month,
                    summary: stats,
                    records: records
                }
            });
        })
    ]
};
//# sourceMappingURL=performance.controller.js.map