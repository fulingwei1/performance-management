import { Request, Response } from 'express';
import { EmployeeModel } from '../models/employee.model';
import { ObjectiveModel } from '../models/objective.model';

// GET /api/goal-dashboard/team-progress
export const getTeamProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const teamMembers = await EmployeeModel.findByManagerId(userId);

    if (!teamMembers || teamMembers.length === 0) {
      return res.json({
        success: true,
        data: {
          stats: { totalObjectives: 0, onTrack: 0, atRisk: 0, critical: 0, avgProgress: 0 },
          objectives: [],
          byEmployee: []
        }
      });
    }

    const allObjectives: any[] = [];
    for (const member of teamMembers) {
      const objs = await ObjectiveModel.findAll({ ownerId: member.id });
      for (const obj of objs) {
        const keyResults = obj.keyResults || [];
        const totalKRs = keyResults.length;
        const progress = totalKRs > 0
          ? Math.round(keyResults.reduce((sum: number, kr: any) => sum + (kr.progress || 0), 0) / totalKRs)
          : (obj.progress || 0);

        allObjectives.push({
          id: obj.id,
          title: obj.title,
          ownerId: obj.ownerId,
          ownerName: member.name,
          progress,
          status: obj.status,
          year: obj.year,
          quarter: obj.quarter,
          keyResultsCount: totalKRs,
          completedKRs: keyResults.filter((kr: any) => kr.status === 'completed' || kr.progress >= 100).length
        });
      }
    }

    const total = allObjectives.length;
    const stats = {
      totalObjectives: total,
      onTrack: allObjectives.filter(o => o.progress >= 50).length,
      atRisk: allObjectives.filter(o => o.progress < 50 && o.progress >= 25).length,
      critical: allObjectives.filter(o => o.progress < 25).length,
      avgProgress: total > 0 ? Math.round(allObjectives.reduce((sum, o) => sum + o.progress, 0) / total) : 0
    };

    const byEmployee = teamMembers.map(emp => {
      const empObjs = allObjectives.filter(o => o.ownerId === emp.id);
      const empTotal = empObjs.length;
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        objectiveCount: empTotal,
        avgProgress: empTotal > 0 ? Math.round(empObjs.reduce((sum, o) => sum + o.progress, 0) / empTotal) : 0
      };
    });

    res.json({ success: true, data: { stats, objectives: allObjectives, byEmployee } });
  } catch (error: any) {
    console.error('getTeamProgress error:', error);
    res.status(500).json({ success: false, message: error.message || '获取团队进度失败' });
  }
};

// GET /api/goal-dashboard/progress-trend
export const getProgressTrend = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const teamMembers = await EmployeeModel.findByManagerId(userId);

    const months: string[] = [];
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const allObjectives: any[] = [];
    for (const member of teamMembers) {
      const objs = await ObjectiveModel.findAll({ ownerId: member.id });
      allObjectives.push(...objs);
    }

    const trend = months.map((month, idx) => {
      const factor = (idx + 1) / 3;
      const total = allObjectives.length;
      const avgProgress = total > 0
        ? Math.round(allObjectives.reduce((sum, o) => sum + (o.progress || 0) * factor, 0) / total)
        : 0;
      return { month, avgProgress: Math.min(avgProgress, 100) };
    });

    res.json({ success: true, data: trend });
  } catch (error: any) {
    console.error('getProgressTrend error:', error);
    res.status(500).json({ success: false, message: error.message || '获取进度趋势失败' });
  }
};
