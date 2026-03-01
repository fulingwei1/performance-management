import { Request, Response } from 'express';
import {
  InterviewPlanModel,
  InterviewRecordModel,
  ImprovementPlanModel
} from '../models/interviewRecord.model';

export const InterviewPlanController = {
  /**
   * 创建面谈计划
   * POST /api/interviews/plans
   */
  async createPlan(req: Request, res: Response) {
    try {
      const {
        title, description, interview_type, scheduled_date, scheduled_time,
        duration_minutes, manager_id, employee_id, department_id, template_id
      } = req.body;
      
      if (!title || !interview_type || !scheduled_date || !manager_id || !employee_id) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段'
        });
      }
      
      const plan = await InterviewPlanModel.create({
        title,
        description,
        interview_type,
        scheduled_date,
        scheduled_time,
        duration_minutes: duration_minutes || 60,
        manager_id,
        employee_id,
        department_id,
        status: 'scheduled',
        template_id,
        created_by: (req as any).user?.id
      });
      
      res.status(201).json({
        success: true,
        message: '面谈计划创建成功',
        data: plan
      });
    } catch (error: any) {
      console.error('创建面谈计划失败:', error);
      res.status(500).json({
        success: false,
        message: '创建面谈计划失败',
        error: error.message
      });
    }
  },

  /**
   * 获取面谈计划列表
   * GET /api/interviews/plans
   */
  async getPlans(req: Request, res: Response) {
    try {
      const { manager_id, employee_id, status } = req.query;
      
      const plans = await InterviewPlanModel.findAll({
        manager_id: manager_id && typeof manager_id === 'string' ? parseInt(manager_id) : undefined,
        employee_id: employee_id && typeof employee_id === 'string' ? parseInt(employee_id) : undefined,
        status: typeof status === 'string' ? status : undefined
      });
      
      res.json({
        success: true,
        data: plans,
        total: plans.length
      });
    } catch (error: any) {
      console.error('获取面谈计划失败:', error);
      res.status(500).json({
        success: false,
        message: '获取面谈计划失败',
        error: error.message
      });
    }
  },

  /**
   * 更新面谈计划
   * PUT /api/interviews/plans/:id
   */
  async updatePlan(req: Request, res: Response) {
    try {
      const id = parseInt(String(req.params.id));
      const updates = req.body;
      
      const success = await InterviewPlanModel.update(id, updates);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '面谈计划不存在'
        });
      }
      
      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (error: any) {
      console.error('更新面谈计划失败:', error);
      res.status(500).json({
        success: false,
        message: '更新面谈计划失败',
        error: error.message
      });
    }
  }
};

export const InterviewRecordController = {
  /**
   * 创建面谈记录
   * POST /api/interviews/records
   */
  async createRecord(req: Request, res: Response) {
    try {
      const {
        plan_id, employee_id, manager_id, interview_date, interview_time,
        employee_summary, manager_feedback, achievements, challenges,
        strengths, improvements, overall_rating, performance_score,
        potential_score, nine_box_performance, nine_box_potential, notes
      } = req.body;
      
      if (!employee_id || !manager_id || !interview_date) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段'
        });
      }
      
      const record = await InterviewRecordModel.create({
        plan_id,
        employee_id,
        manager_id,
        interview_date,
        interview_time,
        duration_minutes: req.body.duration_minutes,
        employee_summary,
        manager_feedback,
        achievements,
        challenges,
        strengths,
        improvements,
        overall_rating,
        performance_score,
        potential_score,
        nine_box_performance,
        nine_box_potential,
        notes,
        attachments: req.body.attachments,
        status: 'draft'
      });
      
      res.status(201).json({
        success: true,
        message: '面谈记录创建成功',
        data: record
      });
    } catch (error: any) {
      console.error('创建面谈记录失败:', error);
      res.status(500).json({
        success: false,
        message: '创建面谈记录失败',
        error: error.message
      });
    }
  },

  /**
   * 获取面谈记录列表
   * GET /api/interviews/records
   */
  async getRecords(req: Request, res: Response) {
    try {
      const { employee_id, manager_id } = req.query;
      
      const records = await InterviewRecordModel.findAll({
        employee_id: employee_id && typeof employee_id === 'string' ? parseInt(employee_id) : undefined,
        manager_id: manager_id && typeof manager_id === 'string' ? parseInt(manager_id) : undefined
      });
      
      res.json({
        success: true,
        data: records,
        total: records.length
      });
    } catch (error: any) {
      console.error('获取面谈记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取面谈记录失败',
        error: error.message
      });
    }
  },

  /**
   * 获取单个面谈记录详情
   * GET /api/interviews/records/:id
   */
  async getRecordById(req: Request, res: Response) {
    try {
      const id = parseInt(String(req.params.id));
      const record = await InterviewRecordModel.findById(id);
      
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '面谈记录不存在'
        });
      }
      
      // 获取关联的改进计划
      const improvementPlans = await ImprovementPlanModel.findByInterviewRecord(id);
      
      res.json({
        success: true,
        data: {
          ...record,
          improvement_plans: improvementPlans
        }
      });
    } catch (error: any) {
      console.error('获取面谈记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取面谈记录失败',
        error: error.message
      });
    }
  }
};

export const ImprovementPlanController = {
  /**
   * 创建改进计划
   * POST /api/interviews/improvement-plans
   */
  async createPlan(req: Request, res: Response) {
    try {
      const {
        interview_record_id, employee_id, manager_id, goal, description,
        category, priority, start_date, target_date, resources_needed,
        support_from_manager
      } = req.body;
      
      if (!interview_record_id || !employee_id || !manager_id || !goal) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段'
        });
      }
      
      const plan = await ImprovementPlanModel.create({
        interview_record_id,
        employee_id,
        manager_id,
        goal,
        description,
        category: category || 'performance',
        priority: priority || 'medium',
        start_date,
        target_date,
        status: 'not_started',
        progress_percentage: 0,
        resources_needed,
        support_from_manager
      });
      
      res.status(201).json({
        success: true,
        message: '改进计划创建成功',
        data: plan
      });
    } catch (error: any) {
      console.error('创建改进计划失败:', error);
      res.status(500).json({
        success: false,
        message: '创建改进计划失败',
        error: error.message
      });
    }
  },

  /**
   * 更新改进计划进度
   * PUT /api/interviews/improvement-plans/:id/progress
   */
  async updateProgress(req: Request, res: Response) {
    try {
      const id = parseInt(String(req.params.id));
      const { progress, notes } = req.body;
      
      if (progress === undefined || progress < 0 || progress > 100) {
        return res.status(400).json({
          success: false,
          message: '进度值必须在0-100之间'
        });
      }
      
      const success = await ImprovementPlanModel.updateProgress(id, progress, notes);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '改进计划不存在'
        });
      }
      
      res.json({
        success: true,
        message: '进度更新成功'
      });
    } catch (error: any) {
      console.error('更新进度失败:', error);
      res.status(500).json({
        success: false,
        message: '更新进度失败',
        error: error.message
      });
    }
  },

  /**
   * 获取员工的改进计划
   * GET /api/interviews/improvement-plans/employee/:employeeId
   */
  async getByEmployee(req: Request, res: Response) {
    try {
      const employeeId = parseInt(String(req.params.employeeId));
      const { status } = req.query;
      
      const plans = await ImprovementPlanModel.findByEmployee(
        employeeId,
        typeof status === 'string' ? status : undefined
      );
      
      res.json({
        success: true,
        data: plans,
        total: plans.length
      });
    } catch (error: any) {
      console.error('获取改进计划失败:', error);
      res.status(500).json({
        success: false,
        message: '获取改进计划失败',
        error: error.message
      });
    }
  }
};
