import { Request, Response } from 'express';
import { PerformanceInterviewModel } from '../models/performanceInterview.model';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const performanceInterviewController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const employeeId = req.query.employeeId as string | undefined;
    const interviewerId = req.query.interviewerId as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const data = await PerformanceInterviewModel.findAll({ employeeId, interviewerId, year });
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceInterviewModel.findById(req.params.id as string);
    if (!data) return res.status(404).json({ success: false, message: '面谈记录不存在' });
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceInterviewModel.create({ id: uuidv4(), ...req.body, status: req.body.status || 'scheduled' });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceInterviewModel.update(req.params.id as string, req.body);
    if (!data) return res.status(404).json({ success: false, message: '面谈记录不存在' });
    res.json({ success: true, data });
  })
};
