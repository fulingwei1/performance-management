import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PromotionRequestModel } from '../models/promotionRequest.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import type { PromotionRequestStatus, EmployeeRole, PromotionRequest } from '../types';
import { getPromotionApprovalChain } from '../config/promotion-approval-store';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../config/logger';

const LEVELS = ['senior', 'intermediate', 'junior', 'assistant'];

const lastApprovedRoleByStatus: Record<PromotionRequestStatus, EmployeeRole | null> = {
  draft: null,
  submitted: null,
  manager_approved: 'manager',
  gm_approved: 'gm',
  hr_approved: 'hr',
  rejected: null
};

const getNextRole = (chain: EmployeeRole[], status: PromotionRequestStatus): EmployeeRole | null => {
  if (status === 'rejected' || status === 'hr_approved') return null;
  const last = lastApprovedRoleByStatus[status];
  if (!last) return chain[0] ?? null;
  const idx = chain.indexOf(last);
  if (idx === -1) return chain[0] ?? null;
  return chain[idx + 1] ?? null;
};

const isPendingForRole = (record: PromotionRequest, role: EmployeeRole, chain: EmployeeRole[]) => {
  if (record.status === 'rejected' || record.status === 'hr_approved') return false;
  const nextRole = getNextRole(chain, record.status);
  return nextRole === role;
};

const attachNextRole = (record: PromotionRequest, chain: EmployeeRole[]) => ({
  ...record,
  nextRole: getNextRole(chain, record.status)
});

const getParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
};

export const promotionRequestController = {
  // 创建申请
  create: [
    body('employeeId').optional().isString(),
    body('targetLevel').isIn(LEVELS).withMessage('目标职级无效'),
    body('targetPosition').notEmpty().withMessage('目标岗位不能为空'),
    body('raisePercentage').isFloat({ min: 0.1, max: 100 }).withMessage('调薪比例应在0.1-100之间'),
    body('performanceSummary').notEmpty().withMessage('请填写绩效考核数据'),
    body('skillSummary').notEmpty().withMessage('请填写技能水平总结'),
    body('competencySummary').notEmpty().withMessage('请填写能力素质总结'),
    body('workSummary').notEmpty().withMessage('请填写工作总结'),

    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg
        });
      }

      if (!req.user) {
        return res.status(401).json({ success: false, error: '未认证' });
      }

      const { userId, role } = req.user;
      if (role !== 'employee' && role !== 'manager') {
        return res.status(403).json({ success: false, error: '权限不足' });
      }

      const {
        employeeId: inputEmployeeId,
        targetLevel,
        targetPosition,
        raisePercentage,
        performanceSummary,
        skillSummary,
        competencySummary,
        workSummary
      } = req.body;

      const employeeId = role === 'employee' ? userId : (inputEmployeeId || userId);
      const employee = await EmployeeModel.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ success: false, error: '员工不存在' });
      }

      if (role === 'manager' && employeeId !== userId) {
        if (employee.managerId !== userId) {
          return res.status(403).json({ success: false, error: '只能为直属下属发起申请' });
        }
      }

      const chain = await getPromotionApprovalChain();
      const firstRole = chain[0];
      let status: PromotionRequestStatus = 'submitted';
      let managerApproverId: string | undefined;
      let managerApprovedAt: Date | undefined;

      // 经理发起的申请视为经理已审批
      if (role === 'manager' && firstRole === 'manager') {
        status = 'manager_approved';
        managerApproverId = userId;
        managerApprovedAt = new Date();
      }

      const id = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const created = await PromotionRequestModel.create({
        id,
        employeeId,
        requesterId: userId,
        requesterRole: role,
        targetLevel,
        targetPosition,
        raisePercentage: parseFloat(raisePercentage),
        performanceSummary,
        skillSummary,
        competencySummary,
        workSummary,
        status,
        managerApproverId,
        managerApprovedAt
      });

      res.json({
        success: true,
        data: attachNextRole(created, chain),
        message: '申请创建成功'
      });
    })
  ],

  // 获取我的申请
  getMyRequests: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未认证' });
    }
    const records = await PromotionRequestModel.findMyRequests(req.user.userId);
    const chain = await getPromotionApprovalChain();
    res.json({ success: true, data: records.map(record => attachNextRole(record, chain)) });
  }),

  // 获取待审批
  getPending: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未认证' });
    }
    const { role, userId } = req.user;
    const chain = await getPromotionApprovalChain();
    const allRecords = await PromotionRequestModel.findAll();

    if (role === 'manager') {
      const subordinates = await EmployeeModel.findByManagerId(userId);
      const subordinateIds = new Set(subordinates.map(s => s.id));
      const records = allRecords.filter(r => subordinateIds.has(r.employeeId));
      const pending = records.filter(r => isPendingForRole(r, role, chain));
      return res.json({ success: true, data: pending.map(record => attachNextRole(record, chain)) });
    }

    if (role === 'gm' || role === 'hr') {
      const pending = allRecords.filter(r => isPendingForRole(r, role, chain));
      return res.json({ success: true, data: pending.map(record => attachNextRole(record, chain)) });
    }

    return res.status(403).json({ success: false, error: '权限不足' });
  }),

  // 审批通过
  approve: [
    param('id').notEmpty().withMessage('ID不能为空'),
    body('comment').optional().isString(),

    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }
      if (!req.user) {
        return res.status(401).json({ success: false, error: '未认证' });
      }

      const id = getParamValue(req.params.id);
      const { comment } = req.body;
      const { role, userId } = req.user;

      const record = await PromotionRequestModel.findById(id);
      if (!record) {
        return res.status(404).json({ success: false, error: '记录不存在' });
      }

      const chain = await getPromotionApprovalChain();
      const nextRole = getNextRole(chain, record.status);
      if (!nextRole || nextRole !== role) {
        return res.status(400).json({ success: false, error: '当前状态无法审批' });
      }

      if (role === 'manager') {
        const employee = await EmployeeModel.findById(record.employeeId);
        if (!employee || employee.managerId !== userId) {
          return res.status(403).json({ success: false, error: '只能审批直属下属' });
        }
      } else {
        if (role !== 'gm' && role !== 'hr') {
          return res.status(403).json({ success: false, error: '权限不足' });
        }
      }

      const updated = await PromotionRequestModel.approve(id, role, userId, comment);
      res.json({ success: true, data: updated ? attachNextRole(updated, chain) : updated, message: '审批已通过' });
    })
  ],

  // 审批拒绝
  reject: [
    param('id').notEmpty().withMessage('ID不能为空'),
    body('reason').notEmpty().withMessage('请填写拒绝原因'),

    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }
      if (!req.user) {
        return res.status(401).json({ success: false, error: '未认证' });
      }

      const id = getParamValue(req.params.id);
      const { reason } = req.body;
      const { role, userId } = req.user;

      const record = await PromotionRequestModel.findById(id);
      if (!record) {
        return res.status(404).json({ success: false, error: '记录不存在' });
      }

      const chain = await getPromotionApprovalChain();
      const nextRole = getNextRole(chain, record.status);
      if (!nextRole || nextRole !== role) {
        return res.status(400).json({ success: false, error: '当前状态无法审批' });
      }

      if (role === 'manager') {
        const employee = await EmployeeModel.findById(record.employeeId);
        if (!employee || employee.managerId !== userId) {
          return res.status(403).json({ success: false, error: '只能审批直属下属' });
        }
      } else {
        if (role !== 'gm' && role !== 'hr') {
          return res.status(403).json({ success: false, error: '权限不足' });
        }
      }

      const updated = await PromotionRequestModel.reject(id, role, userId, reason);
      res.json({ success: true, data: updated ? attachNextRole(updated, chain) : updated, message: '已拒绝申请' });
    })
  ],

  // 审批历史（分页）
  getHistory: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未认证' });
    }
    const { role, userId } = req.user;
    if (role !== 'manager' && role !== 'gm' && role !== 'hr') {
      return res.status(403).json({ success: false, error: '权限不足' });
    }
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt((req.query.pageSize as string) || '10', 10), 1), 50);
    const { records, total } = await PromotionRequestModel.findApprovalHistory(role, userId, page, pageSize);
    const chain = await getPromotionApprovalChain();
    res.json({
      success: true,
      data: {
        records: records.map(record => attachNextRole(record, chain)),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  }),

  // 审批记录导出
  exportRecords: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未认证' });
    }
    const { role, userId } = req.user;
    if (role !== 'manager' && role !== 'gm' && role !== 'hr') {
      return res.status(403).json({ success: false, error: '权限不足' });
    }

    const format = (req.query.format as string) || 'excel';
    const allRecords = await PromotionRequestModel.findAll();

    let records = allRecords;
    if (role === 'manager') {
      const subordinates = await EmployeeModel.findByManagerId(userId);
      const subordinateIds = new Set(subordinates.map(s => s.id));
      records = records.filter(r => subordinateIds.has(r.employeeId));
    }

    const exportData = records.map(r => ({
      '员工姓名': r.employeeName || '',
      '部门': r.department || '',
      '子部门': r.subDepartment || '',
      '当前职级': r.employeeLevel || '',
      '目标职级': r.targetLevel,
      '目标岗位': r.targetPosition,
      '调薪比例(%)': r.raisePercentage,
      '申请人': r.requesterName || '',
      '申请人角色': r.requesterRole,
      '状态': r.status,
      '经理意见': r.managerComment || '',
      '总经理意见': r.gmComment || '',
      'HR意见': r.hrComment || '',
      '拒绝原因': r.rejectedReason || '',
      '创建时间': r.createdAt || '',
      '更新时间': r.updatedAt || ''
    }));

    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, '晋升加薪审批记录');

      const fileName = `晋升加薪审批记录_${Date.now()}.xlsx`;
      const filePath = path.join(__dirname, '../../temp', fileName);
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      XLSX.writeFile(wb, filePath);
      res.download(filePath, fileName, (err) => {
        if (err) {
          logger.error('下载文件失败:', err);
        }
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          exportTime: new Date().toISOString(),
          totalRecords: exportData.length,
          data: exportData
        }
      });
    }
  })
};
