import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { EmployeeQuarterlyModel } from '../models/employeeQuarterly.model';

export const employeeQuarterlyController = {
  /**
   * POST /api/employee-quarterly/generate
   * 为指定季度批量生成员工季度汇总
   */
  generate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const { year, quarter } = req.body;
    if (!year || !quarter || quarter < 1 || quarter > 4) {
      return res.status(400).json({ success: false, message: '请提供有效的 year 和 quarter (1-4)' });
    }

    const result = await EmployeeQuarterlyModel.generateForQuarter(Number(year), Number(quarter));
    res.json({
      success: true,
      message: `季度汇总生成完成: ${result.created} 条`,
      data: result
    });
  }),

  /**
   * GET /api/employee-quarterly/my?year=2026&quarter=1
   * 查看自己的季度汇总
   */
  getMyQuarterly: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const { year, quarter } = req.query;
    const results = await EmployeeQuarterlyModel.findByEmployee(
      req.user.userId,
      year ? Number(year) : undefined,
      quarter ? Number(quarter) : undefined
    );

    res.json({ success: true, data: results });
  }),

  /**
   * GET /api/employee-quarterly/:year/:quarter
   * 查看某季度全公司汇总（管理员/HR）
   */
  getByQuarter: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const { year, quarter } = req.params;

    // 如果是自己的，走个人接口
    if (req.user.role === 'employee') {
      const results = await EmployeeQuarterlyModel.findByEmployee(req.user.userId, Number(year), Number(quarter));
      return res.json({ success: true, data: results });
    }

    // 管理员/HR 查看全部
    const [results, stats] = await Promise.all([
      EmployeeQuarterlyModel.findByQuarter(Number(year), Number(quarter)),
      EmployeeQuarterlyModel.getQuarterStats(Number(year), Number(quarter))
    ]);

    res.json({ success: true, data: results, stats });
  }),

  /**
   * GET /api/employee-quarterly/stats/:year/:quarter
   * 获取季度统计
   */
  getStats: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const { year, quarter } = req.params;
    const stats = await EmployeeQuarterlyModel.getQuarterStats(Number(year), Number(quarter));

    res.json({ success: true, data: stats });
  })
};
