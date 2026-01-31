"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentCycleController = void 0;
const assessmentCycle_model_1 = require("../models/assessmentCycle.model");
// 生成唯一ID
const generateId = () => `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
exports.assessmentCycleController = {
    // ============ 考核周期管理 ============
    // 获取所有考核周期
    getAllCycles: async (_req, res) => {
        try {
            const cycles = await assessmentCycle_model_1.AssessmentCycleModel.findAll();
            res.json({ success: true, data: cycles });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 根据ID获取考核周期
    getCycleById: async (req, res) => {
        try {
            const id = req.params.id;
            const cycle = await assessmentCycle_model_1.AssessmentCycleModel.findById(id);
            if (!cycle) {
                return res.status(404).json({ success: false, error: '考核周期不存在' });
            }
            res.json({ success: true, data: cycle });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 获取当前激活的考核周期
    getActiveCycle: async (_req, res) => {
        try {
            const cycle = await assessmentCycle_model_1.AssessmentCycleModel.findActive();
            if (!cycle) {
                return res.status(404).json({ success: false, error: '当前没有激活的考核周期' });
            }
            res.json({ success: true, data: cycle });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 创建考核周期
    createCycle: async (req, res) => {
        try {
            const { name, type, year, startDate, endDate, selfAssessmentDeadline, managerReviewDeadline, hrReviewDeadline, appealDeadline, reminderDays = 3, autoSubmit = false, excludeHolidays = true, description } = req.body;
            if (!name || !type || !year || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: '名称、类型、年份、开始日期和结束日期不能为空'
                });
            }
            // 检查是否已存在同类型同年份的周期
            const existing = await assessmentCycle_model_1.AssessmentCycleModel.findByYearAndType(year, type);
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: `该年份已存在${type}类型的考核周期`
                });
            }
            const cycle = {
                id: generateId(),
                name,
                type: type,
                year,
                startDate,
                endDate,
                selfAssessmentDeadline,
                managerReviewDeadline,
                hrReviewDeadline,
                appealDeadline,
                status: 'draft',
                reminderDays,
                autoSubmit,
                excludeHolidays,
                description
            };
            const newCycle = await assessmentCycle_model_1.AssessmentCycleModel.create(cycle);
            res.status(201).json({ success: true, data: newCycle });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 更新考核周期
    updateCycle: async (req, res) => {
        try {
            const id = req.params.id;
            const updates = req.body;
            const cycle = await assessmentCycle_model_1.AssessmentCycleModel.update(id, updates);
            if (!cycle) {
                return res.status(404).json({ success: false, error: '考核周期不存在' });
            }
            res.json({ success: true, data: cycle });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 删除考核周期
    deleteCycle: async (req, res) => {
        try {
            const id = req.params.id;
            const success = await assessmentCycle_model_1.AssessmentCycleModel.delete(id);
            if (!success) {
                return res.status(404).json({ success: false, error: '考核周期不存在' });
            }
            res.json({ success: true, message: '考核周期已删除' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 激活考核周期
    activateCycle: async (req, res) => {
        try {
            const id = req.params.id;
            const cycle = await assessmentCycle_model_1.AssessmentCycleModel.update(id, { status: 'active' });
            if (!cycle) {
                return res.status(404).json({ success: false, error: '考核周期不存在' });
            }
            res.json({ success: true, data: cycle, message: '考核周期已激活' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 批量生成年度的月度考核周期
    generateMonthlyCycles: async (req, res) => {
        try {
            const { year } = req.body;
            if (!year) {
                return res.status(400).json({ success: false, error: '年份不能为空' });
            }
            const cycles = await assessmentCycle_model_1.AssessmentCycleModel.generateMonthlyCycles(year);
            res.json({
                success: true,
                data: cycles,
                message: `成功生成${cycles.length}个月度考核周期`
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // ============ 考核日历 ============
    // 获取考核日历
    getCalendar: async (req, res) => {
        try {
            const yearParam = req.query.year;
            const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
            const cycles = await assessmentCycle_model_1.AssessmentCycleModel.findAll();
            const yearCycles = cycles.filter(c => c.year === year);
            const holidays = await assessmentCycle_model_1.AssessmentCycleModel.findAllHolidays(year);
            res.json({
                success: true,
                data: {
                    year,
                    cycles: yearCycles,
                    holidays
                }
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // ============ 节假日管理 ============
    // 获取节假日
    getHolidays: async (req, res) => {
        try {
            const yearParam = req.query.year;
            const year = yearParam ? parseInt(yearParam) : undefined;
            const holidays = await assessmentCycle_model_1.AssessmentCycleModel.findAllHolidays(year);
            res.json({ success: true, data: holidays });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 创建节假日
    createHoliday: async (req, res) => {
        try {
            const { name, date, type = 'national' } = req.body;
            if (!name || !date) {
                return res.status(400).json({ success: false, error: '节假日名称和日期不能为空' });
            }
            const holiday = {
                id: `holiday-${Date.now()}`,
                name,
                date,
                type: type
            };
            const newHoliday = await assessmentCycle_model_1.AssessmentCycleModel.createHoliday(holiday);
            res.status(201).json({ success: true, data: newHoliday });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 删除节假日
    deleteHoliday: async (req, res) => {
        try {
            const id = req.params.id;
            const success = await assessmentCycle_model_1.AssessmentCycleModel.deleteHoliday(id);
            if (!success) {
                return res.status(404).json({ success: false, error: '节假日不存在' });
            }
            res.json({ success: true, message: '节假日已删除' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 批量导入节假日
    importHolidays: async (req, res) => {
        try {
            const { holidays } = req.body;
            if (!holidays || !Array.isArray(holidays)) {
                return res.status(400).json({ success: false, error: '节假日数据不能为空' });
            }
            const createdHolidays = [];
            for (const holiday of holidays) {
                const newHoliday = {
                    id: `holiday-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: holiday.name,
                    date: holiday.date,
                    type: holiday.type || 'national'
                };
                await assessmentCycle_model_1.AssessmentCycleModel.createHoliday(newHoliday);
                createdHolidays.push(newHoliday);
            }
            res.json({
                success: true,
                data: createdHolidays,
                message: `成功导入${createdHolidays.length}个节假日`
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};
//# sourceMappingURL=assessmentCycle.controller.js.map