import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PromotionRequestModel } from '../models/promotionRequest.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import type { PromotionRequestStatus, EmployeeRole, PromotionRequest } from '../types';
import { getPromotionApprovalChain } from '../config/promotion-approval-store';
import ExcelJS from 'exceljs';
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
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, message: '未认证' });
      }

      const { userId, role } = req.user;
      if (role !== 'employee' && role !== 'manager') {
        return res.status(403).json({ success: false, message: '权限不足' });
      }

      // 支持下划线和驼峰命名
      const inputEmployeeId = req.body.employeeId || req.body.employee_id;
      const targetLevel = req.body.targetLevel || req.body.target_level;
      const targetPosition = req.body.targetPosition || req.body.target_position;
      const raisePercentage = req.body.raisePercentage || req.body.raise_percentage;
      const performanceSummary = req.body.performanceSummary || req.body.performance_summary;
      const skillSummary = req.body.skillSummary || req.body.skill_summary;
      const competencySummary = req.body.competencySummary || req.body.competency_summary;
      const workSummary = req.body.workSummary || req.body.work_summary;
      
      // 验证必填字段
      if (!targetLevel) {
        return res.status(400).json({ success: false, message: '目标级别不能为空' });
      }
      if (!LEVELS.includes(targetLevel)) {
        return res.status(400).json({ success: false, message: '目标职级无效' });
      }
      if (!targetPosition) {
        return res.status(400).json({ success: false, message: '目标岗位不能为空' });
      }
      if (!raisePercentage || isNaN(parseFloat(raisePercentage)) || parseFloat(raisePercentage) < 0.1 || parseFloat(raisePercentage) > 100) {
        return res.status(400).json({ success: false, message: '调薪比例应在0.1-100之间' });
      }
      if (!performanceSummary) {
        return res.status(400).json({ success: false, message: '请填写绩效考核数据' });
      }
      if (!skillSummary) {
        return res.status(400).json({ success: false, message: '请填写技能水平总结' });
      }
      if (!competencySummary) {
        return res.status(400).json({ success: false, message: '请填写能力素质总结' });
      }
      if (!workSummary) {
        return res.status(400).json({ success: false, message: '请填写工作总结' });
      }

      const employeeId = role === 'employee' ? userId : (inputEmployeeId || userId);
      const employee = await EmployeeModel.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ success: false, message: '员工不存在' });
      }

      if (role === 'manager' && employeeId !== userId) {
        if (employee.managerId !== userId) {
          return res.status(403).json({ success: false, message: '只能为直属下属发起申请' });
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
      return res.status(401).json({ success: false, message: '未认证' });
    }
    const records = await PromotionRequestModel.findMyRequests(req.user.userId);
    const chain = await getPromotionApprovalChain();
    res.json({ success: true, data: records.map(record => attachNextRole(record, chain)) });
  }),

  // 获取待审批
  getPending: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
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

    return res.status(403).json({ success: false, message: '权限不足' });
  }),

  // 审批通过
  approve: [
    param('id').notEmpty().withMessage('ID不能为空'),
    body('comment').optional().isString(),

    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      if (!req.user) {
        return res.status(401).json({ success: false, message: '未认证' });
      }

      const id = getParamValue(req.params.id);
      const { comment } = req.body;
      const { role, userId } = req.user;

      const record = await PromotionRequestModel.findById(id);
      if (!record) {
        return res.status(404).json({ success: false, message: '记录不存在' });
      }

      const chain = await getPromotionApprovalChain();
      const nextRole = getNextRole(chain, record.status);
      if (!nextRole || nextRole !== role) {
        return res.status(400).json({ success: false, message: '当前状态无法审批' });
      }

      if (role === 'manager') {
        const employee = await EmployeeModel.findById(record.employeeId);
        if (!employee || employee.managerId !== userId) {
          return res.status(403).json({ success: false, message: '只能审批直属下属' });
        }
      } else {
        if (role !== 'gm' && role !== 'hr') {
          return res.status(403).json({ success: false, message: '权限不足' });
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
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      if (!req.user) {
        return res.status(401).json({ success: false, message: '未认证' });
      }

      const id = getParamValue(req.params.id);
      const { reason } = req.body;
      const { role, userId } = req.user;

      const record = await PromotionRequestModel.findById(id);
      if (!record) {
        return res.status(404).json({ success: false, message: '记录不存在' });
      }

      const chain = await getPromotionApprovalChain();
      const nextRole = getNextRole(chain, record.status);
      if (!nextRole || nextRole !== role) {
        return res.status(400).json({ success: false, message: '当前状态无法审批' });
      }

      if (role === 'manager') {
        const employee = await EmployeeModel.findById(record.employeeId);
        if (!employee || employee.managerId !== userId) {
          return res.status(403).json({ success: false, message: '只能审批直属下属' });
        }
      } else {
        if (role !== 'gm' && role !== 'hr') {
          return res.status(403).json({ success: false, message: '权限不足' });
        }
      }

      const updated = await PromotionRequestModel.reject(id, role, userId, reason);
      res.json({ success: true, data: updated ? attachNextRole(updated, chain) : updated, message: '已拒绝申请' });
    })
  ],

  // 审批历史（分页）
  getHistory: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }
    const { role, userId } = req.user;
    if (role !== 'manager' && role !== 'gm' && role !== 'hr') {
      return res.status(403).json({ success: false, message: '权限不足' });
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
      return res.status(401).json({ success: false, message: '未认证' });
    }
    const { role, userId } = req.user;
    if (role !== 'manager' && role !== 'gm' && role !== 'hr') {
      return res.status(403).json({ success: false, message: '权限不足' });
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
      const wb = new ExcelJS.Workbook();
      wb.creator = '绩效管理系统';
      
      const ws = wb.addWorksheet('晋升加薪审批记录');
      
      // 添加表头和数据
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        ws.addRow(headers);
        
        exportData.forEach(item => {
          ws.addRow(Object.values(item));
        });
        
        // 设置表头样式
        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      const fileName = `晋升加薪审批记录_${Date.now()}.xlsx`;
      const filePath = path.join(__dirname, '../../temp', fileName);
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      await wb.xlsx.writeFile(filePath);
      res.download(filePath, fileName, (err) => {
        if (err) {
          logger.error(`下载文件失败: ${err}`);
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
