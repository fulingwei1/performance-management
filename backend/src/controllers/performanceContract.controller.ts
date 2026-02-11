import { Request, Response } from 'express';
import { PerformanceContractModel } from '../models/performanceContract.model';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const performanceContractController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { employeeId, year, status } = req.query;
    const data = await PerformanceContractModel.findAll({
      employeeId: employeeId as string,
      year: year ? parseInt(year as string) : undefined,
      status: status as string
    });
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceContractModel.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: '合约不存在' });
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceContractModel.create({ id: uuidv4(), ...req.body, status: 'draft' });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceContractModel.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: '合约不存在' });
    res.json({ success: true, data });
  }),

  sign: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const contract = await PerformanceContractModel.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, error: '合约不存在' });
    const role = contract.employeeId === req.user.userId ? 'employee' : 'manager';
    const data = await PerformanceContractModel.sign(req.params.id, role);
    res.json({ success: true, data, message: '签约成功' });
  })
};
