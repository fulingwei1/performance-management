import { Request, Response } from 'express';
import { KpiAssignmentModel } from '../models/kpiAssignment.model';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const kpiAssignmentController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const employeeId = req.query.employeeId as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const status = req.query.status as string | undefined;
    const data = await KpiAssignmentModel.findAll({ employeeId, year, status });
    res.json({ success: true, data });
  }),

  getMy: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const data = await KpiAssignmentModel.findAll({ employeeId: req.user.userId, year });
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await KpiAssignmentModel.create({ id: uuidv4(), ...req.body, actualValue: req.body.actualValue || 0, status: 'pending' });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await KpiAssignmentModel.update(req.params.id as string, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'KPI不存在' });
    res.json({ success: true, data });
  })
};
