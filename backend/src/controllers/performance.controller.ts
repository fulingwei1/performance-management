import { Request, Response } from 'express';
import { PerformanceModel } from '../models/performance.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import { getGroupType, scoreToLevel } from '../utils/helpers';
import type { ScoreLevel } from '../types';
import { getPerformanceRankingConfig, isParticipatingRecord } from '../services/performanceRankingConfig.service';
import '../middleware/auth'; // Request type extension

export const performanceController = {
  // 获取当前用户的绩效记录
  getMyRecords: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }

    const records = await PerformanceModel.findByEmployeeId(req.user.userId);
    res.json({
      success: true,
      data: records
    });
  }),

  // 获取当前用户某月的绩效记录
  getMyRecordByMonth: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    const { month } = req.params;
    const monthStr = Array.isArray(month) ? month[0] : month;
    const record = await PerformanceModel.findByEmployeeIdAndMonth(req.user.userId, monthStr);
    
    if (!record) {
      return res.json({
        success: true,
        data: null,
        message: '该月份暂无记录'
      });
    }

    res.json({
      success: true,
      data: record
    });
  }),

  // 获取经理的评分记录（下属）
  // 支持 ?month=2026-01 查询单月
  // 支持 ?months=3 查询最近N个月
  // 不传参数返回所有历史数据
  getTeamRecords: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }

    const { month, months } = req.query;
    let records = await PerformanceModel.findByAssessorId(
      req.user.userId, 
      month as string
    );
    
    // 如果指定了months参数，过滤最近N个月的数据
    if (months && !month) {
      const monthCount = parseInt(months as string, 10);
      if (!isNaN(monthCount) && monthCount > 0) {
        const now = new Date();
        const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
        const cutoffMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
        records = records.filter(r => r.month >= cutoffMonth);
      }
    }
    
    res.json({
      success: true,
      data: records
    });
  }),

  // 获取某月份的所有记录
  getRecordsByMonth: asyncHandler(async (req: Request, res: Response) => {
      const month = req.params.month as string;
      if (!/^\\d{4}-\\d{2}$/.test(month)) {
        return res.status(400).json({ success: false, error: '月份格式错误，应为YYYY-MM' });
      }
      const records = await PerformanceModel.findByMonth(month);
      res.json({ success: true, data: records });
    }),

  // 获取全公司所有记录（总经理/HR用）
  getAllRecords: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }

    const { months } = req.query;
    let records = await PerformanceModel.findAll();
    
    // 如果指定了months参数，过滤最近N个月的数据
    if (months) {
      const monthCount = parseInt(months as string, 10);
      if (!isNaN(monthCount) && monthCount > 0) {
        const now = new Date();
        const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
        const cutoffMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
        records = records.filter(r => r.month >= cutoffMonth);
      }
    }
    
    res.json({
      success: true,
      data: records
    });
  }),

  // 根据ID获取记录
  getRecordById: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    if (!id || id.trim() === '') {
      return res.status(400).json({ success: false, error: '记录ID不能为空' });
    }

    const record = await PerformanceModel.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        error: '记录不存在'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }

    // 记录级权限边界：HR/GM/Admin 可查看全部；员工/经理仅可查看自己或下属相关记录
    const role = req.user.role;
    const userId = req.user.userId;
    const isPrivileged = role === 'hr' || role === 'gm' || role === 'admin';
    if (!isPrivileged) {
      const isSelf = record.employeeId === userId;
      let isManagerAllowed = false;

      if (role === 'manager') {
        if (record.assessorId === userId) {
          isManagerAllowed = true;
        } else {
          const employee = await EmployeeModel.findById(record.employeeId);
          isManagerAllowed = Boolean(employee && employee.managerId === userId);
        }
      }

      if (!isSelf && !isManagerAllowed) {
        return res.status(403).json({
          success: false,
          error: '无权访问该绩效记录'
        });
      }
    }

    res.json({
      success: true,
      data: record
    });
  }),

  // 员工提交工作总结
  submitSummary: asyncHandler(async (req: Request, res: Response) => {
    const { month, summary, selfSummary, achievements, issues, nextMonthPlan } = req.body;

    // 验证 month 格式
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: '月份格式错误' });
    }

    // 验证可选字段类型
    if (summary !== undefined && typeof summary !== 'string') {
      return res.status(400).json({ success: false, error: 'summary 必须是字符串' });
    }
    if (selfSummary !== undefined && typeof selfSummary !== 'string') {
      return res.status(400).json({ success: false, error: 'selfSummary 必须是字符串' });
    }
    if (achievements !== undefined && typeof achievements !== 'string') {
      return res.status(400).json({ success: false, error: 'achievements 必须是字符串' });
    }
    if (issues !== undefined && typeof issues !== 'string') {
      return res.status(400).json({ success: false, error: 'issues 必须是字符串' });
    }
    if (nextMonthPlan !== undefined && typeof nextMonthPlan !== 'string') {
      return res.status(400).json({ success: false, error: 'nextMonthPlan 必须是字符串' });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }

    // 支持两种格式:
    // 格式1: {month, summary, achievements, issues}
    // 格式2: {month, selfSummary, nextMonthPlan}
    let finalSelfSummary: string;
    let finalNextMonthPlan: string;
    
    if (summary || achievements || issues) {
      // 格式1: 组合 summary, achievements, issues
      const parts = [];
      if (summary) parts.push(`工作总结：${summary}`);
      if (achievements) parts.push(`主要成就：${achievements}`);
      if (issues) parts.push(`遇到的问题：${issues}`);
      
      if (parts.length === 0) {
        return res.status(400).json({
          success: false,
          error: '工作总结内容不能为空（至少需要 summary、achievements 或 issues 之一）'
        });
      }
      
      finalSelfSummary = parts.join('\n\n');
      finalNextMonthPlan = nextMonthPlan || '待补充';
    } else if (selfSummary) {
      // 格式2: 直接使用 selfSummary 和 nextMonthPlan
      finalSelfSummary = selfSummary;
      finalNextMonthPlan = nextMonthPlan || '待补充';
    } else {
      return res.status(400).json({
        success: false,
        error: '工作总结不能为空（请提供 summary/achievements/issues 或 selfSummary）'
      });
    }

    // 获取员工信息
    const employee = await EmployeeModel.findById(req.user.userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: '员工不存在'
      });
    }

    // 检查是否已经提交过该月份；若是系统预生成的空草稿，允许员工补充总结
    const existing = await PerformanceModel.findByEmployeeIdAndMonth(employee.id, month);
    if (existing && existing.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: '该月份已提交过工作总结，不可重复提交'
      });
    }
    if (existing && (existing.selfSummary || existing.nextMonthPlan)) {
      return res.status(400).json({
        success: false,
        error: '该月份已存在工作总结草稿，请勿重复提交'
      });
    }

    // 确定分组
    const groupType = getGroupType(employee.level);

    // 生成记录ID
    const recordId = `rec-${employee.id}-${month}`;

    const record = await PerformanceModel.saveSummary({
      id: recordId,
      employeeId: employee.id,
      assessorId: employee.managerId || '',
      month,
      selfSummary: finalSelfSummary,
      nextMonthPlan: finalNextMonthPlan,
      groupType
    });

    res.status(201).json({
      success: true,
      data: record,
      message: '工作总结提交成功'
    });
  }),

  // 创建空记录（经理给未提交的员工评分时使用）
  createEmptyRecord: asyncHandler(async (req: Request, res: Response) => {
    const { employeeId, month } = req.body;

    if (!employeeId || (typeof employeeId === 'string' && employeeId.trim() === '')) {
      return res.status(400).json({ success: false, error: '员工ID不能为空' });
    }
    if (!month || (typeof month === 'string' && month.trim() === '')) {
      return res.status(400).json({ success: false, error: '月份不能为空' });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }

    // 获取员工信息
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: '员工不存在'
      });
    }

    // 权限边界：只能给"自己的下属"创建空记录
    if (employee.managerId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: '只能为自己的下属创建空记录'
      });
    }

    const existing = await PerformanceModel.findByEmployeeIdAndMonth(employee.id, month);
    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: '绩效记录已存在'
      });
    }

    // 确定分组
    const groupType = getGroupType(employee.level);

    // 生成记录ID
    const recordId = `rec-${employee.id}-${month}`;

    // 创建空记录
    const record = await PerformanceModel.saveSummary({
      id: recordId,
      employeeId: employee.id,
      assessorId: req.user.userId,
      month,
      selfSummary: '',
      nextMonthPlan: '',
      groupType
    });

    res.json({
      success: true,
      data: record,
      message: '空记录创建成功'
    });
  }),

  // 经理评分
  submitScore: asyncHandler(async (req: Request, res: Response) => {
    const {
      id,
      taskCompletion,
      initiative,
      projectFeedback,
      qualityImprovement,
      managerComment,
      nextMonthWorkArrangement
    } = req.body;

    // 验证 id
    if (!id || (typeof id === 'string' && id.trim() === '')) {
      return res.status(400).json({ success: false, error: '记录ID不能为空' });
    }

    // 验证各分数字段 (0.5-1.5)
    const tc = Number(taskCompletion);
    if (isNaN(tc) || tc < 0.5 || tc > 1.5) {
      return res.status(400).json({ success: false, error: '任务完成分数范围0.5-1.5' });
    }
    const ini = Number(initiative);
    if (isNaN(ini) || ini < 0.5 || ini > 1.5) {
      return res.status(400).json({ success: false, error: '主动性分数范围0.5-1.5' });
    }
    const pf = Number(projectFeedback);
    if (isNaN(pf) || pf < 0.5 || pf > 1.5) {
      return res.status(400).json({ success: false, error: '项目反馈分数范围0.5-1.5' });
    }
    const qi = Number(qualityImprovement);
    if (isNaN(qi) || qi < 0.5 || qi > 1.5) {
      return res.status(400).json({ success: false, error: '质量改进分数范围0.5-1.5' });
    }

    // 验证评语和工作安排
    if (!managerComment || (typeof managerComment === 'string' && managerComment.trim() === '')) {
      return res.status(400).json({ success: false, error: '评语不能为空' });
    }
    if (!nextMonthWorkArrangement || (typeof nextMonthWorkArrangement === 'string' && nextMonthWorkArrangement.trim() === '')) {
      return res.status(400).json({ success: false, error: '工作安排不能为空' });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }

    // 权限边界：只能评分自己负责的记录
    const existing = await PerformanceModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '记录不存在'
      });
    }
    if (existing.assessorId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: '只能评分自己负责的员工'
      });
    }

    // 计算总分
    const totalScore = 
      tc * 0.4 + 
      ini * 0.3 + 
      pf * 0.2 + 
      qi * 0.1;

    const record = await PerformanceModel.submitScore({
      id,
      taskCompletion: tc,
      initiative: ini,
      projectFeedback: pf,
      qualityImprovement: qi,
      totalScore: parseFloat(totalScore.toFixed(2)),
      level: scoreToLevel(totalScore),
      managerComment,
      nextMonthWorkArrangement
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    // 更新排名
    await PerformanceModel.updateRanks(record.month);

    res.json({
      success: true,
      data: record,
      message: '评分提交成功'
    });
  }),

  // 删除记录
  deleteRecord: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    if (!id || id.trim() === '') {
      return res.status(400).json({ success: false, error: '记录ID不能为空' });
    }

    const success = await PerformanceModel.delete(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '记录不存在'
      });
    }

    res.json({
      success: true,
      message: '记录删除成功'
    });
  }),

  // 按月份删除记录（HR）
  deleteRecordsByMonth: asyncHandler(async (req: Request, res: Response) => {
    const month = req.params.month as string;
    const { confirm, force } = req.body as { confirm: string; force?: boolean };

    // 验证月份格式
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: '月份格式错误，应为YYYY-MM' });
    }

    // 验证确认信息
    if (!confirm || confirm.trim() === '') {
      return res.status(400).json({ success: false, error: '请填写确认信息' });
    }

    // 必须输入目标月份作为确认
    if (confirm !== month) {
      return res.status(400).json({
        success: false,
        error: '确认信息不匹配，请输入要删除的月份（YYYY-MM）'
      });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isPastMonth = month < currentMonth;
    if (isPastMonth && !force) {
      return res.status(400).json({
        success: false,
        error: '删除历史月份需要二次确认（force=true）'
      });
    }

    const deletedCount = await PerformanceModel.deleteByMonth(month);

    res.json({
      success: true,
      message: `已删除 ${month} 共 ${deletedCount} 条绩效记录`,
      data: { month, deletedCount }
    });
  }),

  // 删除全部记录（HR）
  deleteAllRecords: asyncHandler(async (req: Request, res: Response) => {
    const { confirm, force } = req.body as { confirm: string; force?: boolean };

    if (!confirm || confirm.trim() === '') {
      return res.status(400).json({ success: false, error: '请填写确认信息' });
    }

    if (confirm !== 'DELETE ALL' || !force) {
      return res.status(400).json({
        success: false,
        error: '删除全部记录需要输入 "DELETE ALL" 并二次确认（force=true）'
      });
    }

    const deletedCount = await PerformanceModel.deleteAll();

    res.json({
      success: true,
      message: `已删除全部绩效记录，共 ${deletedCount} 条`,
      data: { deletedCount }
    });
  }),

  // HR批量生成绩效任务
  generateTasks: asyncHandler(async (req: Request, res: Response) => {
    const { month } = req.body;

    // 验证月份格式
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: '月份格式错误，应为YYYY-MM' });
    }
    
    // 获取所有需要考评的员工（员工+经理，排除总经理和HR）
    const allEmployees = await EmployeeModel.findAll();
    const rankingConfig = await getPerformanceRankingConfig();
    const assessableEmployees = allEmployees
      .filter((e: any) => !e.status || e.status === 'active')
      .filter((e: any) => e.role === 'employee' || e.role === 'manager')
      .filter((e: any) => isParticipatingRecord(e, rankingConfig));

    const validIds = new Set<string>(
      allEmployees
        .filter((e: any) => !e.status || e.status === 'active')
        .map((e: any) => e.id)
    );
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const employee of assessableEmployees) {
      // 检查是否已存在记录
      const existing = await PerformanceModel.findByEmployeeIdAndMonth(employee.id, month);
      if (existing) {
        skippedCount++;
        continue;
      }
      
      // 确定分组和考评人
      const groupType = getGroupType(employee.level);

      // 员工的考评人是其经理；经理的考评人是总经理。
      // 若员工 managerId 缺失/无效，为避免外键失败，回退到 gm001。
      let assessorId = 'gm001';
      if (employee.role === 'employee') {
        if (employee.managerId && validIds.has(employee.managerId)) {
          assessorId = employee.managerId;
        }
      }
      
      const recordId = `rec-${employee.id}-${month}`;
      
      await PerformanceModel.saveSummary({
        id: recordId,
        employeeId: employee.id,
        assessorId,
        month,
        selfSummary: '',
        nextMonthPlan: '',
        groupType
      });
      
      createdCount++;
    }
    
    res.json({
      success: true,
      message: `成功生成 ${createdCount} 条绩效任务，跳过 ${skippedCount} 条已存在记录`,
      data: { createdCount, skippedCount, total: assessableEmployees.length }
    });
  }),

  // 获取绩效统计数据（用于导出）
  getStatsByMonth: asyncHandler(async (req: Request, res: Response) => {
    const month = req.params.month as string;

    // 验证月份格式
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: '月份格式错误，应为YYYY-MM' });
    }

    const rankingConfig = await getPerformanceRankingConfig();
    const employees = (await EmployeeModel.findAll())
      .filter((emp: any) => !emp.status || emp.status === 'active')
      .filter((emp: any) => isParticipatingRecord(emp, rankingConfig));
    const eligibleEmployeeIds = new Set(employees.map((emp: any) => emp.id));
    const records = (await PerformanceModel.findByMonth(month))
      .filter((record: any) => eligibleEmployeeIds.has(record.employeeId));
    
    // 按部门统计
    const deptStats = new Map<string, {
      department: string;
      scores: number[];
      employees: any[];
    }>();
    
    employees.forEach((emp: any) => {
      const dept = emp?.department || '未知部门';
      if (!deptStats.has(dept)) {
        deptStats.set(dept, { department: dept, scores: [], employees: [] });
      }

      const record = records.find((r: any) => r.employeeId === emp.id);
      const deptData = deptStats.get(dept)!;
      if (record && record.totalScore > 0) {
        deptData.scores.push(record.totalScore);
      }
      deptData.employees.push({
        name: emp?.name || record?.employeeName,
        subDepartment: emp?.subDepartment || '',
        employeeLevel: emp?.level || '',
        totalScore: record?.totalScore || 0,
        status: record?.status || 'not_submitted',
        scoreLevel: record?.level
      });
    });

    // 转换为数组
    const stats = Array.from(deptStats.values()).map(dept => ({
      department: dept.department,
      totalEmployees: dept.employees.length,
      scoredCount: dept.scores.length,
      averageScore: dept.scores.length > 0 
        ? parseFloat((dept.scores.reduce((a, b) => a + b, 0) / dept.scores.length).toFixed(2))
        : 0,
      excellentCount: dept.scores.filter(s => s >= 1.2).length,
      goodCount: dept.scores.filter(s => s >= 1.0 && s < 1.2).length,
      normalCount: dept.scores.filter(s => s >= 0.8 && s < 1.0).length,
      needImprovementCount: dept.scores.filter(s => s < 0.8).length,
      employees: dept.employees
    }));
    
    res.json({
      success: true,
      data: {
        month,
        summary: stats,
        records: records
      }
    });
  })
};
