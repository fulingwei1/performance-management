import { Request, Response } from 'express';
import { MonthlyReportModel } from '../models/monthlyReport.model';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const monthlyReportController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const employeeId = req.query.employeeId as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const status = req.query.status as string | undefined;
    const data = await MonthlyReportModel.findAll({ employeeId, year, status });
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await MonthlyReportModel.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: '月报不存在' });
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await MonthlyReportModel.create({ id: uuidv4(), ...req.body, status: req.body.status || 'draft' });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await MonthlyReportModel.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: '月报不存在' });
    res.json({ success: true, data });
  }),

  comment: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ success: false, error: '请提供点评内容' });
    const data = await MonthlyReportModel.addComment(req.params.id, req.user.userId, comment);
    if (!data) return res.status(404).json({ success: false, error: '月报不存在' });
    res.json({ success: true, data, message: '点评成功' });
  })
};
