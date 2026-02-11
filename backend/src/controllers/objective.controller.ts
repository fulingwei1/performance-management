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
    const data = await ObjectiveModel.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, data });
  }),

  getTree: asyncHandler(async (req: Request, res: Response) => {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const data = await ObjectiveModel.getTree(year);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await ObjectiveModel.create({ id: uuidv4(), ...req.body, progress: 0, status: req.body.status || 'draft' });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await ObjectiveModel.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, data });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const ok = await ObjectiveModel.delete(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, message: '删除成功' });
  }),

  updateProgress: asyncHandler(async (req: Request, res: Response) => {
    const { progress } = req.body;
    if (progress === undefined) return res.status(400).json({ success: false, error: '请提供进度值' });
    const data = await ObjectiveModel.updateProgress(req.params.id, progress);
    if (!data) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, data });
  }),

  addKeyResult: asyncHandler(async (req: Request, res: Response) => {
    const objective = await ObjectiveModel.findById(req.params.id);
    if (!objective) return res.status(404).json({ success: false, error: '目标不存在' });
    const kr = await ObjectiveModel.addKeyResult({ id: uuidv4(), objectiveId: req.params.id, ...req.body, currentValue: req.body.currentValue || 0, progress: 0, status: 'not_started' });
    res.status(201).json({ success: true, data: kr });
  })
};
