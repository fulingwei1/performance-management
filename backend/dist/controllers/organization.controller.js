"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationController = void 0;
const organization_model_1 = require("../models/organization.model");
// 生成唯一ID
const generateId = () => `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
exports.organizationController = {
    // ============ 部门管理 ============
    // 获取部门树
    getDepartmentTree: async (_req, res) => {
        try {
            const departments = await organization_model_1.OrganizationModel.getDepartmentTree();
            res.json({ success: true, data: departments });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 获取所有部门（扁平列表）
    getAllDepartments: async (_req, res) => {
        try {
            const departments = await organization_model_1.OrganizationModel.findAllDepartments();
            res.json({ success: true, data: departments });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 根据ID获取部门
    getDepartmentById: async (req, res) => {
        try {
            const id = req.params.id;
            const department = await organization_model_1.OrganizationModel.findDepartmentById(id);
            if (!department) {
                return res.status(404).json({ success: false, error: '部门不存在' });
            }
            res.json({ success: true, data: department });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 创建部门
    createDepartment: async (req, res) => {
        try {
            const { name, code, parentId, managerId, sortOrder = 0 } = req.body;
            if (!name || !code) {
                return res.status(400).json({ success: false, error: '部门名称和编码不能为空' });
            }
            const department = {
                id: generateId(),
                name,
                code,
                parentId,
                managerId,
                sortOrder,
                status: 'active'
            };
            const newDept = await organization_model_1.OrganizationModel.createDepartment(department);
            res.status(201).json({ success: true, data: newDept });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 更新部门
    updateDepartment: async (req, res) => {
        try {
            const id = req.params.id;
            const updates = req.body;
            const department = await organization_model_1.OrganizationModel.updateDepartment(id, updates);
            if (!department) {
                return res.status(404).json({ success: false, error: '部门不存在' });
            }
            res.json({ success: true, data: department });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 删除部门
    deleteDepartment: async (req, res) => {
        try {
            const id = req.params.id;
            const success = await organization_model_1.OrganizationModel.deleteDepartment(id);
            if (!success) {
                return res.status(404).json({ success: false, error: '部门不存在' });
            }
            res.json({ success: true, message: '部门已删除' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // ============ 岗位管理 ============
    // 获取所有岗位
    getAllPositions: async (_req, res) => {
        try {
            const positions = await organization_model_1.OrganizationModel.findAllPositions();
            res.json({ success: true, data: positions });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 根据部门获取岗位
    getPositionsByDepartment: async (req, res) => {
        try {
            const departmentId = req.params.departmentId;
            const positions = await organization_model_1.OrganizationModel.findPositionsByDepartment(departmentId);
            res.json({ success: true, data: positions });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 创建岗位
    createPosition: async (req, res) => {
        try {
            const { name, code, departmentId, level, category, description, requirements } = req.body;
            if (!name || !code || !departmentId) {
                return res.status(400).json({ success: false, error: '岗位名称、编码和所属部门不能为空' });
            }
            const position = {
                id: generateId(),
                name,
                code,
                departmentId,
                level: level || 'intermediate',
                category: category || 'technical',
                description,
                requirements,
                status: 'active'
            };
            const newPos = await organization_model_1.OrganizationModel.createPosition(position);
            res.status(201).json({ success: true, data: newPos });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 更新岗位
    updatePosition: async (req, res) => {
        try {
            const id = req.params.id;
            const updates = req.body;
            const position = await organization_model_1.OrganizationModel.updatePosition(id, updates);
            if (!position) {
                return res.status(404).json({ success: false, error: '岗位不存在' });
            }
            res.json({ success: true, data: position });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 删除岗位
    deletePosition: async (req, res) => {
        try {
            const id = req.params.id;
            const success = await organization_model_1.OrganizationModel.deletePosition(id);
            if (!success) {
                return res.status(404).json({ success: false, error: '岗位不存在' });
            }
            res.json({ success: true, message: '岗位已删除' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // 获取组织架构树
    getOrgTree: async (_req, res) => {
        try {
            const departments = await organization_model_1.OrganizationModel.getDepartmentTree();
            const positions = await organization_model_1.OrganizationModel.findAllPositions();
            // 构建完整的组织架构树
            const buildTree = (depts) => {
                return depts.map(dept => {
                    const deptPositions = positions.filter(p => p.departmentId === dept.id);
                    return {
                        ...dept,
                        positions: deptPositions,
                        children: dept.children ? buildTree(dept.children) : []
                    };
                });
            };
            const orgTree = buildTree(departments);
            res.json({ success: true, data: orgTree });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};
//# sourceMappingURL=organization.controller.js.map