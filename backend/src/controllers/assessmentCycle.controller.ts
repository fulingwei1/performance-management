import { Request, Response } from 'express';
import { AssessmentCycleModel } from '../models/assessmentCycle.model';
import { AssessmentCycle, AssessmentCycleType, Holiday } from '../types';

// 生成唯一ID
const generateId = () => `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const assessmentCycleController = {
  // ============ 考核周期管理 ============
  
  // 获取所有考核周期
  getAllCycles: async (_req: Request, res: Response) => {
    try {
      const cycles = await AssessmentCycleModel.findAll();
      res.json({ success: true, data: cycles });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 根据ID获取考核周期
  getCycleById: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const cycle = await AssessmentCycleModel.findById(id);
      
      if (!cycle) {
        return res.status(404).json({ success: false, message: '考核周期不存在' });
      }
      
      res.json({ success: true, data: cycle });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 获取当前激活的考核周期
  getActiveCycle: async (_req: Request, res: Response) => {
    try {
      const cycle = await AssessmentCycleModel.findActive();
      
      if (!cycle) {
        return res.status(404).json({ success: false, message: '当前没有激活的考核周期' });
      }
      
      res.json({ success: true, data: cycle });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 创建考核周期
  createCycle: async (req: Request, res: Response) => {
    try {
      const {
        name, type, year, startDate, endDate,
        selfAssessmentDeadline, managerReviewDeadline,
        hrReviewDeadline, appealDeadline,
        reminderDays = 3, autoSubmit = false,
        excludeHolidays = true, description
      } = req.body;
      
      if (!name || !type || !year || !startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          error: '名称、类型、年份、开始日期和结束日期不能为空' 
        });
      }
      
      // 检查是否已存在同类型同年份的周期
      const existing = await AssessmentCycleModel.findByYearAndType(year, type as AssessmentCycleType);
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          error: `该年份已存在${type}类型的考核周期` 
        });
      }
      
      const cycle: Omit<AssessmentCycle, 'createdAt' | 'updatedAt'> = {
        id: generateId(),
        name,
        type: type as AssessmentCycleType,
        year,
        startDate,
        endDate,
        selfAssessmentDeadline,
        managerReviewDeadline,
        hrReviewDeadline,
        appealDeadline,
        status: 'draft',
        reminderDays,
        autoSubmit,
        excludeHolidays,
        description
      };
      
      const newCycle = await AssessmentCycleModel.create(cycle);
      res.status(201).json({ success: true, data: newCycle });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 更新考核周期
  updateCycle: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const updates = req.body;
      
      const cycle = await AssessmentCycleModel.update(id, updates);
      
      if (!cycle) {
        return res.status(404).json({ success: false, message: '考核周期不存在' });
      }
      
      res.json({ success: true, data: cycle });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 删除考核周期
  deleteCycle: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const success = await AssessmentCycleModel.delete(id);
      
      if (!success) {
        return res.status(404).json({ success: false, message: '考核周期不存在' });
      }
      
      res.json({ success: true, message: '考核周期已删除' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 激活考核周期
  activateCycle: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const cycle = await AssessmentCycleModel.update(id, { status: 'active' });
      
      if (!cycle) {
        return res.status(404).json({ success: false, message: '考核周期不存在' });
      }
      
      res.json({ success: true, data: cycle, message: '考核周期已激活' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 批量生成年度的月度考核周期
  generateMonthlyCycles: async (req: Request, res: Response) => {
    try {
      const { year } = req.body;
      
      if (!year) {
        return res.status(400).json({ success: false, message: '年份不能为空' });
      }
      
      const cycles = await AssessmentCycleModel.generateMonthlyCycles(year);
      res.json({ 
        success: true, 
        data: cycles,
        message: `成功生成${cycles.length}个月度考核周期`
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // ============ 考核日历 ============
  
  // 获取考核日历
  getCalendar: async (req: Request, res: Response) => {
    try {
      const yearParam = req.query.year;
      const year = yearParam ? parseInt(yearParam as string) : new Date().getFullYear();
      
      const cycles = await AssessmentCycleModel.findAll();
      const yearCycles = cycles.filter(c => c.year === year);
      const holidays = await AssessmentCycleModel.findAllHolidays(year);
      
      res.json({
        success: true,
        data: {
          year,
          cycles: yearCycles,
          holidays
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // ============ 节假日管理 ============
  
  // 获取节假日
  getHolidays: async (req: Request, res: Response) => {
    try {
      const yearParam = req.query.year;
      const year = yearParam ? parseInt(yearParam as string) : undefined;
      const holidays = await AssessmentCycleModel.findAllHolidays(year);
      res.json({ success: true, data: holidays });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 创建节假日
  createHoliday: async (req: Request, res: Response) => {
    try {
      const { name, date, type = 'national' } = req.body;
      
      if (!name || !date) {
        return res.status(400).json({ success: false, message: '节假日名称和日期不能为空' });
      }
      
      const holiday: Holiday = {
        id: `holiday-${Date.now()}`,
        name,
        date,
        type: type as 'national' | 'company'
      };
      
      const newHoliday = await AssessmentCycleModel.createHoliday(holiday);
      res.status(201).json({ success: true, data: newHoliday });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 删除节假日
  deleteHoliday: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const success = await AssessmentCycleModel.deleteHoliday(id);
      
      if (!success) {
        return res.status(404).json({ success: false, message: '节假日不存在' });
      }
      
      res.json({ success: true, message: '节假日已删除' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // 批量导入节假日
  importHolidays: async (req: Request, res: Response) => {
    try {
      const { holidays } = req.body;
      
      if (!holidays || !Array.isArray(holidays)) {
        return res.status(400).json({ success: false, message: '节假日数据不能为空' });
      }
      
      const createdHolidays: Holiday[] = [];
      
      for (const holiday of holidays) {
        const newHoliday: Holiday = {
          id: `holiday-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: holiday.name,
          date: holiday.date,
          type: holiday.type || 'national'
        };
        
        await AssessmentCycleModel.createHoliday(newHoliday);
        createdHolidays.push(newHoliday);
      }
      
      res.json({
        success: true,
        data: createdHolidays,
        message: `成功导入${createdHolidays.length}个节假日`
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};
