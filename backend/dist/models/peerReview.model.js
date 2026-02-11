"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerReviewModel = void 0;
const database_1 = require("../config/database");
const employee_model_1 = require("./employee.model");
const logger_1 = __importDefault(require("../config/logger"));
// 全局存储peerReviews数据
const globalPeerReviews = new Map();
class PeerReviewModel {
    // 创建360度评价记录
    static async create(data) {
        if (database_1.USE_MEMORY_DB) {
            const id = `peer-${data.reviewerId}-${data.revieweeId}-${data.month}`;
            const record = {
                id,
                createdAt: new Date(),
                ...data
            };
            logger_1.default.info(`创建记录到内存数据库: ${id}`);
            // 同时存储到memoryStore和全局变量
            database_1.memoryStore.peerReviews.set(id, record);
            globalPeerReviews.set(id, record);
            logger_1.default.info(`创建结果: 成功，globalPeerReviews总数量: ${globalPeerReviews.size}`);
            return record;
        }
        const id = `peer-${data.reviewerId}-${data.revieweeId}-${data.month}`;
        const sql = `
      INSERT INTO peer_reviews (
        id, reviewer_id, reviewer_name, reviewee_id, reviewee_name, 
        record_id, collaboration, professionalism, communication, 
        comment, month, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        await (0, database_1.query)(sql, [
            id,
            data.reviewerId,
            data.reviewerName,
            data.revieweeId,
            data.revieweeName,
            data.recordId,
            data.collaboration,
            data.professionalism,
            data.communication,
            data.comment,
            data.month,
            new Date()
        ]);
        // 直接返回创建的记录，避免null类型问题
        const createdRecord = {
            id,
            reviewerId: data.reviewerId,
            reviewerName: data.reviewerName,
            revieweeId: data.revieweeId,
            revieweeName: data.revieweeName,
            recordId: data.recordId,
            collaboration: data.collaboration,
            professionalism: data.professionalism,
            communication: data.communication,
            comment: data.comment,
            month: data.month,
            createdAt: new Date()
        };
        return createdRecord;
    }
    // 根据ID查找记录
    static async findById(id) {
        if (database_1.USE_MEMORY_DB) {
            const store = database_1.memoryStore;
            return store.peerReviews.get(id) || null;
        }
        const sql = `
      SELECT 
        id,
        reviewer_id as reviewerId,
        reviewer_name as reviewerName,
        reviewee_id as revieweeId,
        reviewee_name as revieweeName,
        record_id as recordId,
        collaboration,
        professionalism,
        communication,
        comment,
        month,
        created_at as createdAt
      FROM peer_reviews
      WHERE id = ?
    `;
        const results = await (0, database_1.query)(sql, [id]);
        return results.length > 0 ? results[0] : null;
    }
    // 获取某员工在某月的360度评价记录（作为被评价人）
    static async findByReviewee(revieweeId, month) {
        if (database_1.USE_MEMORY_DB) {
            const store = database_1.memoryStore;
            const allReviews = Object.values(store.peerReviews);
            return allReviews.filter(r => r.revieweeId === revieweeId && r.month === month);
        }
        const sql = `
      SELECT 
        id,
        reviewer_id as reviewerId,
        reviewer_name as reviewerName,
        reviewee_id as revieweeId,
        reviewee_name as revieweeName,
        record_id as recordId,
        collaboration,
        professionalism,
        communication,
        comment,
        month,
        created_at as createdAt
      FROM peer_reviews
      WHERE reviewee_id = ? AND month = ?
      ORDER BY created_at DESC
    `;
        const results = await (0, database_1.query)(sql, [revieweeId, month]);
        return results;
    }
    // 获取某员工在某月的360度评价任务（作为评价人）
    static async findByReviewer(reviewerId, month) {
        if (database_1.USE_MEMORY_DB) {
            const store = database_1.memoryStore;
            const allReviews = Array.from(store.peerReviews.values());
            logger_1.default.info(`查询reviewerId: ${reviewerId} ${'month:'} ${month}`);
            logger_1.default.info(`allReviews数量: ${allReviews.length}`);
            const filtered = allReviews.filter(r => r.reviewerId === reviewerId && r.month === month);
            logger_1.default.info(`过滤后数量: ${filtered.length}`);
            // 同时从globalPeerReviews查询
            const globalReviews = Array.from(globalPeerReviews.values()).filter(r => r.reviewerId === reviewerId && r.month === month);
            logger_1.default.info(`globalPeerReviews数量: ${globalReviews.length}`);
            return filtered.length > 0 ? filtered : globalReviews;
        }
        const sql = `
      SELECT 
        id,
        reviewer_id as reviewerId,
        reviewer_name as reviewerName,
        reviewee_id as revieweeId,
        reviewee_name as revieweeName,
        record_id as recordId,
        collaboration,
        professionalism,
        communication,
        comment,
        month,
        created_at as createdAt
      FROM peer_reviews
      WHERE reviewer_id = ? AND month = ?
      ORDER BY created_at DESC
    `;
        const results = await (0, database_1.query)(sql, [reviewerId, month]);
        return results;
    }
    // 获取某部门某月的所有360度评价记录
    static async findByDepartment(department, month) {
        if (database_1.USE_MEMORY_DB) {
            const store = database_1.memoryStore;
            const allReviews = Object.values(store.peerReviews);
            // 需要获取被评价人的部门
            const employeeIds = allReviews.map(r => r.revieweeId);
            const employees = await Promise.all(employeeIds.map(id => employee_model_1.EmployeeModel.findById(id)));
            const deptEmployees = employees.filter(e => e && e.department === department).map(e => e.id);
            return allReviews.filter(r => deptEmployees.includes(r.revieweeId));
        }
        const sql = `
      SELECT 
        pr.id,
        pr.reviewer_id as reviewerId,
        pr.reviewer_name as reviewerName,
        pr.reviewee_id as revieweeId,
        pr.reviewee_name as revieweeName,
        pr.record_id as recordId,
        pr.collaboration,
        pr.professionalism,
        pr.communication,
        pr.comment,
        pr.month,
        pr.created_at as createdAt
      FROM peer_reviews pr
      JOIN employees e ON pr.reviewee_id = e.id
      WHERE e.department = ? AND pr.month = ?
      ORDER BY pr.created_at DESC
    `;
        const results = await (0, database_1.query)(sql, [department, month]);
        return results;
    }
    // 更新评价记录
    static async update(id, data) {
        if (database_1.USE_MEMORY_DB) {
            const store = database_1.memoryStore;
            const existing = store.peerReviews.get(id);
            if (!existing) {
                // 返回一个默认值而不是null，避免类型错误
                const defaultRecord = {
                    id,
                    reviewerId: '',
                    reviewerName: '',
                    revieweeId: '',
                    revieweeName: '',
                    recordId: '',
                    collaboration: 1,
                    professionalism: 1,
                    communication: 1,
                    comment: '',
                    month: '',
                    createdAt: new Date()
                };
                return defaultRecord;
            }
            const updated = { ...existing, ...data };
            store.peerReviews.set(id, updated);
            return updated;
        }
        const updateFields = [];
        const updateValues = [];
        if (data.collaboration !== undefined) {
            updateFields.push('collaboration = ?');
            updateValues.push(data.collaboration);
        }
        if (data.professionalism !== undefined) {
            updateFields.push('professionalism = ?');
            updateValues.push(data.professionalism);
        }
        if (data.communication !== undefined) {
            updateFields.push('communication = ?');
            updateValues.push(data.communication);
        }
        if (data.comment !== undefined) {
            updateFields.push('comment = ?');
            updateValues.push(data.comment);
        }
        if (updateFields.length === 0) {
            // 返回一个默认值
            const defaultRecord = {
                id,
                reviewerId: '',
                reviewerName: '',
                revieweeId: '',
                revieweeName: '',
                recordId: '',
                collaboration: 1,
                professionalism: 1,
                communication: 1,
                comment: '',
                month: '',
                createdAt: new Date()
            };
            return defaultRecord;
        }
        updateValues.push(id);
        const sql = `
      UPDATE peer_reviews
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
        await (0, database_1.query)(sql, updateValues);
        // 直接查询返回的记录
        const sql2 = `
      SELECT 
        id,
        reviewer_id as reviewerId,
        reviewer_name as reviewerName,
        reviewee_id as revieweeId,
        reviewee_name as revieweeName,
        record_id as recordId,
        collaboration,
        professionalism,
        communication,
        comment,
        month,
        created_at as createdAt
      FROM peer_reviews
      WHERE id = ?
    `;
        const results = await (0, database_1.query)(sql2, [id]);
        if (results.length === 0) {
            const defaultRecord = {
                id,
                reviewerId: '',
                reviewerName: '',
                revieweeId: '',
                revieweeName: '',
                recordId: '',
                collaboration: 1,
                professionalism: 1,
                communication: 1,
                comment: '',
                month: '',
                createdAt: new Date()
            };
            return defaultRecord;
        }
        return results[0];
    }
    // 删除评价记录
    static async delete(id) {
        if (database_1.USE_MEMORY_DB) {
            const store = database_1.memoryStore;
            return store.peerReviews.delete(id);
        }
        const sql = 'DELETE FROM peer_reviews WHERE id = ?';
        await (0, database_1.query)(sql, [id]);
        return true;
    }
    // 随机分配360度评价任务
    static async allocatePeerReviews(department, month) {
        logger_1.default.info(`分配360度评价任务 - 部门: ${department} ${'月份:'} ${month}`);
        // 获取部门所有员工
        const allEmployees = await employee_model_1.EmployeeModel.findByDepartment(department);
        logger_1.default.info(`找到的员工数量: ${allEmployees.length}`);
        logger_1.default.info(`员工列表: ${allEmployees.map(e => ({ id: e.id, name: e.name, subDepartment: e.subDepartment, role: e.role }))}`);
        // 只分配员工角色，不包括经理
        const employees = allEmployees.filter(e => e.role === 'employee');
        logger_1.default.info(`筛选后的员工数量: ${employees.length}`);
        if (employees.length < 2) {
            logger_1.default.info('员工数量不足2人，跳过分配');
            return []; // 至少需要2人才能进行360度评价
        }
        // 为每个员工分配2个评价人
        const allocations = [];
        for (const employee of employees) {
            // 获取其他员工（不包括自己）
            const otherEmployees = employees.filter(e => e.id !== employee.id);
            // 如果只有1个其他员工，就分配他作为评价人
            if (otherEmployees.length === 1) {
                const reviewer = otherEmployees[0];
                // 检查是否已经分配过
                const existing = await this.findExistingAllocation(reviewer.id, employee.id, month);
                if (!existing) {
                    const record = {
                        id: `peer-${reviewer.id}-${employee.id}-${month}`,
                        reviewerId: reviewer.id,
                        reviewerName: reviewer.name,
                        revieweeId: employee.id,
                        revieweeName: employee.name,
                        recordId: '',
                        collaboration: 1,
                        professionalism: 1,
                        communication: 1,
                        comment: '',
                        month,
                        createdAt: new Date()
                    };
                    await this.create(record);
                    allocations.push(record);
                }
            }
            else if (otherEmployees.length >= 2) {
                // 随机选择2个评价人
                const shuffled = [...otherEmployees].sort(() => Math.random() - 0.5);
                const reviewers = shuffled.slice(0, 2);
                for (const reviewer of reviewers) {
                    // 检查是否已经分配过
                    const existing = await this.findExistingAllocation(reviewer.id, employee.id, month);
                    if (!existing) {
                        const record = {
                            id: `peer-${reviewer.id}-${employee.id}-${month}`,
                            reviewerId: reviewer.id,
                            reviewerName: reviewer.name,
                            revieweeId: employee.id,
                            revieweeName: employee.name,
                            recordId: '',
                            collaboration: 1,
                            professionalism: 1,
                            communication: 1,
                            comment: '',
                            month,
                            createdAt: new Date()
                        };
                        logger_1.default.info(`创建评价记录: ${record.id} ${'评价人:'} ${reviewer.id} ${'被评价人:'} ${employee.id}`);
                        await this.create(record);
                        allocations.push(record);
                    }
                }
            }
        }
        logger_1.default.info(`分配完成，共分配: ${allocations.length}`);
        return allocations;
    }
    // 检查是否已经存在分配
    static async findExistingAllocation(reviewerId, revieweeId, month) {
        const id = `peer-${reviewerId}-${revieweeId}-${month}`;
        return this.findById(id);
    }
}
exports.PeerReviewModel = PeerReviewModel;
//# sourceMappingURL=peerReview.model.js.map