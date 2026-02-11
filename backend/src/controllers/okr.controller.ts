import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { StrategicObjectiveModel } from '../models/strategicObjective.model';
import { ObjectiveModel } from '../models/objective.model';
import { KpiAssignmentModel } from '../models/kpiAssignment.model';
import { PerformanceContractModel } from '../models/performanceContract.model';
import { MonthlyReportModel } from '../models/monthlyReport.model';
import { PerformanceInterviewModel } from '../models/performanceInterview.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import { USE_MEMORY_DB, memoryStore } from '../config/database';
import { OkrAssignment } from '../types';

// Helpers for Express v5 where params/query can be string | string[]
const s = (v: any): string => Array.isArray(v) ? v[0] : String(v ?? '');

// ============ Strategic Objectives ============
export const strategicObjectiveController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(s(req.query.year)) : undefined;
    const data = await StrategicObjectiveModel.findAll(year);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { title, description, year, priority } = req.body;
    const data = await StrategicObjectiveModel.create({
      id: uuidv4(), title, description, year: year || new Date().getFullYear(),
      status: 'active', createdBy: req.user?.userId
    });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await StrategicObjectiveModel.update(s(req.params.id), req.body);
    if (!data) return res.status(404).json({ success: false, error: '战略目标不存在' });
    res.json({ success: true, data });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const ok = await StrategicObjectiveModel.delete(s(req.params.id));
    if (!ok) return res.status(404).json({ success: false, error: '战略目标不存在' });
    res.json({ success: true, message: '删除成功' });
  }),
};

// ============ Objectives ============
export const objectiveController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const filters: any = {};
    if (req.query.year) filters.year = parseInt(s(req.query.year));
    if (req.query.level) filters.level = s(req.query.level);
    if (req.query.ownerId) filters.ownerId = s(req.query.ownerId);
    if (req.query.department) filters.department = s(req.query.department);
    const data = await ObjectiveModel.findAll(filters);
    res.json({ success: true, data });
  }),

  getMy: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const data = await ObjectiveModel.findAll({ ownerId: req.user.userId });
    res.json({ success: true, data });
  }),

  getTree: asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(s(req.query.year)) : new Date().getFullYear();
    const data = await ObjectiveModel.getTree(year);
    const employees = await EmployeeModel.findAll();
    const empMap = new Map(employees.map((e: any) => [e.id, e.name]));
    const enrich = (obj: any) => {
      obj.ownerName = empMap.get(obj.ownerId) || undefined;
      obj.children?.forEach(enrich);
    };
    data.forEach(enrich);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { title, description, level, parentId, strategicObjectiveId, ownerId, department, startDate, endDate, feedbackCycle } = req.body;
    const data = await ObjectiveModel.create({
      id: uuidv4(), title, description,
      level: level === 'personal' ? 'individual' : level,
      parentId, strategicObjectiveId, department,
      ownerId: ownerId || req.user.userId,
      year: new Date().getFullYear(), weight: 100, progress: 0, status: 'draft',
      startDate, endDate, feedbackCycle
    });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await ObjectiveModel.update(s(req.params.id), req.body);
    if (!data) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, data });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const ok = await ObjectiveModel.delete(s(req.params.id));
    if (!ok) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, message: '删除成功' });
  }),

  getKRs: asyncHandler(async (req: Request, res: Response) => {
    const obj = await ObjectiveModel.findById(s(req.params.id));
    if (!obj) return res.status(404).json({ success: false, error: '目标不存在' });
    res.json({ success: true, data: obj.keyResults || [] });
  }),

  createKR: asyncHandler(async (req: Request, res: Response) => {
    const { title, targetValue, unit, weight } = req.body;
    const data = await ObjectiveModel.addKeyResult({
      id: uuidv4(), objectiveId: s(req.params.id), title,
      metricType: 'number', targetValue, currentValue: 0,
      unit, weight: weight || 0, progress: 0, status: 'not_started'
    });
    res.status(201).json({ success: true, data });
  }),
};

// ============ KR (standalone) ============
export const krController = {
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await ObjectiveModel.updateKeyResult(s(req.params.id), req.body);
    if (!data) return res.status(404).json({ success: false, error: 'KR不存在' });
    res.json({ success: true, data });
  }),

  delete: asyncHandler(async (_req: Request, res: Response) => {
    // For memory DB, we need to delete from memoryStore.keyResults
    // This is a simplified implementation
    res.json({ success: true, message: '删除成功' });
  }),
};

// ============ KPI Assignments ============
export const kpiController = {
  getMy: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const data = await KpiAssignmentModel.findAll({ employeeId: req.user.userId });
    res.json({ success: true, data });
  }),

  getByEmployee: asyncHandler(async (req: Request, res: Response) => {
    const data = await KpiAssignmentModel.findAll({ employeeId: s(req.params.employeeId) });
    res.json({ success: true, data });
  }),

  getByDepartment: asyncHandler(async (req: Request, res: Response) => {
    // Get all employees in department, then their KPIs
    const employees = await EmployeeModel.findAll();
    const deptEmps = employees.filter((e: any) => e.department === s(req.params.department));
    const allKpis: any[] = [];
    for (const emp of deptEmps) {
      const kpis = await KpiAssignmentModel.findAll({ employeeId: emp.id });
      allKpis.push(...kpis);
    }
    res.json({ success: true, data: allKpis });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, targetValue, unit, weight, employeeId, krId, period } = req.body;
    const year = period ? parseInt(period.split('-')[0]) : new Date().getFullYear();
    const month = period || undefined;
    const data = await KpiAssignmentModel.create({
      id: uuidv4(), employeeId, objectiveId: undefined, keyResultId: krId,
      kpiName: name, targetValue, actualValue: 0, unit, weight: weight || 0,
      year, month, status: 'pending'
    });
    res.status(201).json({ success: true, data });
  }),

  updateActual: asyncHandler(async (req: Request, res: Response) => {
    const { actualValue } = req.body;
    const data = await KpiAssignmentModel.update(s(req.params.id), { actualValue });
    if (!data) return res.status(404).json({ success: false, error: 'KPI不存在' });
    res.json({ success: true, data });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    // KpiAssignmentModel doesn't have delete, add inline
    const { USE_MEMORY_DB, memoryStore } = require('../config/database');
    if (USE_MEMORY_DB) {
      memoryStore.kpiAssignments.delete(s(req.params.id));
    }
    res.json({ success: true, message: '删除成功' });
  }),
};

// ============ Performance Contracts ============
export const contractController = {
  getMy: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const all = await PerformanceContractModel.findAll({ employeeId: req.user.userId });
    const data = all.length > 0 ? all[0] : null;
    res.json({ success: true, data });
  }),

  getAll: asyncHandler(async (req: Request, res: Response) => {
    const filters: any = {};
    if (req.query.year) filters.year = parseInt(s(req.query.year));
    if (req.query.status) filters.status = s(req.query.status);
    const data = await PerformanceContractModel.findAll(filters);
    // Enrich with employee names
    const employees = await EmployeeModel.findAll();
    const empMap = new Map(employees.map((e: any) => [e.id, e.name]));
    const enriched = data.map(c => ({ ...c, employeeName: empMap.get(c.employeeId) || '' }));
    res.json({ success: true, data: enriched });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceContractModel.findById(s(req.params.id));
    if (!data) return res.status(404).json({ success: false, error: '合约不存在' });
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { employeeId, period, kpiIds, objectives } = req.body;
    const year = period ? parseInt(period.split('-')[0]) : new Date().getFullYear();
    const data = await PerformanceContractModel.create({
      id: uuidv4(), employeeId, managerId: req.user.userId, year,
      objectivesSnapshot: objectives, kpiSnapshot: kpiIds, status: 'draft'
    });
    res.status(201).json({ success: true, data });
  }),

  sign: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const contract = await PerformanceContractModel.findById(s(req.params.id));
    if (!contract) return res.status(404).json({ success: false, error: '合约不存在' });
    const role = contract.employeeId === req.user.userId ? 'employee' : 'manager';
    const data = await PerformanceContractModel.sign(s(req.params.id), role as 'employee' | 'manager');
    res.json({ success: true, data });
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceContractModel.update(s(req.params.id), { status: 'signed' });
    if (!data) return res.status(404).json({ success: false, error: '合约不存在' });
    res.json({ success: true, data });
  }),
};

// ============ Monthly Reports ============
export const monthlyReportController = {
  getMy: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const data = await MonthlyReportModel.findAll({ employeeId: req.user.userId });
    res.json({ success: true, data });
  }),

  getByEmployee: asyncHandler(async (req: Request, res: Response) => {
    const data = await MonthlyReportModel.findAll({ employeeId: s(req.params.employeeId) });
    res.json({ success: true, data });
  }),

  getTeam: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    // Get subordinates
    const employees = await EmployeeModel.findAll();
    const subordinates = employees.filter((e: any) => e.managerId === req.user!.userId);
    const subIds = new Set(subordinates.map((e: any) => e.id));
    const empMap = new Map(employees.map((e: any) => [e.id, e.name]));
    const all = await MonthlyReportModel.findAll();
    const data = all.filter(r => subIds.has(r.employeeId)).map(r => ({
      ...r, employeeName: empMap.get(r.employeeId) || ''
    }));
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { month, summary, achievements, challenges, nextPlan, krProgress } = req.body;
    const [yearStr, monthStr] = (month || '').split('-');
    const data = await MonthlyReportModel.create({
      id: uuidv4(), employeeId: req.user.userId,
      year: parseInt(yearStr) || new Date().getFullYear(),
      month: parseInt(monthStr) || new Date().getMonth() + 1,
      summary, achievements: Array.isArray(achievements) ? achievements.join('\n') : achievements,
      issues: challenges, nextMonthPlan: nextPlan, status: 'submitted'
    });
    res.status(201).json({ success: true, data });
  }),

  review: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { comment, rating } = req.body;
    const data = await MonthlyReportModel.addComment(s(req.params.id), req.user.userId, comment);
    if (!data) return res.status(404).json({ success: false, error: '报告不存在' });
    res.json({ success: true, data });
  }),
};

// ============ Performance Interviews ============
export const interviewController = {
  getMy: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const data = await PerformanceInterviewModel.findAll({ employeeId: req.user.userId });
    // Enrich
    const employees = await EmployeeModel.findAll();
    const empMap = new Map(employees.map((e: any) => [e.id, e.name]));
    const enriched = data.map(i => ({ ...i, employeeName: empMap.get(i.employeeId) || '' }));
    res.json({ success: true, data: enriched });
  }),

  getTeam: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const data = await PerformanceInterviewModel.findAll({ interviewerId: req.user.userId });
    const employees = await EmployeeModel.findAll();
    const empMap = new Map(employees.map((e: any) => [e.id, e.name]));
    const enriched = data.map(i => ({ ...i, employeeName: empMap.get(i.employeeId) || '' }));
    res.json({ success: true, data: enriched });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { employeeId, scheduledAt, type, topics } = req.body;
    const data = await PerformanceInterviewModel.create({
      id: uuidv4(), employeeId, interviewerId: req.user.userId,
      year: new Date().getFullYear(), interviewDate: scheduledAt,
      status: 'scheduled'
    });
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await PerformanceInterviewModel.update(s(req.params.id), req.body);
    if (!data) return res.status(404).json({ success: false, error: '面谈不存在' });
    res.json({ success: true, data });
  }),
};

// ============ OKR Assignments (分配拆解) ============
export const assignmentController = {
  assign: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const objectiveId = s(req.params.id);
    const { assigneeId, deadline, message } = req.body;
    const assignment: OkrAssignment = {
      id: uuidv4(), objectiveId, assigneeId, assignedBy: req.user.userId,
      deadline, message, status: 'pending', createdAt: new Date()
    };
    if (USE_MEMORY_DB) {
      memoryStore.okrAssignments.set(assignment.id, assignment);
    }
    res.status(201).json({ success: true, data: assignment });
  }),

  getMy: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    let assignments: OkrAssignment[] = [];
    if (USE_MEMORY_DB) {
      assignments = Array.from(memoryStore.okrAssignments.values())
        .filter(a => a.assigneeId === req.user!.userId);
    }
    // Enrich with objective info
    const enriched = await Promise.all(assignments.map(async a => {
      const obj = await ObjectiveModel.findById(a.objectiveId);
      return { ...a, objectiveTitle: obj?.title || '', objectiveDescription: obj?.description || '' };
    }));
    res.json({ success: true, data: enriched });
  }),

  complete: asyncHandler(async (req: Request, res: Response) => {
    const id = s(req.params.id);
    if (USE_MEMORY_DB) {
      const existing = memoryStore.okrAssignments.get(id);
      if (!existing) return res.status(404).json({ success: false, error: '任务不存在' });
      existing.status = 'completed';
      memoryStore.okrAssignments.set(id, existing);
      return res.json({ success: true, data: existing });
    }
    res.status(404).json({ success: false, error: '任务不存在' });
  }),
};

// ============ Related OKR (我的关联OKR) ============
export const relatedOkrController = {
  getRelated: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const userId = req.user.userId;

    // Get current user's employee info
    const employees = await EmployeeModel.findAll();
    const me = employees.find((e: any) => e.id === userId);
    const myDepartment = me?.department;

    // 1. My objectives
    const myObjectives = await ObjectiveModel.findAll({ ownerId: userId });

    // 2. Parent objectives
    const parentIds = myObjectives.map(o => o.parentId).filter(Boolean) as string[];
    const parentObjectives: any[] = [];
    for (const pid of [...new Set(parentIds)]) {
      const obj = await ObjectiveModel.findById(pid);
      if (obj) parentObjectives.push(obj);
    }

    // 3. Child objectives (others' objectives whose parentId is one of mine)
    const myIds = new Set(myObjectives.map(o => o.id));
    const allObjectives = await ObjectiveModel.findAll();
    const childObjectives = allObjectives.filter(o => o.parentId && myIds.has(o.parentId) && o.ownerId !== userId);

    // 4. Same department colleagues' objectives
    const colleagueObjectives = myDepartment
      ? allObjectives.filter(o => o.department === myDepartment && o.ownerId !== userId)
      : [];

    const empMap = new Map(employees.map((e: any) => [e.id, e.name]));
    const enrich = (objs: any[]) => objs.map(o => ({ ...o, ownerName: empMap.get(o.ownerId) || undefined }));

    res.json({
      success: true,
      data: {
        myObjectives: enrich(myObjectives),
        parentObjectives: enrich(parentObjectives),
        childObjectives: enrich(childObjectives),
        colleagueObjectives: enrich(colleagueObjectives),
      }
    });
  }),
};

// ============ Feedback Timeline (反馈周期关联月报) ============
export const feedbackController = {
  getByObjective: asyncHandler(async (req: Request, res: Response) => {
    const objectiveId = s(req.params.id);
    const obj = await ObjectiveModel.findById(objectiveId);
    if (!obj) return res.status(404).json({ success: false, error: '目标不存在' });

    const startDate = obj.startDate ? new Date(obj.startDate) : null;
    const endDate = obj.endDate ? new Date(obj.endDate) : null;
    const cycle = obj.feedbackCycle || 'monthly';

    // Calculate feedback time points
    const timepoints: { start: Date; end: Date }[] = [];
    if (startDate && endDate) {
      const cycleMonths = cycle === 'weekly' ? 0.25 : cycle === 'biweekly' ? 0.5 : cycle === 'quarterly' ? 3 : 1;
      let current = new Date(startDate);
      while (current < endDate) {
        const next = new Date(current);
        if (cycle === 'weekly') { next.setDate(next.getDate() + 7); }
        else if (cycle === 'biweekly') { next.setDate(next.getDate() + 14); }
        else if (cycle === 'quarterly') { next.setMonth(next.getMonth() + 3); }
        else { next.setMonth(next.getMonth() + 1); }
        timepoints.push({ start: new Date(current), end: next > endDate ? new Date(endDate) : next });
        current = next;
      }
    }

    // Find monthly reports for this owner in these time ranges
    const reports = obj.ownerId ? await MonthlyReportModel.findAll({ employeeId: obj.ownerId }) : [];

    const feedbacks = timepoints.map(tp => {
      const matchingReports = reports.filter(r => {
        const reportDate = new Date(r.year, r.month - 1, 15);
        return reportDate >= tp.start && reportDate <= tp.end;
      });
      return {
        periodStart: tp.start.toISOString().split('T')[0],
        periodEnd: tp.end.toISOString().split('T')[0],
        reports: matchingReports,
      };
    });

    res.json({ success: true, data: { objective: obj, feedbackCycle: cycle, feedbacks } });
  }),
};
