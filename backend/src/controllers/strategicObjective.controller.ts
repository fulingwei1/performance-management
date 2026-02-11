import { Request, Response } from 'express';
import { StrategicObjectiveModel } from '../models/strategicObjective.model';
import { ObjectiveModel } from '../models/objective.model';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const strategicObjectiveController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const data = await StrategicObjectiveModel.findAll(year);
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await StrategicObjectiveModel.findById(req.params.id as string);
    if (!data) return res.status(404).json({ success: false, error: '战略目标不存在' });
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await StrategicObjectiveModel.create({
      id: uuidv4(), ...req.body, status: req.body.status || 'draft',
      createdBy: req.user?.userId
    });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await StrategicObjectiveModel.update(req.params.id as string, req.body);
    if (!data) return res.status(404).json({ success: false, error: '战略目标不存在' });
    res.json({ success: true, data });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const ok = await StrategicObjectiveModel.delete(req.params.id as string);
    if (!ok) return res.status(404).json({ success: false, error: '战略目标不存在' });
    res.json({ success: true, message: '删除成功' });
  }),

  decompose: asyncHandler(async (req: Request, res: Response) => {
    const strategic = await StrategicObjectiveModel.findById(req.params.id as string);
    if (!strategic) return res.status(404).json({ success: false, error: '战略目标不存在' });
    const { departments } = req.body; // [{ department, title, ownerId }]
    if (!Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ success: false, error: '请提供部门目标列表' });
    }
    const created = [];
    for (const dept of departments) {
      const obj = await ObjectiveModel.create({
        id: uuidv4(), title: dept.title || strategic.title,
        description: dept.description, level: 'department',
        strategicObjectiveId: strategic.id, department: dept.department,
        ownerId: dept.ownerId, year: strategic.year, quarter: dept.quarter,
        weight: dept.weight || 100, progress: 0, status: 'draft'
      });
      created.push(obj);
    }
    res.status(201).json({ success: true, data: created, message: `已分解为 ${created.length} 个部门目标` });
  })
};
