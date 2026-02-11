"use strict";
/**
 * 内存数据库实现 - 用于开发和演示模式
 * 提供完整的CRUD操作模拟
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemoryDBStats = exports.clearMemoryDB = exports.initMemoryDB = exports.memoryQuery = exports.memoryDB = exports.memoryStore = void 0;
const logger_1 = __importDefault(require("./logger"));
exports.memoryStore = {
    employees: new Map(),
    performanceRecords: new Map(),
    peerReviews: new Map(),
    quarterlySummaries: new Map(),
    promotionRequests: new Map(),
    departments: new Map(),
    positions: new Map(),
    assessmentCycles: new Map(),
    holidays: new Map(),
    performanceMetrics: new Map(),
    metricTemplates: new Map(),
    strategicObjectives: new Map(),
    objectives: new Map(),
    keyResults: new Map(),
    kpiAssignments: new Map(),
    performanceContracts: new Map(),
    monthlyReports: new Map(),
    performanceInterviews: new Map(),
    okrAssignments: new Map(),
    attachments: new Map(),
    peerReviewCycles: new Map(),
    peerReviewTasks: new Map(),
    bonusConfig: new Map(),
    bonusResults: new Map(),
};
// 员工数据操作
const employeeOperations = {
    findById: (id) => {
        return exports.memoryStore.employees.get(id);
    },
    findByName: (name) => {
        return Array.from(exports.memoryStore.employees.values()).find(emp => emp.name === name);
    },
    findAll: () => {
        return Array.from(exports.memoryStore.employees.values());
    },
    findByRole: (role) => {
        return Array.from(exports.memoryStore.employees.values()).filter(emp => emp.role === role);
    },
    findByManagerId: (managerId) => {
        return Array.from(exports.memoryStore.employees.values()).filter(emp => emp.managerId === managerId);
    },
    findByDepartment: (department) => {
        return Array.from(exports.memoryStore.employees.values()).filter(emp => emp.department === department || emp.subDepartment === department);
    },
    create: (employee) => {
        exports.memoryStore.employees.set(employee.id, employee);
        return employee;
    },
    update: (id, updates) => {
        const existing = exports.memoryStore.employees.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...updates };
        exports.memoryStore.employees.set(id, updated);
        return updated;
    },
    delete: (id) => {
        return exports.memoryStore.employees.delete(id);
    },
    batchInsert: (employees) => {
        employees.forEach(emp => {
            exports.memoryStore.employees.set(emp.id, emp);
        });
    },
};
// 绩效记录数据操作
const performanceRecordOperations = {
    findById: (id) => {
        return exports.memoryStore.performanceRecords.get(id);
    },
    findByEmployeeId: (employeeId) => {
        return Array.from(exports.memoryStore.performanceRecords.values())
            .filter(record => record.employeeId === employeeId)
            .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    },
    findByMonth: (month) => {
        return Array.from(exports.memoryStore.performanceRecords.values())
            .filter(record => record.month === month);
    },
    findAll: () => {
        return Array.from(exports.memoryStore.performanceRecords.values());
    },
    create: (record) => {
        exports.memoryStore.performanceRecords.set(record.id, record);
        return record;
    },
    update: (id, updates) => {
        const existing = exports.memoryStore.performanceRecords.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        exports.memoryStore.performanceRecords.set(id, updated);
        return updated;
    },
    delete: (id) => {
        return exports.memoryStore.performanceRecords.delete(id);
    },
};
// 互评记录数据操作
const peerReviewOperations = {
    findById: (id) => {
        return exports.memoryStore.peerReviews.get(id);
    },
    findByReviewerId: (reviewerId) => {
        return Array.from(exports.memoryStore.peerReviews.values())
            .filter(review => review.reviewerId === reviewerId);
    },
    findByRevieweeId: (revieweeId) => {
        return Array.from(exports.memoryStore.peerReviews.values())
            .filter(review => review.revieweeId === revieweeId);
    },
    findByRecordId: (recordId) => {
        return Array.from(exports.memoryStore.peerReviews.values())
            .filter(review => review.recordId === recordId);
    },
    create: (review) => {
        exports.memoryStore.peerReviews.set(review.id, review);
        return review;
    },
    update: (id, updates) => {
        const existing = exports.memoryStore.peerReviews.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        exports.memoryStore.peerReviews.set(id, updated);
        return updated;
    },
    delete: (id) => {
        return exports.memoryStore.peerReviews.delete(id);
    },
};
// 经理季度总结数据操作
const quarterlySummaryOperations = {
    findById: (id) => {
        return exports.memoryStore.quarterlySummaries.get(id);
    },
    findByManagerId: (managerId) => {
        return Array.from(exports.memoryStore.quarterlySummaries.values())
            .filter(summary => summary.managerId === managerId)
            .sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
        });
    },
    findAll: () => {
        return Array.from(exports.memoryStore.quarterlySummaries.values());
    },
    create: (summary) => {
        exports.memoryStore.quarterlySummaries.set(summary.id, summary);
        return summary;
    },
    update: (id, updates) => {
        const existing = exports.memoryStore.quarterlySummaries.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        exports.memoryStore.quarterlySummaries.set(id, updated);
        return updated;
    },
    delete: (id) => {
        return exports.memoryStore.quarterlySummaries.delete(id);
    },
};
// 晋升/加薪申请数据操作
const promotionRequestOperations = {
    findById: (id) => {
        return exports.memoryStore.promotionRequests.get(id);
    },
    findByEmployeeId: (employeeId) => {
        return Array.from(exports.memoryStore.promotionRequests.values())
            .filter(req => req.employeeId === employeeId)
            .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    },
    findByRequesterId: (requesterId) => {
        return Array.from(exports.memoryStore.promotionRequests.values())
            .filter(req => req.requesterId === requesterId)
            .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    },
    findAll: () => {
        return Array.from(exports.memoryStore.promotionRequests.values());
    },
    create: (request) => {
        exports.memoryStore.promotionRequests.set(request.id, request);
        return request;
    },
    update: (id, updates) => {
        const existing = exports.memoryStore.promotionRequests.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        exports.memoryStore.promotionRequests.set(id, updated);
        return updated;
    },
    delete: (id) => {
        return exports.memoryStore.promotionRequests.delete(id);
    },
};
// 内存数据库接口
exports.memoryDB = {
    employees: employeeOperations,
    performanceRecords: performanceRecordOperations,
    peerReviews: peerReviewOperations,
    quarterlySummaries: quarterlySummaryOperations,
    promotionRequests: promotionRequestOperations,
};
// 初始化内存数据库
const memoryQuery = async (sql, params) => {
    logger_1.default.info(`📦 Memory DB query: ${sql} ${params}`);
    if (sql.includes('SELECT') && sql.includes('employees')) {
        if (sql.includes('WHERE id = ?')) {
            const employee = exports.memoryStore.employees.get(params?.[0]);
            return employee ? [employee] : [];
        }
        if (sql.includes('WHERE role = ?')) {
            return Array.from(exports.memoryStore.employees.values()).filter(emp => emp.role === params?.[0]);
        }
        if (sql.includes('WHERE department = ?')) {
            return Array.from(exports.memoryStore.employees.values()).filter(emp => emp.department === params?.[0]);
        }
        return Array.from(exports.memoryStore.employees.values());
    }
    if (sql.includes('SELECT') && sql.includes('performance')) {
        return Array.from(exports.memoryStore.performanceRecords.values());
    }
    logger_1.default.info(`⚠️ Unsupported memory database query: ${sql}`);
    return [];
};
exports.memoryQuery = memoryQuery;
const initMemoryDB = () => {
    // 如果已有数据（被其他入口初始化过），不再清空
    if (exports.memoryStore.employees.size > 0) {
        logger_1.default.info(`📦 内存数据库已有 ${exports.memoryStore.employees.size} 条员工数据，跳过重新初始化`);
        return;
    }
    logger_1.default.info('📦 初始化内存数据库...');
    // 清空现有数据
    exports.memoryStore.employees.clear();
    exports.memoryStore.performanceRecords.clear();
    exports.memoryStore.peerReviews.clear();
    exports.memoryStore.quarterlySummaries.clear();
    exports.memoryStore.promotionRequests.clear();
    exports.memoryStore.departments.clear();
    exports.memoryStore.positions.clear();
    exports.memoryStore.assessmentCycles.clear();
    exports.memoryStore.holidays.clear();
    exports.memoryStore.performanceMetrics.clear();
    exports.memoryStore.metricTemplates.clear();
    exports.memoryStore.strategicObjectives.clear();
    exports.memoryStore.objectives.clear();
    exports.memoryStore.keyResults.clear();
    exports.memoryStore.kpiAssignments.clear();
    exports.memoryStore.performanceContracts.clear();
    exports.memoryStore.monthlyReports.clear();
    exports.memoryStore.performanceInterviews.clear();
    exports.memoryStore.okrAssignments.clear();
    exports.memoryStore.attachments.clear();
    exports.memoryStore.peerReviewCycles.clear();
    exports.memoryStore.peerReviewTasks.clear();
    exports.memoryStore.bonusConfig.clear();
    exports.memoryStore.bonusResults.clear();
    // 初始化默认部门
    const defaultDepts = [
        { id: 'dept-1', name: '总公司', code: 'HQ', sortOrder: 0, status: 'active' },
        { id: 'dept-2', name: '技术部', code: 'TECH', parentId: 'dept-1', sortOrder: 1, status: 'active' },
        { id: 'dept-3', name: '市场部', code: 'MKT', parentId: 'dept-1', sortOrder: 2, status: 'active' },
        { id: 'dept-4', name: '人力资源部', code: 'HR', parentId: 'dept-1', sortOrder: 3, status: 'active' },
        { id: 'dept-5', name: '财务部', code: 'FIN', parentId: 'dept-1', sortOrder: 4, status: 'active' },
    ];
    defaultDepts.forEach(d => exports.memoryStore.departments.set(d.id, d));
    // 初始化默认奖金配置
    exports.memoryStore.bonusConfig.set('default', {
        id: 'default',
        rules: [
            { grade: 'A+', coefficient: 2.0, label: '卓越', minScore: 95 },
            { grade: 'A', coefficient: 1.5, label: '优秀', minScore: 85 },
            { grade: 'B+', coefficient: 1.2, label: '良好', minScore: 75 },
            { grade: 'B', coefficient: 1.0, label: '合格', minScore: 60 },
            { grade: 'C', coefficient: 0.5, label: '待改进', minScore: 40 },
            { grade: 'D', coefficient: 0, label: '不合格', minScore: 0 },
        ],
        updatedBy: 'system',
        updatedAt: new Date().toISOString(),
    });
    logger_1.default.info('✅ 内存数据库已初始化');
};
exports.initMemoryDB = initMemoryDB;
// 清空所有数据（用于测试）
const clearMemoryDB = () => {
    exports.memoryStore.employees.clear();
    exports.memoryStore.performanceRecords.clear();
    exports.memoryStore.peerReviews.clear();
    exports.memoryStore.quarterlySummaries.clear();
    exports.memoryStore.promotionRequests.clear();
    exports.memoryStore.departments.clear();
    exports.memoryStore.positions.clear();
    exports.memoryStore.assessmentCycles.clear();
    exports.memoryStore.holidays.clear();
    exports.memoryStore.performanceMetrics.clear();
    exports.memoryStore.metricTemplates.clear();
    exports.memoryStore.strategicObjectives.clear();
    exports.memoryStore.objectives.clear();
    exports.memoryStore.keyResults.clear();
    exports.memoryStore.kpiAssignments.clear();
    exports.memoryStore.performanceContracts.clear();
    exports.memoryStore.monthlyReports.clear();
    exports.memoryStore.performanceInterviews.clear();
    exports.memoryStore.okrAssignments.clear();
    exports.memoryStore.attachments.clear();
    exports.memoryStore.peerReviewCycles.clear();
    exports.memoryStore.peerReviewTasks.clear();
    exports.memoryStore.bonusConfig.clear();
    exports.memoryStore.bonusResults.clear();
};
exports.clearMemoryDB = clearMemoryDB;
// 获取统计信息
const getMemoryDBStats = () => {
    return {
        employees: exports.memoryStore.employees.size,
        performanceRecords: exports.memoryStore.performanceRecords.size,
        peerReviews: exports.memoryStore.peerReviews.size,
        quarterlySummaries: exports.memoryStore.quarterlySummaries.size,
        promotionRequests: exports.memoryStore.promotionRequests.size,
        departments: exports.memoryStore.departments.size,
        positions: exports.memoryStore.positions.size,
        assessmentCycles: exports.memoryStore.assessmentCycles.size,
        holidays: exports.memoryStore.holidays.size,
        performanceMetrics: exports.memoryStore.performanceMetrics.size,
        metricTemplates: exports.memoryStore.metricTemplates.size,
        strategicObjectives: exports.memoryStore.strategicObjectives.size,
        objectives: exports.memoryStore.objectives.size,
        keyResults: exports.memoryStore.keyResults.size,
        kpiAssignments: exports.memoryStore.kpiAssignments.size,
        performanceContracts: exports.memoryStore.performanceContracts.size,
        monthlyReports: exports.memoryStore.monthlyReports.size,
        performanceInterviews: exports.memoryStore.performanceInterviews.size,
        okrAssignments: exports.memoryStore.okrAssignments.size,
        attachments: exports.memoryStore.attachments.size,
        peerReviewCycles: exports.memoryStore.peerReviewCycles.size,
        peerReviewTasks: exports.memoryStore.peerReviewTasks.size,
        bonusConfig: exports.memoryStore.bonusConfig.size,
        bonusResults: exports.memoryStore.bonusResults.size,
    };
};
exports.getMemoryDBStats = getMemoryDBStats;
//# sourceMappingURL=memory-db.js.map