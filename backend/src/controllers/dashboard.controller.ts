import { Request, Response } from 'express';
import { ObjectiveModel } from '../models/objective.model';
import { EmployeeModel } from '../models/employee.model';
import logger from '../config/logger';
import { asyncHandler } from '../middleware/errorHandler';

export const dashboardController = {
  /**
   * 管理层仪表板 - 全局进度概览
   * GET /api/dashboard/overview
   */
  getOverview: asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    // 获取所有目标
    let objectives = await ObjectiveModel.findAll({ year });
    
    // Manager只看自己团队的
    if (userRole === 'manager') {
      const teamMembers = await EmployeeModel.findByManagerId(userId);
      const teamIds = teamMembers.map((e: any) => e.id);
      objectives = objectives.filter(obj => 
        teamIds.includes(obj.ownerId || '') || obj.ownerId === userId
      );
    }

    // 计算全局统计
    const totalObjectives = objectives.length;
    const completedObjectives = objectives.filter(obj => 
      (obj.progress || 0) >= 100
    ).length;
    const inProgressObjectives = objectives.filter(obj => 
      (obj.progress || 0) > 0 && (obj.progress || 0) < 100
    ).length;
    const notStartedObjectives = objectives.filter(obj => 
      (obj.progress || 0) === 0
    ).length;

    // 平均完成度
    const avgProgress = totalObjectives > 0
      ? objectives.reduce((sum, obj) => sum + (obj.progress || 0), 0) / totalObjectives
      : 0;

    // 按部门统计
    const departmentStats: Record<string, {
      department: string;
      totalObjectives: number;
      avgProgress: number;
      completedCount: number;
      riskCount: number; // 进度<50%
    }> = {};

    for (const obj of objectives) {
      const dept = obj.department || '未分配';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          totalObjectives: 0,
          avgProgress: 0,
          completedCount: 0,
          riskCount: 0,
        };
      }
      
      departmentStats[dept].totalObjectives++;
      departmentStats[dept].avgProgress += (obj.progress || 0);
      
      if ((obj.progress || 0) >= 100) {
        departmentStats[dept].completedCount++;
      }
      
      if ((obj.progress || 0) < 50) {
        departmentStats[dept].riskCount++;
      }
    }

    // 计算平均值
    Object.values(departmentStats).forEach(stat => {
      stat.avgProgress = stat.totalObjectives > 0
        ? stat.avgProgress / stat.totalObjectives
        : 0;
    });

    res.json({
      success: true,
      data: {
        year,
        summary: {
          totalObjectives,
          completedObjectives,
          inProgressObjectives,
          notStartedObjectives,
          avgProgress: Math.round(avgProgress * 100) / 100,
          completionRate: totalObjectives > 0
            ? Math.round((completedObjectives / totalObjectives) * 100)
            : 0,
        },
        departmentStats: Object.values(departmentStats).sort(
          (a, b) => b.avgProgress - a.avgProgress
        ),
      },
    });
  }),

  /**
   * 个人目标进度统计
   * GET /api/dashboard/my-progress
   */
  getMyProgress: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    if (!userId) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    // 获取我的目标（使用ownerId）
    const objectives = await ObjectiveModel.findAll({ year, ownerId: userId });
    
    // 个人目标（level=individual）
    const individualObjectives = objectives.filter(obj => obj.level === 'individual');
    
    // 简化的季度进度统计
    const quarterlyProgress = [
      { quarter: 'Q1', objectives: 0, avgProgress: 0, completed: 0 },
      { quarter: 'Q2', objectives: 0, avgProgress: 0, completed: 0 },
      { quarter: 'Q3', objectives: 0, avgProgress: 0, completed: 0 },
      { quarter: 'Q4', objectives: 0, avgProgress: 0, completed: 0 },
    ];

    // 计算每个季度的进度
    individualObjectives.forEach(obj => {
      const quarterIndex = obj.quarter ? parseInt(obj.quarter.replace('Q', '')) - 1 : -1;
      if (quarterIndex >= 0 && quarterIndex < 4) {
        quarterlyProgress[quarterIndex].objectives++;
        quarterlyProgress[quarterIndex].avgProgress += (obj.progress || 0);
        if ((obj.progress || 0) >= 100) {
          quarterlyProgress[quarterIndex].completed++;
        }
      }
    });

    // 计算平均值
    quarterlyProgress.forEach(qp => {
      if (qp.objectives > 0) {
        qp.avgProgress = Math.round((qp.avgProgress / qp.objectives) * 100) / 100;
      }
    });

    // 获取部门平均（用于对比）
    const employee = await EmployeeModel.findById(userId);
    let departmentAvg = 0;
    
    if (employee?.department) {
      const deptObjectives = await ObjectiveModel.findAll({ 
        year, 
        department: employee.department 
      });
      
      if (deptObjectives.length > 0) {
        departmentAvg = deptObjectives.reduce((sum, obj) => 
          sum + (obj.progress || 0), 0
        ) / deptObjectives.length;
      }
    }

    const myAvgProgress = individualObjectives.length > 0
      ? individualObjectives.reduce((sum, obj) => sum + (obj.progress || 0), 0) / individualObjectives.length
      : 0;

    res.json({
      success: true,
      data: {
        year,
        summary: {
          totalObjectives: individualObjectives.length,
          avgProgress: Math.round(myAvgProgress * 100) / 100,
          completed: individualObjectives.filter(obj => (obj.progress || 0) >= 100).length,
          inProgress: individualObjectives.filter(obj => 
            (obj.progress || 0) > 0 && (obj.progress || 0) < 100
          ).length,
        },
        quarterlyProgress,
        comparison: {
          myProgress: Math.round(myAvgProgress * 100) / 100,
          departmentAvg: Math.round(departmentAvg * 100) / 100,
          difference: Math.round((myAvgProgress - departmentAvg) * 100) / 100,
        },
        objectives: individualObjectives.map(obj => ({
          id: obj.id,
          title: obj.title,
          description: obj.description,
          weight: obj.weight,
          progress: obj.progress || 0,
          status: obj.status,
        })),
      },
    });
  }),

  /**
   * 目标排行榜（Top & Bottom）
   * GET /api/dashboard/rankings
   */
  getRankings: asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    // 获取所有个人级别的目标
    let objectives = await ObjectiveModel.findAll({ year, level: 'individual' });
    
    // Manager只看自己团队的
    if (userRole === 'manager') {
      const teamMembers = await EmployeeModel.findByManagerId(userId);
      const teamIds = teamMembers.map((e: any) => e.id);
      objectives = objectives.filter(obj => 
        teamIds.includes(obj.ownerId || '')
      );
    }

    // 按员工分组计算平均进度
    const employeeProgress: Record<string, {
      employeeId: string;
      employeeName: string;
      department: string;
      objectivesCount: number;
      avgProgress: number;
      completedCount: number;
    }> = {};

    for (const obj of objectives) {
      const empId = obj.ownerId;
      if (!empId) continue;

      if (!employeeProgress[empId]) {
        const employee = await EmployeeModel.findById(empId);
        employeeProgress[empId] = {
          employeeId: empId,
          employeeName: employee?.name || '未知',
          department: employee?.department || '未分配',
          objectivesCount: 0,
          avgProgress: 0,
          completedCount: 0,
        };
      }

      employeeProgress[empId].objectivesCount++;
      employeeProgress[empId].avgProgress += (obj.progress || 0);
      
      if ((obj.progress || 0) >= 100) {
        employeeProgress[empId].completedCount++;
      }
    }

    // 计算平均值并排序
    const rankings = Object.values(employeeProgress)
      .map(ep => ({
        ...ep,
        avgProgress: ep.objectivesCount > 0
          ? Math.round((ep.avgProgress / ep.objectivesCount) * 100) / 100
          : 0,
      }))
      .sort((a, b) => b.avgProgress - a.avgProgress);

    res.json({
      success: true,
      data: {
        topPerformers: rankings.slice(0, limit),
        bottomPerformers: rankings.slice(-limit).reverse(),
        totalEmployees: rankings.length,
      },
    });
  }),

  /**
   * 趋势数据
   * GET /api/dashboard/trends
   */
  getTrends: asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // 获取所有目标
    let objectives = await ObjectiveModel.findAll({ year });
    
    // Manager只看自己团队的
    if (userRole === 'manager') {
      const teamMembers = await EmployeeModel.findByManagerId(userId);
      const teamIds = teamMembers.map((e: any) => e.id);
      objectives = objectives.filter(obj => 
        teamIds.includes(obj.ownerId || '') || obj.ownerId === userId
      );
    } else if (userRole === 'employee') {
      objectives = objectives.filter(obj => obj.ownerId === userId);
    }

    // 按季度统计进度
    const quarterlyTrends = [
      { quarter: 'Q1', avgProgress: 0, objectivesCount: 0 },
      { quarter: 'Q2', avgProgress: 0, objectivesCount: 0 },
      { quarter: 'Q3', avgProgress: 0, objectivesCount: 0 },
      { quarter: 'Q4', avgProgress: 0, objectivesCount: 0 },
    ];

    // 统计每个季度的目标
    objectives.forEach(obj => {
      if (obj.quarter) {
        const quarterIndex = parseInt(obj.quarter.replace('Q', '')) - 1;
        if (quarterIndex >= 0 && quarterIndex < 4) {
          quarterlyTrends[quarterIndex].avgProgress += (obj.progress || 0);
          quarterlyTrends[quarterIndex].objectivesCount++;
        }
      }
    });

    quarterlyTrends.forEach(qt => {
      if (qt.objectivesCount > 0) {
        qt.avgProgress = Math.round((qt.avgProgress / qt.objectivesCount) * 100) / 100;
      }
    });

    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    res.json({
      success: true,
      data: {
        year,
        trends: quarterlyTrends.slice(0, currentQuarter),
      },
    });
  }),
};
