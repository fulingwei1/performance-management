"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricLibraryController = void 0;
const metricLibrary_model_1 = require("../models/metricLibrary.model");
// 生成唯一ID
const generateId = () => `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
exports.metricLibraryController = {
    // ============ 指标管理 ============
    // 获取所有指标
    getAllMetrics: async (req, res) => {
        try {
            const category = req.query.category;
            let metrics;
            if (category) {
                metrics = await metricLibrary_model_1.MetricLibraryModel.findMetricsByCategory(category);
            }
            else {
                metrics = await metricLibrary_model_1.MetricLibraryModel.findAllMetrics();
            }
            res.json({ success: true, data: metrics });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 根据ID获取指标
    getMetricById: async (req, res) => {
        try {
            const id = req.params.id;
            const metric = await metricLibrary_model_1.MetricLibraryModel.findMetricById(id);
            if (!metric) {
                return res.status(404).json({ success: false, error: '指标不存在' });
            }
            res.json({ success: true, data: metric });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 创建指标
    createMetric: async (req, res) => {
        try {
            const { name, code, category, type, description, scoringCriteria, weight, departmentIds, positionIds, applicableLevels, formula, unit, targetValue, minValue = 0, maxValue = 100, dataSource } = req.body;
            if (!name || !code || !category || !type) {
                return res.status(400).json({
                    success: false,
                    error: '指标名称、编码、分类和类型不能为空'
                });
            }
            // 检查编码是否已存在
            const existing = await metricLibrary_model_1.MetricLibraryModel.findAllMetrics();
            if (existing.some(m => m.code === code)) {
                return res.status(400).json({ success: false, error: '指标编码已存在' });
            }
            const metric = {
                id: generateId(),
                name,
                code,
                category,
                type,
                description,
                scoringCriteria: scoringCriteria || [],
                weight: weight || 0,
                departmentIds: departmentIds || [],
                positionIds: positionIds || [],
                applicableLevels: applicableLevels || ['senior', 'intermediate', 'junior', 'assistant'],
                formula,
                unit,
                targetValue,
                minValue,
                maxValue,
                dataSource,
                status: 'active'
            };
            const newMetric = await metricLibrary_model_1.MetricLibraryModel.createMetric(metric);
            res.status(201).json({ success: true, data: newMetric });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 更新指标
    updateMetric: async (req, res) => {
        try {
            const id = req.params.id;
            const updates = req.body;
            const metric = await metricLibrary_model_1.MetricLibraryModel.updateMetric(id, updates);
            if (!metric) {
                return res.status(404).json({ success: false, error: '指标不存在' });
            }
            res.json({ success: true, data: metric });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 删除指标
    deleteMetric: async (req, res) => {
        try {
            const id = req.params.id;
            const success = await metricLibrary_model_1.MetricLibraryModel.deleteMetric(id);
            if (!success) {
                return res.status(404).json({ success: false, error: '指标不存在' });
            }
            res.json({ success: true, message: '指标已删除' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 批量导入指标
    importMetrics: async (req, res) => {
        try {
            const { metrics } = req.body;
            if (!metrics || !Array.isArray(metrics)) {
                return res.status(400).json({ success: false, error: '指标数据不能为空' });
            }
            const results = {
                success: 0,
                failed: 0,
                errors: []
            };
            for (const metricData of metrics) {
                try {
                    const metric = {
                        id: generateId(),
                        name: metricData.name,
                        code: metricData.code,
                        category: metricData.category,
                        type: metricData.type,
                        description: metricData.description,
                        scoringCriteria: metricData.scoringCriteria || [],
                        weight: metricData.weight || 0,
                        departmentIds: metricData.departmentIds || [],
                        positionIds: metricData.positionIds || [],
                        applicableLevels: metricData.applicableLevels || ['senior', 'intermediate', 'junior', 'assistant'],
                        minValue: metricData.minValue || 0,
                        maxValue: metricData.maxValue || 100,
                        status: 'active'
                    };
                    await metricLibrary_model_1.MetricLibraryModel.createMetric(metric);
                    results.success++;
                }
                catch (error) {
                    results.failed++;
                    results.errors.push(`${metricData.name}: ${error.message}`);
                }
            }
            res.json({
                success: true,
                data: results,
                message: `导入完成：成功${results.success}个，失败${results.failed}个`
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 导出指标
    exportMetrics: async (_req, res) => {
        try {
            const metrics = await metricLibrary_model_1.MetricLibraryModel.findAllMetrics();
            // 转换为CSV格式
            const headers = ['编码', '名称', '分类', '类型', '权重', '描述', '状态'];
            const rows = metrics.map(m => [
                m.code,
                m.name,
                m.category,
                m.type,
                m.weight,
                m.description,
                m.status
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=metrics.csv');
            res.send(csv);
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // ============ 指标模板管理 ============
    // 获取所有模板
    getAllTemplates: async (_req, res) => {
        try {
            const templates = await metricLibrary_model_1.MetricLibraryModel.findAllTemplates();
            res.json({ success: true, data: templates });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 根据岗位获取模板
    getTemplateByPosition: async (req, res) => {
        try {
            const positionId = req.params.positionId;
            const template = await metricLibrary_model_1.MetricLibraryModel.findTemplateByPosition(positionId);
            if (!template) {
                return res.status(404).json({ success: false, error: '该岗位暂无指标模板' });
            }
            res.json({ success: true, data: template });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 创建模板
    createTemplate: async (req, res) => {
        try {
            const { name, description, positionId, metrics } = req.body;
            if (!name || !metrics || !Array.isArray(metrics)) {
                return res.status(400).json({
                    success: false,
                    error: '模板名称和指标列表不能为空'
                });
            }
            // 验证权重总和
            const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
            if (totalWeight !== 100) {
                return res.status(400).json({
                    success: false,
                    error: `指标权重总和必须等于100%，当前为${totalWeight}%`
                });
            }
            const template = {
                id: `template-${Date.now()}`,
                name,
                description,
                positionId,
                metrics,
                status: 'active'
            };
            const newTemplate = await metricLibrary_model_1.MetricLibraryModel.createTemplate(template);
            res.status(201).json({ success: true, data: newTemplate });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 初始化默认指标
    initializeDefaultMetrics: async (_req, res) => {
        try {
            await metricLibrary_model_1.MetricLibraryModel.initializeDefaultMetrics();
            res.json({ success: true, message: '默认指标初始化完成' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};
//# sourceMappingURL=metricLibrary.controller.js.map