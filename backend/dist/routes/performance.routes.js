"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const performance_controller_1 = require("../controllers/performance.controller");
const auth_1 = require("../middleware/auth");
const generateDemoData_1 = require("../scripts/generateDemoData");
const router = (0, express_1.Router)();
// 获取当前用户的绩效记录（需要认证）
router.get('/my-records', auth_1.authenticate, performance_controller_1.performanceController.getMyRecords);
// 获取经理的评分记录（下属）（需要经理权限）
router.get('/team-records', auth_1.authenticate, (0, auth_1.requireRole)('manager'), performance_controller_1.performanceController.getTeamRecords);
// 获取某月份的所有记录（经理、总经理或HR）
router.get('/month/:month', auth_1.authenticate, (0, auth_1.requireRole)('manager', 'gm', 'hr'), performance_controller_1.performanceController.getRecordsByMonth);
// 删除某月份的所有绩效记录（HR）
router.delete('/month/:month', auth_1.authenticate, (0, auth_1.requireRole)('hr'), performance_controller_1.performanceController.deleteRecordsByMonth);
// 获取全公司所有记录（总经理或HR）支持 ?months=N 参数
router.get('/all-records', auth_1.authenticate, (0, auth_1.requireRole)('gm', 'hr'), performance_controller_1.performanceController.getAllRecords);
// 删除全公司所有绩效记录（HR）
router.delete('/all-records', auth_1.authenticate, (0, auth_1.requireRole)('hr'), performance_controller_1.performanceController.deleteAllRecords);
// 员工提交工作总结（需要员工权限）
router.post('/summary', auth_1.authenticate, (0, auth_1.requireRole)('employee'), performance_controller_1.performanceController.submitSummary);
// 创建空记录（经理给未提交的员工评分时使用）
router.post('/create-empty-record', auth_1.authenticate, (0, auth_1.requireRole)('manager'), performance_controller_1.performanceController.createEmptyRecord);
// 经理评分（需要经理权限）
router.post('/score', auth_1.authenticate, (0, auth_1.requireRole)('manager'), performance_controller_1.performanceController.submitScore);
// HR批量生成绩效任务
router.post('/generate-tasks', auth_1.authenticate, (0, auth_1.requireRole)('hr'), performance_controller_1.performanceController.generateTasks);
// 获取月度统计数据（用于导出）
router.get('/stats/:month', auth_1.authenticate, (0, auth_1.requireRole)('hr', 'gm'), performance_controller_1.performanceController.getStatsByMonth);
// 模拟数据管理（HR/GM权限）
router.post('/demo-data/generate', auth_1.authenticate, (0, auth_1.requireRole)('hr', 'gm'), async (req, res) => {
    try {
        if (await (0, generateDemoData_1.hasDemoData)()) {
            return res.status(400).json({ success: false, message: '模拟数据已存在，请先清除' });
        }
        const count = await (0, generateDemoData_1.insertDemoData)();
        res.json({ success: true, message: `成功生成 ${count} 条模拟数据`, count });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete('/demo-data', auth_1.authenticate, (0, auth_1.requireRole)('hr', 'gm'), async (req, res) => {
    try {
        const count = await (0, generateDemoData_1.clearDemoData)();
        res.json({ success: true, message: `成功清除 ${count} 条模拟数据`, count });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/demo-data/status', auth_1.authenticate, async (req, res) => {
    try {
        const exists = await (0, generateDemoData_1.hasDemoData)();
        res.json({ success: true, hasDemoData: exists });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 根据ID获取记录（需要认证）- 注意：通配符路由必须放在最后
router.get('/:id', auth_1.authenticate, performance_controller_1.performanceController.getRecordById);
// 删除记录（需要HR权限）- 注意：通配符路由必须放在最后
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)('hr'), performance_controller_1.performanceController.deleteRecord);
exports.default = router;
//# sourceMappingURL=performance.routes.js.map