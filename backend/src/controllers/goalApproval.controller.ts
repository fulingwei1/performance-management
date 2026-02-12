// @ts-nocheck
/**
 * 目标审批控制器
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { ObjectiveModel } from '../models/objective.model';
import { EmployeeModel } from '../models/employee.model';
import { createAdjustment } from '../models/objectiveAdjustment.model';

/**
 * 获取待审批的目标列表
 */
export const getPendingApprovals = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const userRole = (req as any).user?.role;

  // 权限检查：只有经理可以审批
  if (userRole !== 'manager') {
    return res.status(403).json({
      success: false,
      message: '只有经理可以查看待审批目标'
    });
  }

  const objectives = await ObjectiveModel.getPendingApprovals(userId);

  // 获取目标所有者信息
  const objectivesWithOwner = await Promise.all(
    objectives.map(async (obj) => {
      const owner = obj.ownerId ? await EmployeeModel.findById(obj.ownerId.toString()) : null;
      return {
        ...obj,
        ownerName: owner?.name,
        ownerDepartment: owner?.department,
        ownerSubDepartment: owner?.subDepartment
      };
    })
  );

  return res.json({
    success: true,
    data: objectivesWithOwner
  });
});

/**
 * 批准目标
 */
export const approveObjective = [
  body('objectiveId').notEmpty().withMessage('目标ID不能为空'),
  body('comment').optional().isString(),

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { objectiveId, comment } = req.body;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: '只有经理可以审批目标'
      });
    }

    // 获取目标详情
    const objective = await ObjectiveModel.findById(objectiveId);
    if (!objective) {
      return res.status(404).json({
        success: false,
        message: '目标不存在'
      });
    }

    // 检查是否是该员工的直属经理
    if (objective.ownerId) {
      const employee = await EmployeeModel.findById(objective.ownerId.toString());
      if (!employee || employee.managerId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: '只能审批直接下属的目标'
        });
      }
    }

    // 检查状态
    if (objective.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: '只能审批待审批状态的目标'
      });
    }

    // 批准目标
    const updated = await ObjectiveModel.approveObjective(objectiveId, userId, comment);

    return res.json({
      success: true,
      message: '目标已批准',
      data: updated
    });
  })
];

/**
 * 拒绝目标
 */
export const rejectObjective = [
  body('objectiveId').notEmpty().withMessage('目标ID不能为空'),
  body('comment').notEmpty().withMessage('请填写拒绝原因'),

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { objectiveId, comment } = req.body;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: '只有经理可以审批目标'
      });
    }

    const objective = await ObjectiveModel.findById(objectiveId);
    if (!objective) {
      return res.status(404).json({
        success: false,
        message: '目标不存在'
      });
    }

    // 检查是否是该员工的直属经理
    if (objective.ownerId) {
      const employee = await EmployeeModel.findById(objective.ownerId.toString());
      if (!employee || employee.managerId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: '只能审批直接下属的目标'
        });
      }
    }

    if (objective.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: '只能审批待审批状态的目标'
      });
    }

    // 拒绝目标
    const updated = await ObjectiveModel.rejectObjective(objectiveId, userId, comment);

    return res.json({
      success: true,
      message: '目标已拒绝',
      data: updated
    });
  })
];

/**
 * 调整目标（经理可以调整下属的目标）
 */
export const adjustObjective = [
  body('objectiveId').notEmpty().withMessage('目标ID不能为空'),
  body('adjustments').isArray().withMessage('adjustments 必须是数组'),
  body('reason').optional().isString(),

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { objectiveId, adjustments, reason } = req.body;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: '只有经理可以调整目标'
      });
    }

    const objective = await ObjectiveModel.findById(objectiveId);
    if (!objective) {
      return res.status(404).json({
        success: false,
        message: '目标不存在'
      });
    }

    // 检查是否是该员工的直属经理
    if (objective.ownerId) {
      const employee = await EmployeeModel.findById(objective.ownerId.toString());
      if (!employee || employee.managerId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: '只能调整直接下属的目标'
        });
      }
    }

    // 记录调整历史
    const adjustmentRecords = [];
    for (const adj of adjustments) {
      const { type, oldValue, newValue } = adj;
      const record = await createAdjustment({
        objectiveId: Number(objectiveId),
        adjustedBy: Number(userId),
        adjustmentType: type,
        oldValue,
        newValue,
        reason
      });
      adjustmentRecords.push(record);
    }

    // 更新目标（根据 adjustments 类型更新对应字段）
    const updateData: any = { adjustmentReason: reason };
    
    for (const adj of adjustments) {
      switch (adj.type) {
        case 'target_value':
          updateData.targetValue = adj.newValue;
          break;
        case 'quarterly_targets':
          updateData.quarterlyTargets = adj.newValue;
          break;
        case 'monthly_targets':
          updateData.monthlyTargets = adj.newValue;
          break;
        case 'weight':
          updateData.weight = adj.newValue;
          break;
        case 'description':
          updateData.description = adj.newValue;
          break;
      }
    }

    const updated = await ObjectiveModel.update(objectiveId, updateData);

    return res.json({
      success: true,
      message: '目标已调整',
      data: {
        objective: updated,
        adjustments: adjustmentRecords
      }
    });
  })
];
