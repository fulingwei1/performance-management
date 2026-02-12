import { Request, Response } from 'express';
import { StrategicObjectiveModel } from '../models/strategicObjective.model';
import { ObjectiveModel } from '../models/objective.model';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const strategicObjectiveController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const allData = await StrategicObjectiveModel.findAll(year);
    
    // 根据用户角色过滤数据
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    
    // GM、HR、Admin 可以看全部
    if (userRole === 'gm' || userRole === 'hr' || userRole === 'admin') {
      return res.json({ success: true, data: allData });
    }
    
    // Manager和Employee需要按部门过滤
    if (userRole === 'manager' || userRole === 'employee') {
      // 获取用户部门信息
      const { EmployeeModel } = require('../models/employee.model');
      const user = await EmployeeModel.findById(userId);
      
      if (!user || !user.department) {
        return res.json({ success: true, data: allData.filter((item: any) => 
          item.type === 'company_strategy' || item.type === 'company_key_work'
        )});
      }
      
      // 过滤规则：
      // 1. 公司战略 - 全部可见
      // 2. 公司重点工作 - 全部可见
      // 3. 部门重点工作 - 只看自己部门的
      const filteredData = allData.filter((item: any) => {
        if (item.type === 'company_strategy' || item.type === 'company_key_work') {
          return true; // 公司级别的全部可见
        }
        if (item.type === 'department_key_work') {
          return item.department === user.department; // 只看自己部门的
        }
        return false;
      });
      
      return res.json({ success: true, data: filteredData });
    }
    
    // 默认返回全部
    res.json({ success: true, data: allData });
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
