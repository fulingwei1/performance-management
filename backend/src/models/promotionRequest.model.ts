import { query, USE_MEMORY_DB, memoryDB, memoryStore } from '../config/database';
import { PromotionRequest, PromotionRequestStatus, EmployeeRole } from '../types';
import { EmployeeModel } from './employee.model';

export class PromotionRequestModel {
  // 创建申请
  static async create(data: {
    id: string;
    employeeId: string;
    requesterId: string;
    requesterRole: 'employee' | 'manager';
    targetLevel: string;
    targetPosition: string;
    raisePercentage: number;
    performanceSummary: string;
    skillSummary: string;
    competencySummary: string;
    workSummary: string;
    status: PromotionRequestStatus;
    managerComment?: string;
    managerApproverId?: string;
    managerApprovedAt?: Date;
  }): Promise<PromotionRequest> {
    const now = new Date();
    const record: PromotionRequest = {
      id: data.id,
      employeeId: data.employeeId,
      requesterId: data.requesterId,
      requesterRole: data.requesterRole,
      targetLevel: data.targetLevel as PromotionRequest['targetLevel'],
      targetPosition: data.targetPosition,
      raisePercentage: data.raisePercentage,
      performanceSummary: data.performanceSummary,
      skillSummary: data.skillSummary,
      competencySummary: data.competencySummary,
      workSummary: data.workSummary,
      status: data.status,
      managerComment: data.managerComment,
      managerApproverId: data.managerApproverId,
      managerApprovedAt: data.managerApprovedAt,
      createdAt: now,
      updatedAt: now
    };

    if (USE_MEMORY_DB) {
      memoryDB.promotionRequests.create(record);
      return this.enrichRecord(record);
    }

    const sql = `
      INSERT INTO promotion_requests (
        id, employee_id, requester_id, requester_role, target_level, target_position,
        raise_percentage, performance_summary, skill_summary, competency_summary, work_summary,
        status, manager_comment, manager_approver_id, manager_approved_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    await query(sql, [
      record.id,
      record.employeeId,
      record.requesterId,
      record.requesterRole,
      record.targetLevel,
      record.targetPosition,
      record.raisePercentage,
      record.performanceSummary,
      record.skillSummary,
      record.competencySummary,
      record.workSummary,
      record.status,
      record.managerComment || null,
      record.managerApproverId || null,
      record.managerApprovedAt || null
    ]);

    return this.findById(record.id) as Promise<PromotionRequest>;
  }

  // 根据ID查询
  static async findById(id: string): Promise<PromotionRequest | null> {
    if (USE_MEMORY_DB) {
      const record = memoryDB.promotionRequests.findById(id);
      if (!record) return null;
      return this.enrichRecord(record);
    }

    const sql = `
      SELECT 
        pr.*,
        e.name as employeeName,
        e.department,
        e.sub_department as subDepartment,
        e.level as employeeLevel,
        r.name as requesterName
      FROM promotion_requests pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN employees r ON pr.requester_id = r.id
      WHERE pr.id = ?
    `;
    const results = await query(sql, [id]);
    return results.length > 0 ? this.formatRecord(results[0]) : null;
  }

  // 获取我的申请（申请人或本人）
  static async findMyRequests(userId: string): Promise<PromotionRequest[]> {
    if (USE_MEMORY_DB) {
      const records = memoryDB.promotionRequests.findAll()
        .filter(r => r.requesterId === userId || r.employeeId === userId);
      return Promise.all(records.map(r => this.enrichRecord(r)));
    }

    const sql = `
      SELECT 
        pr.*,
        e.name as employeeName,
        e.department,
        e.sub_department as subDepartment,
        e.level as employeeLevel,
        r.name as requesterName
      FROM promotion_requests pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN employees r ON pr.requester_id = r.id
      WHERE pr.requester_id = ? OR pr.employee_id = ?
      ORDER BY pr.created_at DESC
    `;
    const results = await query(sql, [userId, userId]);
    return results.map(this.formatRecord);
  }

  // 获取全部申请
  static async findAll(): Promise<PromotionRequest[]> {
    if (USE_MEMORY_DB) {
      const records = memoryDB.promotionRequests.findAll();
      return Promise.all(records.map(r => this.enrichRecord(r)));
    }

    const sql = `
      SELECT 
        pr.*,
        e.name as employeeName,
        e.department,
        e.sub_department as subDepartment,
        e.level as employeeLevel,
        r.name as requesterName
      FROM promotion_requests pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN employees r ON pr.requester_id = r.id
      ORDER BY pr.created_at DESC
    `;
    const results = await query(sql, []);
    return results.map(this.formatRecord);
  }

  // 审批历史分页
  static async findApprovalHistory(
    role: EmployeeRole,
    userId: string,
    page: number,
    pageSize: number
  ): Promise<{ records: PromotionRequest[]; total: number }> {
    const roleKey = role === 'manager' ? 'manager' : role === 'gm' ? 'gm' : 'hr';
    const where = `${roleKey}_approver_id = ? OR (rejected_by_role = ? AND rejected_by_id = ?)`;
    const params = [userId, roleKey, userId];
    const offset = Math.max(page - 1, 0) * pageSize;

    if (USE_MEMORY_DB) {
      const all = memoryDB.promotionRequests.findAll();
      const filtered = all.filter(r =>
        (r as any)[`${roleKey}ApproverId`] === userId ||
        (r.rejectedByRole === roleKey && r.rejectedById === userId)
      );
      const total = filtered.length;
      const pageRecords = filtered.slice(offset, offset + pageSize);
      const records = await Promise.all(pageRecords.map(r => this.enrichRecord(r)));
      return { records, total };
    }

    const countSql = `SELECT COUNT(*) as count FROM promotion_requests WHERE ${where}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes[0]?.count ?? '0', 10);

    const sql = `
      SELECT 
        pr.*,
        e.name as employeeName,
        e.department,
        e.sub_department as subDepartment,
        e.level as employeeLevel,
        r.name as requesterName
      FROM promotion_requests pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN employees r ON pr.requester_id = r.id
      WHERE ${where}
      ORDER BY pr.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    const results = await query(sql, [...params, pageSize, offset]);
    return { records: results.map(this.formatRecord), total };
  }

  // 经理待审批
  static async findPendingForManager(managerId: string): Promise<PromotionRequest[]> {
    if (USE_MEMORY_DB) {
      const records = memoryDB.promotionRequests.findAll()
        .filter(r => r.status === 'submitted');
      const enriched = await Promise.all(records.map(r => this.enrichRecord(r)));
      return enriched.filter(r => r.employeeId && r.employeeId !== '' && r.employeeId !== null)
        .filter(r => {
          const emp = memoryStore.employees.get(r.employeeId);
          return emp?.managerId === managerId;
        });
    }

    const sql = `
      SELECT 
        pr.*,
        e.name as employeeName,
        e.department,
        e.sub_department as subDepartment,
        e.level as employeeLevel,
        r.name as requesterName
      FROM promotion_requests pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN employees r ON pr.requester_id = r.id
      WHERE pr.status = 'submitted' AND e.manager_id = ?
      ORDER BY pr.created_at DESC
    `;
    const results = await query(sql, [managerId]);
    return results.map(this.formatRecord);
  }

  // 总经理待审批
  static async findPendingForGM(): Promise<PromotionRequest[]> {
    if (USE_MEMORY_DB) {
      const records = memoryDB.promotionRequests.findAll()
        .filter(r => r.status === 'manager_approved');
      return Promise.all(records.map(r => this.enrichRecord(r)));
    }

    const sql = `
      SELECT 
        pr.*,
        e.name as employeeName,
        e.department,
        e.sub_department as subDepartment,
        e.level as employeeLevel,
        r.name as requesterName
      FROM promotion_requests pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN employees r ON pr.requester_id = r.id
      WHERE pr.status = 'manager_approved'
      ORDER BY pr.created_at DESC
    `;
    const results = await query(sql, []);
    return results.map(this.formatRecord);
  }

  // HR待审批
  static async findPendingForHR(): Promise<PromotionRequest[]> {
    if (USE_MEMORY_DB) {
      const records = memoryDB.promotionRequests.findAll()
        .filter(r => r.status === 'gm_approved');
      return Promise.all(records.map(r => this.enrichRecord(r)));
    }

    const sql = `
      SELECT 
        pr.*,
        e.name as employeeName,
        e.department,
        e.sub_department as subDepartment,
        e.level as employeeLevel,
        r.name as requesterName
      FROM promotion_requests pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN employees r ON pr.requester_id = r.id
      WHERE pr.status = 'gm_approved'
      ORDER BY pr.created_at DESC
    `;
    const results = await query(sql, []);
    return results.map(this.formatRecord);
  }

  // 审批通过
  static async approve(id: string, role: EmployeeRole, approverId: string, comment?: string): Promise<PromotionRequest | null> {
    if (USE_MEMORY_DB) {
      const record = memoryDB.promotionRequests.findById(id);
      if (!record) return null;
      const updates: Partial<PromotionRequest> = { updatedAt: new Date() };
      if (role === 'manager') {
        updates.status = 'manager_approved';
        updates.managerApproverId = approverId;
        updates.managerApprovedAt = new Date();
        updates.managerComment = comment;
      } else if (role === 'gm') {
        updates.status = 'gm_approved';
        updates.gmApproverId = approverId;
        updates.gmApprovedAt = new Date();
        updates.gmComment = comment;
      } else if (role === 'hr') {
        updates.status = 'hr_approved';
        updates.hrApproverId = approverId;
        updates.hrApprovedAt = new Date();
        updates.hrComment = comment;
      }
      const updated = memoryDB.promotionRequests.update(id, updates);
      return updated ? this.enrichRecord(updated) : null;
    }

    if (role === 'manager') {
      await query(
        `UPDATE promotion_requests SET status = 'manager_approved', manager_comment = ?, manager_approver_id = ?, manager_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [comment || null, approverId, id]
      );
    } else if (role === 'gm') {
      await query(
        `UPDATE promotion_requests SET status = 'gm_approved', gm_comment = ?, gm_approver_id = ?, gm_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [comment || null, approverId, id]
      );
    } else if (role === 'hr') {
      await query(
        `UPDATE promotion_requests SET status = 'hr_approved', hr_comment = ?, hr_approver_id = ?, hr_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [comment || null, approverId, id]
      );
    }

    return this.findById(id);
  }

  // 审批拒绝
  static async reject(id: string, role: EmployeeRole, approverId: string, reason: string): Promise<PromotionRequest | null> {
    if (USE_MEMORY_DB) {
      const record = memoryDB.promotionRequests.findById(id);
      if (!record) return null;
      const updates: Partial<PromotionRequest> = {
        status: 'rejected',
        rejectedReason: reason,
        rejectedByRole: role as PromotionRequest['rejectedByRole'],
        rejectedById: approverId,
        rejectedAt: new Date(),
        updatedAt: new Date()
      };
      if (role === 'manager') updates.managerComment = reason;
      if (role === 'gm') updates.gmComment = reason;
      if (role === 'hr') updates.hrComment = reason;
      const updated = memoryDB.promotionRequests.update(id, updates);
      return updated ? this.enrichRecord(updated) : null;
    }

    const commentField =
      role === 'manager' ? 'manager_comment' :
      role === 'gm' ? 'gm_comment' :
      'hr_comment';

    await query(
      `UPDATE promotion_requests SET status = 'rejected', ${commentField} = ?, rejected_reason = ?, rejected_by_role = ?, rejected_by_id = ?, rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [reason, reason, role, approverId, id]
    );

    return this.findById(id);
  }

  // 丰富记录（添加员工信息）
  private static async enrichRecord(record: PromotionRequest): Promise<PromotionRequest> {
    const employee = await EmployeeModel.findById(record.employeeId);
    const requester = await EmployeeModel.findById(record.requesterId);
    return {
      ...record,
      employeeName: employee?.name || '',
      department: employee?.department || '',
      subDepartment: employee?.subDepartment || '',
      employeeLevel: employee?.level,
      requesterName: requester?.name || ''
    };
  }

  // 格式化记录
  private static formatRecord(row: any): PromotionRequest {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employeeName,
      department: row.department,
      subDepartment: row.subDepartment || row.sub_department,
      employeeLevel: row.employeeLevel || row.level,
      requesterId: row.requester_id,
      requesterName: row.requesterName,
      requesterRole: row.requester_role,
      targetLevel: row.target_level,
      targetPosition: row.target_position,
      raisePercentage: row.raise_percentage ? parseFloat(row.raise_percentage) : 0,
      performanceSummary: row.performance_summary,
      skillSummary: row.skill_summary,
      competencySummary: row.competency_summary,
      workSummary: row.work_summary,
      status: row.status,
      managerComment: row.manager_comment,
      managerApproverId: row.manager_approver_id,
      managerApprovedAt: row.manager_approved_at,
      gmComment: row.gm_comment,
      gmApproverId: row.gm_approver_id,
      gmApprovedAt: row.gm_approved_at,
      hrComment: row.hr_comment,
      hrApproverId: row.hr_approver_id,
      hrApprovedAt: row.hr_approved_at,
      rejectedReason: row.rejected_reason,
      rejectedByRole: row.rejected_by_role,
      rejectedById: row.rejected_by_id,
      rejectedAt: row.rejected_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
