import { query, transaction, USE_MEMORY_DB, memoryDB, memoryStore } from '../config/database';
import { EmployeeModel } from './employee.model';
import type { PeerReview } from '../types';
import logger from '../config/logger';

// 全局存储peerReviews数据
const globalPeerReviews = new Map<string, PeerReview>();

export class PeerReviewModel {
  // 创建360度评价记录
  static async create(data: Omit<PeerReview, 'id' | 'createdAt'>): Promise<PeerReview> {
    if (USE_MEMORY_DB) {
      const id = `peer-${data.reviewerId}-${data.revieweeId}-${data.month}`;
      const record: PeerReview = {
        id,
        createdAt: new Date(),
        ...data
      };

      logger.info(`创建记录到内存数据库: ${id}`);

      // 同时存储到memoryStore和全局变量
      memoryStore.peerReviews.set(id, record);
      globalPeerReviews.set(id, record);

      logger.info(`创建结果: 成功，globalPeerReviews总数量: ${globalPeerReviews.size}`);
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
    
    await query(sql, [
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
    const createdRecord: PeerReview = {
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
  static async findById(id: string): Promise<PeerReview | null> {
    if (USE_MEMORY_DB) {
      const store = memoryStore as any;
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
    
    const results = await query(sql, [id]) as PeerReview[];
    return results.length > 0 ? results[0] : null;
  }
  
  // 获取某员工在某月的360度评价记录（作为被评价人）
  static async findByReviewee(revieweeId: string, month: string): Promise<PeerReview[]> {
    if (USE_MEMORY_DB) {
      const store = memoryStore as any;
      const allReviews = Object.values(store.peerReviews) as PeerReview[];
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
    
    const results = await query(sql, [revieweeId, month]) as PeerReview[];
    return results;
  }
  
  // 获取某员工在某月的360度评价任务（作为评价人）
  static async findByReviewer(reviewerId: string, month: string): Promise<PeerReview[]> {
    if (USE_MEMORY_DB) {
      const store = memoryStore as any;
      const allReviews = Array.from(store.peerReviews.values()) as PeerReview[];

      logger.info(`查询reviewerId: ${reviewerId} ${'month:'} ${month}`);
      logger.info(`allReviews数量: ${allReviews.length}`);
      const filtered = allReviews.filter(r => r.reviewerId === reviewerId && r.month === month);
      logger.info(`过滤后数量: ${filtered.length}`);

      // 同时从globalPeerReviews查询
      const globalReviews = Array.from(globalPeerReviews.values()).filter(r => r.reviewerId === reviewerId && r.month === month);
      logger.info(`globalPeerReviews数量: ${globalReviews.length}`);

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
    
    const results = await query(sql, [reviewerId, month]) as PeerReview[];
    return results;
  }
  
  // 获取某部门某月的所有360度评价记录
  static async findByDepartment(department: string, month: string): Promise<PeerReview[]> {
    if (USE_MEMORY_DB) {
      const store = memoryStore as any;
      const allReviews = Object.values(store.peerReviews) as PeerReview[];
      // 需要获取被评价人的部门
      const employeeIds = allReviews.map(r => r.revieweeId);
      const employees = await Promise.all(
        employeeIds.map(id => EmployeeModel.findById(id))
      );
      const deptEmployees = employees.filter(e => e && e.department === department).map(e => e!.id);
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
    
    const results = await query(sql, [department, month]) as PeerReview[];
    return results;
  }
  
  // 更新评价记录
  static async update(id: string, data: Partial<PeerReview>): Promise<PeerReview> {
    if (USE_MEMORY_DB) {
      const store = memoryStore as any;
      const existing = store.peerReviews.get(id);
      if (!existing) {
        // 返回一个默认值而不是null，避免类型错误
        const defaultRecord: PeerReview = {
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
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
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
      const defaultRecord: PeerReview = {
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
    
    await query(sql, updateValues);
    
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
    
    const results = await query(sql2, [id]) as PeerReview[];
    if (results.length === 0) {
      const defaultRecord: PeerReview = {
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
  static async delete(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      const store = memoryStore as any;
      return store.peerReviews.delete(id);
    }
    
    const sql = 'DELETE FROM peer_reviews WHERE id = ?';
    await query(sql, [id]);
    return true;
  }
  
  // 随机分配360度评价任务
  static async allocatePeerReviews(department: string, month: string): Promise<PeerReview[]> {
    logger.info(`分配360度评价任务 - 部门: ${department} ${'月份:'} ${month}`);

    // 获取部门所有员工
    const allEmployees = await EmployeeModel.findByDepartment(department);
    logger.info(`找到的员工数量: ${allEmployees.length}`);
    logger.info(`员工列表: ${allEmployees.map(e => ({ id: e.id, name: e.name, subDepartment: e.subDepartment, role: e.role }))}`);

    // 只分配员工角色，不包括经理
    const employees = allEmployees.filter(e => e.role === 'employee');
    logger.info(`筛选后的员工数量: ${employees.length}`);

    if (employees.length < 2) {
      logger.info('员工数量不足2人，跳过分配');
      return []; // 至少需要2人才能进行360度评价
    }

    // 为每个员工分配2个评价人
    const allocations: PeerReview[] = [];

    for (const employee of employees) {
      // 获取其他员工（不包括自己）
      const otherEmployees = employees.filter(e => e.id !== employee.id);

      // 如果只有1个其他员工，就分配他作为评价人
      if (otherEmployees.length === 1) {
        const reviewer = otherEmployees[0];

        // 检查是否已经分配过
        const existing = await this.findExistingAllocation(
          reviewer.id,
          employee.id,
          month
        );

        if (!existing) {
          const record: PeerReview = {
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
      } else if (otherEmployees.length >= 2) {
        // 随机选择2个评价人
        const shuffled = [...otherEmployees].sort(() => Math.random() - 0.5);
        const reviewers = shuffled.slice(0, 2);

        for (const reviewer of reviewers) {
          // 检查是否已经分配过
          const existing = await this.findExistingAllocation(
            reviewer.id,
            employee.id,
            month
          );

          if (!existing) {
            const record: PeerReview = {
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

            logger.info(`创建评价记录: ${record.id} ${'评价人:'} ${reviewer.id} ${'被评价人:'} ${employee.id}`);
            await this.create(record);
            allocations.push(record);
          }
        }
      }
    }

    logger.info(`分配完成，共分配: ${allocations.length}`);
    return allocations;
  }
  
  // 检查是否已经存在分配
  private static async findExistingAllocation(
    reviewerId: string,
    revieweeId: string,
    month: string
  ): Promise<PeerReview | null> {
    const id = `peer-${reviewerId}-${revieweeId}-${month}`;
    return this.findById(id);
  }
}
