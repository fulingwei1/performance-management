"use strict";
/**
 * 内存数据库实现 - 用于开发和演示模式
 * 提供完整的CRUD操作模拟
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemoryDBStats = exports.clearMemoryDB = exports.initMemoryDB = exports.memoryDB = exports.memoryStore = void 0;
exports.memoryStore = {
    employees: new Map(),
    performanceRecords: new Map(),
    peerReviews: new Map(),
    departments: new Map(),
    positions: new Map(),
    assessmentCycles: new Map(),
    holidays: new Map(),
    performanceMetrics: new Map(),
    metricTemplates: new Map(),
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
// 内存数据库接口
exports.memoryDB = {
    employees: employeeOperations,
    performanceRecords: performanceRecordOperations,
    peerReviews: peerReviewOperations,
};
// 初始化内存数据库
const initMemoryDB = () => {
    console.log('📦 初始化内存数据库...');
    // 清空现有数据
    exports.memoryStore.employees.clear();
    exports.memoryStore.performanceRecords.clear();
    exports.memoryStore.peerReviews.clear();
    exports.memoryStore.departments.clear();
    exports.memoryStore.positions.clear();
    exports.memoryStore.assessmentCycles.clear();
    exports.memoryStore.holidays.clear();
    exports.memoryStore.performanceMetrics.clear();
    exports.memoryStore.metricTemplates.clear();
    console.log('✅ 内存数据库已初始化');
};
exports.initMemoryDB = initMemoryDB;
// 清空所有数据（用于测试）
const clearMemoryDB = () => {
    exports.memoryStore.employees.clear();
    exports.memoryStore.performanceRecords.clear();
    exports.memoryStore.peerReviews.clear();
    exports.memoryStore.departments.clear();
    exports.memoryStore.positions.clear();
    exports.memoryStore.assessmentCycles.clear();
    exports.memoryStore.holidays.clear();
    exports.memoryStore.performanceMetrics.clear();
    exports.memoryStore.metricTemplates.clear();
};
exports.clearMemoryDB = clearMemoryDB;
// 获取统计信息
const getMemoryDBStats = () => {
    return {
        employees: exports.memoryStore.employees.size,
        performanceRecords: exports.memoryStore.performanceRecords.size,
        peerReviews: exports.memoryStore.peerReviews.size,
        departments: exports.memoryStore.departments.size,
        positions: exports.memoryStore.positions.size,
        assessmentCycles: exports.memoryStore.assessmentCycles.size,
        holidays: exports.memoryStore.holidays.size,
        performanceMetrics: exports.memoryStore.performanceMetrics.size,
        metricTemplates: exports.memoryStore.metricTemplates.size,
    };
};
exports.getMemoryDBStats = getMemoryDBStats;
//# sourceMappingURL=memory-db.js.map