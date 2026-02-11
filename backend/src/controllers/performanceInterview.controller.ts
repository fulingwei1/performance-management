import { Request, Response } from 'express';
import { PerformanceInterviewModel } from '../models/performanceInterview.model';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const performanceInterviewController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { employeeId, interviewerId, year } = req.query;
    const data = await PerformanceInterviewModel.findAll({
      employeeId: employeeId as string,
      interviewerId: interviewerId as string,
      year: year ? parseInt(year as string) : undefined
    });
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceInterviewModel.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: '面谈记录不存在' });
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceInterviewModel.create({ id: uuidv4(), ...req.body, status: req.body.status || 'scheduled' });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceInterviewModel.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: '面谈记录不存在' });
    res.json({ success: true, data });
  })
};
