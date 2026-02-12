import { Request, Response } from 'express';
import { ObjectiveModel } from '../models/objective.model';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const objectiveController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const level = req.query.level as string | undefined;
    const ownerId = req.query.ownerId as string | undefined;
    const department = req.query.department as string | undefined;
    const data = await ObjectiveModel.findAll({ year, level, ownerId, department });
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await ObjectiveModel.findById(req.params.id as string);
    if (!data) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, data });
  }),

  getTree: asyncHandler(async (req: Request, res: Response) => {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const data = await ObjectiveModel.getTree(year);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    
    // 如果是员工角色,只能创建自己的目标
    if (userRole === 'employee' && req.body.employeeId !== userId) {
      return res.status(403).json({ success: false, error: '权限不足:员工只能创建自己的目标' });
    }
    
    const data = await ObjectiveModel.create({ id: uuidv4(), ...req.body, progress: 0, status: req.body.status || 'draft' });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await ObjectiveModel.update(req.params.id as string, req.body);
    if (!data) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, data });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const ok = await ObjectiveModel.delete(req.params.id as string);
    if (!ok) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, message: '删除成功' });
  }),

  updateProgress: asyncHandler(async (req: Request, res: Response) => {
    const { progress } = req.body;
    if (progress === undefined) return res.status(400).json({ success: false, error: '请提供进度值' });
    const data = await ObjectiveModel.updateProgress(req.params.id as string, progress);
    if (!data) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, data });
  }),

  addKeyResult: asyncHandler(async (req: Request, res: Response) => {
    const objective = await ObjectiveModel.findById(req.params.id as string);
    if (!objective) return res.status(404).json({ success: false, error: '目标不存在' });
    const kr = await ObjectiveModel.addKeyResult({ id: uuidv4(), objectiveId: req.params.id as string, ...req.body, currentValue: req.body.currentValue || 0, progress: 0, status: 'not_started' });
    res.status(201).json({ success: true, data: kr });
  }),

  // 员工确认目标
  confirmObjective: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { feedback } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    const objective = await ObjectiveModel.findById(id as string);
    if (!objective) {
      return res.status(404).json({ success: false, error: '目标不存在' });
    }

    // 检查是否是目标的所有者
    if (objective.ownerId !== userId) {
      return res.status(403).json({ success: false, error: '只能确认自己的目标' });
    }

    const data = await ObjectiveModel.update(id as string, {
      employeeConfirmedAt: new Date(),
      employeeFeedback: feedback,
      status: 'active',
    });

    res.json({ success: true, data, message: '目标确认成功' });
  }),

  // 验证目标权重
  validateWeights: asyncHandler(async (req: Request, res: Response) => {
    const { objectives } = req.body;

    if (!Array.isArray(objectives)) {
      return res.status(400).json({ success: false, error: '请提供目标列表' });
    }

    const totalWeight = objectives.reduce((sum, obj) => sum + (obj.weight || 0), 0);
    const isValid = Math.abs(totalWeight - 100) < 0.01; // 允许浮点误差

    res.json({
      success: true,
      data: {
        totalWeight,
        isValid,
        message: isValid ? '权重总和正确' : `权重总和为 ${totalWeight.toFixed(2)}%，应为 100%`,
      },
    });
  }),
};
